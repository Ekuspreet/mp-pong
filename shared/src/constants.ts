export const RULESET_VERSION = '1.0' as const
export const PROTOCOL_VERSION = 1 as const

export const GAME_CONFIG = {
  minPlayers: 2, maxPlayers: 8, arenaRadius: 400, duelHalfWidth: 480,
  duelHalfHeight: 300, ballRadius: 10, paddleRatio: 0.3, paddleThickness: 14,
  paddleSpeed: 360, startingBallSpeed: 300, ballAcceleration: 1.035,
  maximumBallSpeed: 720, minimumInwardComponent: 0.28, countdownMs: 3_000,
  transitionMs: 1_500, reconnectGraceMs: 10_000, tickRate: 60, snapshotRate: 20,
} as const
