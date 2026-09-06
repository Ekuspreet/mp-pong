import { GAME_CONFIG } from './constants.js'
import {
  createDuelArena,
  createPolygonArena,
  fairServe,
  length,
  sub,
} from './geometry.js'
import { stepSimulation } from './physics.js'
import type { MatchPlayer, MatchState, PaddleState } from './types.js'
import type { GameOptions } from './protocol.js'

export interface NewPlayer {
  id: string
  username: string
}
const DEFAULT_OPTIONS: GameOptions = { format: 'elimination', modifiers: [] }
function buildStage(state: MatchState, now: number): void {
  state.stage++
  state.serveSeed = (state.serveSeed * 1664525 + 1013904223) >>> 0
  state.arena =
    state.activeOrder.length === 2
      ? createDuelArena(state.activeOrder)
      : createPolygonArena(state.activeOrder)
  state.paddles = state.arena.sides
    .filter((s) => s.playerId)
    .map((s): PaddleState => ({
      playerId: s.playerId!,
      sideIndex: s.index,
      position: 0.5,
      direction: 0,
      length: length(sub(s.end, s.start)) * GAME_CONFIG.paddleRatio,
      speed: GAME_CONFIG.paddleSpeed,
    }))
  state.ball = {
    position: { x: 0, y: 0 },
    velocity: fairServe(state.serveSeed, state.arena),
    radius: GAME_CONFIG.ballRadius,
  }
  state.phase = 'countdown'
  state.phaseEndsAt = now + GAME_CONFIG.countdownMs
  state.currentRally = 0
  state.modifierTime = 0
  state.pulseWaveRadius = -1
  state.pulseWavePreviousRadius = -1
  state.orbitWell = null
  state.orbitWellActive = false
  state.orbitSlingshotCooldown = 0
  state.wormholeEntry = null
  state.wormholeExit = null
  state.wormholeActive = false
  state.wormholeCooldown = 0
  state.events.push({
    type: 'stage.started',
    stage: state.stage,
    playerIds: [...state.activeOrder],
    seed: state.serveSeed,
  })
}
export function createMatch(
  matchId: string,
  players: NewPlayer[],
  now = Date.now(),
  seed = Math.floor(Math.random() * 2 ** 32),
  hostId = players[0]?.id ?? '',
  options: GameOptions = DEFAULT_OPTIONS,
): MatchState {
  if (players.length < 2 || players.length > 8)
    throw new Error('Player count must be between 2 and 8')
  const matchPlayers: MatchPlayer[] = players.map((p) => ({
    ...p,
    status: 'active',
    placement: null,
    returns: 0,
    eliminatedAt: null,
    eliminationReason: null,
    disconnectedAt: null,
    score: 0,
    lives: 3,
  }))
  const state: MatchState = {
    matchId,
    hostId,
    tick: 0,
    stage: 0,
    phase: 'countdown',
    phaseEndsAt: null,
    arena: createDuelArena(players.slice(0, 2).map((p) => p.id)),
    ball: {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: GAME_CONFIG.ballRadius,
    },
    paddles: [],
    players: matchPlayers,
    serverTime: now,
    winnerId: null,
    activeOrder: players.map((p) => p.id),
    serveSeed: seed,
    longestRally: 0,
    currentRally: 0,
    startedAt: now,
    events: [],
    format: options.format,
    modifiers: [...options.modifiers],
    lastHitterId: null,
    modifierTime: 0,
    pulseWaveRadius: -1,
    pulseWavePreviousRadius: -1,
    orbitWell: null,
    orbitWellActive: false,
    orbitSlingshotCooldown: 0,
    wormholeEntry: null,
    wormholeExit: null,
    wormholeActive: false,
    wormholeCooldown: 0,
  }
  buildStage(state, now)
  return state
}
export function eliminate(
  state: MatchState,
  playerId: string,
  reason: 'miss' | 'forfeit',
  now: number,
): void {
  if (
    !state.activeOrder.includes(playerId) ||
    ['complete', 'no_contest'].includes(state.phase)
  )
    return
  const player = state.players.find((p) => p.id === playerId)!
  player.status = 'eliminated'
  player.eliminatedAt = now
  player.eliminationReason = reason
  player.placement = state.activeOrder.length
  state.activeOrder = state.activeOrder.filter((id) => id !== playerId)
  state.events.push({
    type: 'player.eliminated',
    playerId,
    reason,
    placement: player.placement,
  })
  if (state.activeOrder.length === 1) {
    const winner = state.players.find((p) => p.id === state.activeOrder[0])!
    winner.placement = 1
    state.winnerId = winner.id
    state.phase = 'complete'
    state.phaseEndsAt = null
    state.events.push({
      type: 'match.ended',
      winnerId: winner.id,
      placements: state.players.map((p) => ({
        playerId: p.id,
        placement: p.placement!,
      })),
    })
  } else {
    state.phase = 'transition'
    state.phaseEndsAt = now + GAME_CONFIG.transitionMs
    state.paddles.forEach((p) => {
      p.direction = 0
    })
  }
}
export function setInput(
  state: MatchState,
  playerId: string,
  direction: -1 | 0 | 1,
): void {
  const paddle = state.paddles.find((p) => p.playerId === playerId),
    player = state.players.find((p) => p.id === playerId)
  if (paddle && player?.status === 'active') paddle.direction = direction
}
export function advanceMatch(
  state: MatchState,
  seconds: number,
  now: number,
): void {
  state.serverTime = now
  state.tick++
  if (
    (state.phase === 'countdown' || state.phase === 'transition') &&
    state.phaseEndsAt !== null &&
    now >= state.phaseEndsAt
  ) {
    if (state.phase === 'transition') buildStage(state, now)
    else {
      state.phase = 'playing'
      state.phaseEndsAt = null
    }
  }
  if (state.phase === 'playing') state.modifierTime += seconds
  const missed = stepSimulation(state, seconds)
  if (!missed) return
  const scorer = state.lastHitterId
    ? state.players.find((p) => p.id === state.lastHitterId)
    : undefined
  if (state.format === 'best_score') {
    const loser = state.players.find((p) => p.id === missed)!
    loser.score++
    if (loser.score >= 25) {
      const standings = [...state.players].sort(
        (a, b) =>
          a.score -
          b.score +
          (a.id === loser.id ? 1 : 0) -
          (b.id === loser.id ? 1 : 0),
      )
      standings.forEach((player, index) => {
        player.placement = index + 1
      })
      state.winnerId = standings[0]?.id ?? null
      state.phase = 'complete'
      state.phaseEndsAt = null
      if (state.winnerId)
        state.events.push({
          type: 'match.ended',
          winnerId: state.winnerId,
          placements: state.players.map((player) => ({
            playerId: player.id,
            placement: player.placement!,
          })),
        })
    } else buildStage(state, now)
  } else if (state.format === 'stocks') {
    const player = state.players.find((p) => p.id === missed)!
    player.lives = Math.max(0, player.lives - 1)
    if (scorer && scorer.id !== player.id)
      scorer.lives = Math.min(3, scorer.lives + 0.5)
    if (player.lives === 0) eliminate(state, missed, 'miss', now)
    else buildStage(state, now)
  } else eliminate(state, missed, 'miss', now)
}
export function publicSnapshot(state: MatchState) {
  const {
    activeOrder: _a,
    serveSeed: _s,
    currentRally: _c,
    events: _e,
    orbitSlingshotCooldown: _o,
    wormholeCooldown: _w,
    ...snapshot
  } = state
  return structuredClone(snapshot)
}
