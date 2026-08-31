import { randomBytes, randomUUID } from 'node:crypto'
import type { AuthUser } from './auth.js'
import type { RoomSnapshot } from '@polygon-pong/shared'

interface Member extends AuthUser { ready: boolean; connected: boolean; joinedAt: number }
export interface Room { id: string; code: string; visibility: 'public' | 'private'; status: 'open' | 'in_match' | 'finished'; hostId: string; members: Map<string, Member>; matchId: string | null }
const roomError = (code: string, message: string) => Object.assign(new Error(message), { code, status: 400 })
export class RoomRegistry {
  readonly rooms = new Map<string, Room>(); readonly membership = new Map<string, string>()
  create(user: AuthUser, visibility: 'public' | 'private' = 'public'): Room { const room: Room = { id: randomUUID(), code: randomBytes(4).toString('base64url').slice(0, 6).toUpperCase(), visibility, status: 'open', hostId: user.id, members: new Map(), matchId: null }; this.rooms.set(room.id, room); this.join(room.id, user); return room }
  join(idOrCode: string, user: AuthUser): Room { const room = this.rooms.get(idOrCode) ?? [...this.rooms.values()].find((r) => r.code === idOrCode.toUpperCase()); if (!room) throw roomError('ROOM_NOT_FOUND', 'Room not found'); if (room.status !== 'open') throw roomError('ROOM_CLOSED', 'Room has already started'); const existing = this.membership.get(user.id); if (existing && existing !== room.id) throw roomError('ALREADY_IN_ROOM', 'Leave the current room first'); if (!room.members.has(user.id) && room.members.size >= 8) throw roomError('ROOM_FULL', 'Room is full'); room.members.set(user.id, { ...user, ready: room.members.get(user.id)?.ready ?? false, connected: true, joinedAt: room.members.get(user.id)?.joinedAt ?? Date.now() }); this.membership.set(user.id, room.id); return room }
  leave(userId: string): Room | null { const id = this.membership.get(userId); if (!id) return null; const room = this.rooms.get(id)!; room.members.delete(userId); this.membership.delete(userId); if (!room.members.size) { this.rooms.delete(id); return null } if (room.hostId === userId) room.hostId = [...room.members.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0]!.id; return room }
  ready(userId: string, ready: boolean): Room { const room = this.forUser(userId); room.members.get(userId)!.ready = ready; return room }
  forUser(userId: string): Room { const room = this.rooms.get(this.membership.get(userId) ?? ''); if (!room) throw roomError('NOT_IN_ROOM', 'Join a room first'); return room }
  canStart(room: Room, userId: string): boolean { return room.hostId === userId && room.members.size >= 2 && [...room.members.values()].every((m) => m.ready) && room.status === 'open' }
  list(): RoomSnapshot[] { return [...this.rooms.values()].filter((r) => r.visibility === 'public' && r.status === 'open').map(snapshotRoom) }
}
export function snapshotRoom(room: Room): RoomSnapshot { return { id: room.id, code: room.code, visibility: room.visibility, status: room.status, matchId: room.matchId, members: [...room.members.values()].map((m) => ({ id: m.id, username: m.username, guest: m.guest, ready: m.ready, connected: m.connected, host: m.id === room.hostId })) } }
