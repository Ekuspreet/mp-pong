import { randomInt } from 'node:crypto'
import type { AuthUser } from './auth.js'
import type { GameFormatId, GameModifierId, GameOptions, RoomSnapshot } from '@polygon-pong/shared'

interface Member extends AuthUser { ready: boolean; connected: boolean; joinedAt: number }
export interface Room { readonly id: string; readonly code: string; visibility: 'public' | 'private'; status: 'open' | 'in_match' | 'finished'; options: GameOptions; hostId: string; members: Map<string, Member>; matchId: string | null }
export const GAME_FORMAT_IDS = ['elimination', 'best_score', 'stocks'] as const satisfies readonly GameFormatId[]
export const GAME_MODIFIER_IDS = ['vortex', 'pulse', 'orbit', 'wormhole', 'multiball'] as const satisfies readonly GameModifierId[]
const roomError = (code: string, message: string) => Object.assign(new Error(message), { code, status: 400 })
export function parseGameOptions(value: unknown): GameOptions {
  const input = value && typeof value === 'object' ? value as { format?: unknown; modifiers?: unknown } : {}
  const format = input.format ?? 'elimination', modifiers = input.modifiers ?? []
  if (typeof format !== 'string' || !GAME_FORMAT_IDS.includes(format as GameFormatId)) throw roomError('INVALID_GAME_FORMAT', 'Unknown game format')
  if (!Array.isArray(modifiers) || modifiers.some((item) => typeof item !== 'string' || !GAME_MODIFIER_IDS.includes(item as GameModifierId))) throw roomError('INVALID_GAME_MODIFIER', 'Unknown game modifier')
  if (new Set(modifiers).size !== modifiers.length) throw roomError('INVALID_GAME_MODIFIER', 'Game modifiers must be unique')
  return { format: format as GameFormatId, modifiers: modifiers as GameModifierId[] }
}
const ROOM_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const generateRoomCode = () => Array.from({ length: 6 }, () => ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)]).join('')

export class RoomRegistry {
  constructor(private readonly generateCode: () => string = generateRoomCode) {}
  private allocateId(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      const id = this.generateCode()
      if (!this.rooms.has(id)) return id
    }
    throw roomError('ROOM_CODE_UNAVAILABLE', 'Could not allocate a room code. Please try again.')
  }
  find(id: string): Room | undefined { return this.rooms.get(id.trim().toUpperCase()) }
  readonly rooms = new Map<string, Room>(); readonly membership = new Map<string, string>()
  create(user: AuthUser, visibility: 'public' | 'private' = 'public', options: GameOptions = { format: 'elimination', modifiers: [] }): Room { if (this.membership.has(user.id)) throw roomError('ALREADY_IN_ROOM', 'Leave the current room first'); const id = this.allocateId(); const room: Room = { id, get code() { return this.id }, visibility, status: 'open', options: { format: options.format, modifiers: [...options.modifiers] }, hostId: user.id, members: new Map(), matchId: null }; this.rooms.set(room.id, room); this.join(room.id, user); return room }
  join(idOrCode: string, user: AuthUser): Room { const room = this.find(idOrCode); if (!room) throw roomError('ROOM_NOT_FOUND', 'Room not found'); if (room.status !== 'open') throw roomError('ROOM_CLOSED', 'Room has already started'); const existing = this.membership.get(user.id); if (existing && existing !== room.id) throw roomError('ALREADY_IN_ROOM', 'Leave the current room first'); if (!room.members.has(user.id) && room.members.size >= 8) throw roomError('ROOM_FULL', 'Room is full'); room.members.set(user.id, { ...user, ready: room.members.get(user.id)?.ready ?? false, connected: true, joinedAt: room.members.get(user.id)?.joinedAt ?? Date.now() }); this.membership.set(user.id, room.id); return room }
  leave(userId: string): Room | null { const id = this.membership.get(userId); if (!id) return null; const room = this.rooms.get(id)!; room.members.delete(userId); this.membership.delete(userId); if (!room.members.size) { this.rooms.delete(id); return null } if (room.hostId === userId) room.hostId = [...room.members.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0]!.id; return room }
  ready(userId: string, ready: boolean): Room { const room = this.forUser(userId); room.members.get(userId)!.ready = ready; return room }
  forUser(userId: string): Room { const room = this.rooms.get(this.membership.get(userId) ?? ''); if (!room) throw roomError('NOT_IN_ROOM', 'Join a room first'); return room }
  canStart(room: Room, userId: string): boolean { return room.hostId === userId && room.members.size >= 2 && [...room.members.values()].every((m) => m.ready) && room.status === 'open' }
  list(): RoomSnapshot[] { return [...this.rooms.values()].filter((r) => r.visibility === 'public' && r.status === 'open').map(snapshotRoom) }
}
export function snapshotRoom(room: Room): RoomSnapshot { return { id: room.id, code: room.code, visibility: room.visibility, status: room.status, options: { format: room.options.format, modifiers: [...room.options.modifiers] }, matchId: room.matchId, members: [...room.members.values()].map((m) => ({ id: m.id, username: m.username, guest: m.guest, ready: m.ready, connected: m.connected, host: m.id === room.hostId })) } }
