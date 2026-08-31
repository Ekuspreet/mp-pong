import { GAME_CONFIG } from './constants.js'
import { createDuelArena, createPolygonArena, fairServe, length, sub } from './geometry.js'
import { stepSimulation } from './physics.js'
import type { MatchPlayer, MatchState, PaddleState } from './types.js'

export interface NewPlayer { id: string; username: string }
function buildStage(state: MatchState, now: number): void {
  state.stage++; state.serveSeed = (state.serveSeed * 1664525 + 1013904223) >>> 0
  state.arena = state.activeOrder.length === 2 ? createDuelArena(state.activeOrder) : createPolygonArena(state.activeOrder)
  state.paddles = state.arena.sides.filter((s) => s.playerId).map((s): PaddleState => ({ playerId: s.playerId!, sideIndex: s.index, position: 0.5, direction: 0, length: length(sub(s.end, s.start)) * GAME_CONFIG.paddleRatio, speed: GAME_CONFIG.paddleSpeed }))
  state.ball = { position: { x: 0, y: 0 }, velocity: fairServe(state.serveSeed, state.arena), radius: GAME_CONFIG.ballRadius }
  state.phase = 'countdown'; state.phaseEndsAt = now + GAME_CONFIG.countdownMs; state.currentRally = 0
  state.events.push({ type: 'stage.started', stage: state.stage, playerIds: [...state.activeOrder], seed: state.serveSeed })
}
export function createMatch(matchId: string, players: NewPlayer[], now = Date.now(), seed = Math.floor(Math.random() * 2 ** 32)): MatchState {
  if (players.length < 2 || players.length > 8) throw new Error('Player count must be between 2 and 8')
  const matchPlayers: MatchPlayer[] = players.map((p) => ({ ...p, status: 'active', placement: null, returns: 0, eliminatedAt: null, eliminationReason: null, disconnectedAt: null }))
  const state: MatchState = { matchId, tick: 0, stage: 0, phase: 'countdown', phaseEndsAt: null, arena: createDuelArena(players.slice(0, 2).map((p) => p.id)), ball: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, radius: GAME_CONFIG.ballRadius }, paddles: [], players: matchPlayers, serverTime: now, winnerId: null, activeOrder: players.map((p) => p.id), serveSeed: seed, longestRally: 0, currentRally: 0, startedAt: now, events: [] }
  buildStage(state, now); return state
}
export function eliminate(state: MatchState, playerId: string, reason: 'miss' | 'forfeit', now: number): void {
  if (!state.activeOrder.includes(playerId) || ['complete', 'no_contest'].includes(state.phase)) return
  const player = state.players.find((p) => p.id === playerId)!; player.status = 'eliminated'; player.eliminatedAt = now; player.eliminationReason = reason; player.placement = state.activeOrder.length
  state.activeOrder = state.activeOrder.filter((id) => id !== playerId); state.events.push({ type: 'player.eliminated', playerId, reason, placement: player.placement })
  if (state.activeOrder.length === 1) { const winner = state.players.find((p) => p.id === state.activeOrder[0])!; winner.placement = 1; state.winnerId = winner.id; state.phase = 'complete'; state.phaseEndsAt = null; state.events.push({ type: 'match.ended', winnerId: winner.id, placements: state.players.map((p) => ({ playerId: p.id, placement: p.placement! })) }) }
  else { state.phase = 'transition'; state.phaseEndsAt = now + GAME_CONFIG.transitionMs; state.paddles.forEach((p) => { p.direction = 0 }) }
}
export function setInput(state: MatchState, playerId: string, direction: -1 | 0 | 1): void { const paddle = state.paddles.find((p) => p.playerId === playerId), player = state.players.find((p) => p.id === playerId); if (paddle && player?.status === 'active') paddle.direction = direction }
export function advanceMatch(state: MatchState, seconds: number, now: number): void {
  state.serverTime = now; state.tick++
  if ((state.phase === 'countdown' || state.phase === 'transition') && state.phaseEndsAt !== null && now >= state.phaseEndsAt) { if (state.phase === 'transition') buildStage(state, now); else { state.phase = 'playing'; state.phaseEndsAt = null } }
  const missed = stepSimulation(state, seconds); if (missed) eliminate(state, missed, 'miss', now)
}
export function publicSnapshot(state: MatchState) { const { activeOrder: _a, serveSeed: _s, longestRally: _l, currentRally: _c, startedAt: _st, events: _e, ...snapshot } = state; return structuredClone(snapshot) }
