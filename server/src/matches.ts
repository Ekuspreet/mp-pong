import { randomUUID } from 'node:crypto'
import { GAME_CONFIG, RULESET_VERSION, advanceMatch, createMatch, eliminate, publicSnapshot, setInput, type MatchState, type ServerEnvelope } from '@polygon-pong/shared'
import type WebSocket from 'ws'
import type { Db } from './db.js'
import type { Room } from './rooms.js'

interface Runtime { state: MatchState; room: Room; sockets: Map<string, WebSocket>; inputSequences: Map<string, number>; disconnectTimers: Map<string, NodeJS.Timeout>; interval: NodeJS.Timeout; lastTime: number; sequence: number; eventCursor: number }
export class MatchManager {
  readonly matches = new Map<string, Runtime>()
  constructor(private db: Db) {}
  start(room: Room, sockets: Map<string, WebSocket>): MatchState {
    const id = randomUUID(), now = Date.now(), players = [...room.members.values()].map(({ id: playerId, username }) => ({ id: playerId, username }))
    const state = createMatch(id, players, now); room.status = 'in_match'; room.matchId = id
    this.db.prepare('INSERT INTO matches(id,room_code,ruleset_version,status,started_at,initial_player_count) VALUES(?,?,?,?,?,?)').run(id, room.code, RULESET_VERSION, 'active', now, players.length)
    const insert = this.db.prepare('INSERT INTO match_players(match_id,user_id,initial_order) VALUES(?,?,?)'); players.forEach((p, i) => insert.run(id, p.id, i))
    const runtime: Runtime = { state, room, sockets, inputSequences: new Map(), disconnectTimers: new Map(), lastTime: performance.now(), sequence: 0, eventCursor: 0, interval: undefined as unknown as NodeJS.Timeout }
    runtime.interval = setInterval(() => this.tick(runtime), 1000 / GAME_CONFIG.tickRate); runtime.interval.unref(); this.matches.set(id, runtime); this.broadcast(runtime, 'match.started', publicSnapshot(state)); return state
  }
  input(userId: string, sequence: number, direction: -1 | 0 | 1): void { const runtime = this.forUser(userId); if (!runtime || sequence <= (runtime.inputSequences.get(userId) ?? -1)) return; runtime.inputSequences.set(userId, sequence); setInput(runtime.state, userId, direction) }
  connect(userId: string, socket: WebSocket): void { const runtime = this.forUser(userId); if (!runtime) return; runtime.sockets.set(userId, socket); const timer = runtime.disconnectTimers.get(userId); if (timer) clearTimeout(timer); runtime.disconnectTimers.delete(userId); const player = runtime.state.players.find((p) => p.id === userId); if (player?.status === 'disconnected') { player.status = 'active'; player.disconnectedAt = null } this.send(socket, runtime, 'game.snapshot', publicSnapshot(runtime.state)) }
  disconnect(userId: string): void { const runtime = this.forUser(userId); if (!runtime || runtime.state.phase === 'complete') return; runtime.sockets.delete(userId); const player = runtime.state.players.find((p) => p.id === userId); if (!player || player.status === 'eliminated') return; player.status = 'disconnected'; player.disconnectedAt = Date.now(); setInput(runtime.state, userId, 0); const timer = setTimeout(() => { eliminate(runtime.state, userId, 'forfeit', Date.now()); runtime.disconnectTimers.delete(userId); this.flushEvents(runtime) }, GAME_CONFIG.reconnectGraceMs); timer.unref(); runtime.disconnectTimers.set(userId, timer) }
  forUser(userId: string): Runtime | undefined { return [...this.matches.values()].find((r) => r.state.players.some((p) => p.id === userId) && !['complete', 'no_contest'].includes(r.state.phase)) }
  result(id: string) { return this.db.prepare('SELECT * FROM matches WHERE id=?').get(id) }
  history(userId: string) { return this.db.prepare('SELECT m.* FROM matches m JOIN match_players p ON p.match_id=m.id WHERE p.user_id=? ORDER BY m.started_at DESC LIMIT 20').all(userId) }
  close(): void { for (const runtime of this.matches.values()) { clearInterval(runtime.interval); runtime.disconnectTimers.forEach(clearTimeout) } }
  private tick(runtime: Runtime): void { const nowMono = performance.now(), seconds = Math.min((nowMono - runtime.lastTime) / 1000, 0.1); runtime.lastTime = nowMono; advanceMatch(runtime.state, seconds, Date.now()); this.flushEvents(runtime); if (runtime.state.tick % Math.round(GAME_CONFIG.tickRate / GAME_CONFIG.snapshotRate) === 0) this.broadcast(runtime, 'game.snapshot', publicSnapshot(runtime.state)) }
  private flushEvents(runtime: Runtime): void { for (; runtime.eventCursor < runtime.state.events.length; runtime.eventCursor++) { const event = runtime.state.events[runtime.eventCursor]!; this.broadcast(runtime, event.type, event); if (event.type === 'match.ended') this.finish(runtime) } }
  private finish(runtime: Runtime): void { clearInterval(runtime.interval); runtime.disconnectTimers.forEach(clearTimeout); runtime.room.status = 'finished'; const now = Date.now(); const transaction = this.db.transaction(() => { this.db.prepare('UPDATE matches SET status=?,ended_at=?,winner_user_id=? WHERE id=?').run('complete', now, runtime.state.winnerId, runtime.state.matchId); const update = this.db.prepare('UPDATE match_players SET placement=?,eliminated_at=?,elimination_reason=?,returns=?,longest_rally_returns=?,survival_ms=? WHERE match_id=? AND user_id=?'); runtime.state.players.forEach((p) => update.run(p.placement, p.eliminatedAt, p.eliminationReason, p.returns, runtime.state.longestRally, (p.eliminatedAt ?? now) - runtime.state.startedAt, runtime.state.matchId, p.id)) }); transaction() }
  private broadcast(runtime: Runtime, type: string, payload: unknown): void { for (const socket of runtime.sockets.values()) this.send(socket, runtime, type, payload) }
  private send(socket: WebSocket, runtime: Runtime, type: string, payload: unknown): void { if (socket.readyState === socket.OPEN) { const envelope: ServerEnvelope = { type, sequence: ++runtime.sequence, serverTime: Date.now(), payload }; socket.send(JSON.stringify(envelope)) } }
}
