import { z } from 'zod'
import { PROTOCOL_VERSION } from './constants.js'

const direction = z.union([z.literal(-1), z.literal(0), z.literal(1)])
const base = { requestId: z.string().min(1).max(64) }
export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('ping'), payload: z.object({}).optional() }),
  z.object({ ...base, type: z.literal('room.join'), payload: z.object({ roomId: z.string().min(1).max(64) }) }),
  z.object({ ...base, type: z.literal('room.leave'), payload: z.object({}) }),
  z.object({ ...base, type: z.literal('room.ready'), payload: z.object({ ready: z.boolean() }) }),
  z.object({ ...base, type: z.literal('room.start'), payload: z.object({}) }),
  z.object({ ...base, type: z.literal('input.set'), payload: z.object({ sequence: z.number().int().nonnegative(), direction }) }),
])
export type ClientMessage = z.infer<typeof clientMessageSchema>
export interface ServerEnvelope<T = unknown> { type: string; sequence: number; serverTime: number; payload: T; requestId?: string; protocolVersion?: typeof PROTOCOL_VERSION }
export interface PublicUser { id: string; username: string; guest?: boolean }
export interface RoomMember extends PublicUser { ready: boolean; host: boolean; connected: boolean }
export type GameFormatId = 'elimination' | 'best_score' | 'stocks'
export type GameModifierId = 'vortex' | 'pulse' | 'orbit' | 'wormhole' | 'multiball'
export interface GameOptions { format: GameFormatId; modifiers: GameModifierId[] }
export interface RoomSnapshot { id: string; code: string; visibility: 'public' | 'private'; status: 'open' | 'in_match' | 'finished'; options: GameOptions; members: RoomMember[]; matchId: string | null }
export interface ApiError { error: { code: string; message: string } }
