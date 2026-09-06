export type Vec2 = { x: number; y: number }
export type PlayerStatus = 'active' | 'disconnected' | 'eliminated'
export type MatchPhase =
  'countdown' | 'playing' | 'transition' | 'complete' | 'no_contest'
export type ArenaType = 'polygon' | 'duel'
export interface Side {
  index: number
  playerId: string | null
  start: Vec2
  end: Vec2
  inwardNormal: Vec2
  neutral: boolean
}
export interface Arena {
  type: ArenaType
  sides: Side[]
  vertices: Vec2[]
}
export interface PaddleState {
  playerId: string
  sideIndex: number
  position: number
  direction: -1 | 0 | 1
  length: number
  speed: number
}
export interface BallState {
  position: Vec2
  velocity: Vec2
  radius: number
}
export interface MatchPlayer {
  id: string
  username: string
  status: PlayerStatus
  placement: number | null
  returns: number
  eliminatedAt: number | null
  eliminationReason: 'miss' | 'forfeit' | null
  disconnectedAt: number | null
  score: number
  lives: number
}
export interface GameSnapshot {
  matchId: string
  hostId: string
  tick: number
  stage: number
  phase: MatchPhase
  phaseEndsAt: number | null
  arena: Arena
  ball: BallState
  paddles: PaddleState[]
  players: MatchPlayer[]
  serverTime: number
  winnerId: string | null
  startedAt: number
  longestRally: number
  format: GameFormatId
  modifiers: GameModifierId[]
}
import type { GameFormatId, GameModifierId } from './protocol.js'
export type GameEvent =
  | { type: 'stage.started'; stage: number; playerIds: string[]; seed: number }
  | { type: 'ball.returned'; playerId: string }
  | {
      type: 'player.eliminated'
      playerId: string
      reason: 'miss' | 'forfeit'
      placement: number
    }
  | {
      type: 'match.ended'
      winnerId: string
      placements: Array<{ playerId: string; placement: number }>
    }
  | { type: 'match.noContest'; reason: string }
export interface MatchState extends GameSnapshot {
  activeOrder: string[]
  serveSeed: number
  currentRally: number
  events: GameEvent[]
  lastHitterId: string | null
  modifierTime: number
  pulseWaveRadius: number
  pulseWavePreviousRadius: number
  orbitWell: Vec2 | null
  orbitWellActive: boolean
  orbitSlingshotCooldown: number
  wormholeEntry: Vec2 | null
  wormholeExit: Vec2 | null
  wormholeActive: boolean
  wormholeCooldown: number
}
