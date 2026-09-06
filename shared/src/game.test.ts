import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from './constants.js'
import {
  createDuelArena,
  createPolygonArena,
  dot,
  fairServe,
  length,
  sub,
} from './geometry.js'
import { advanceMatch, createMatch, eliminate, setInput } from './match.js'
import { stepSimulation } from './physics.js'

describe('arena geometry', () => {
  it.each([3, 4, 5, 8])(
    'creates a regular %i-sided arena with inward normals',
    (count) => {
      const arena = createPolygonArena(
        Array.from({ length: count }, (_, i) => `p${i}`),
      )
      const lengths = arena.sides.map((side) =>
        length(sub(side.end, side.start)),
      )
      expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(1e-8)
      for (const side of arena.sides)
        expect(
          dot(side.inwardNormal, {
            x: -((side.start.x + side.end.x) / 2),
            y: -((side.start.y + side.end.y) / 2),
          }),
        ).toBeGreaterThan(0)
    },
  )

  it('makes only top and bottom neutral in a duel', () => {
    const arena = createDuelArena(['left', 'right'])
    expect(arena.vertices[1]!.x - arena.vertices[0]!.x).toBe(
      arena.vertices[2]!.y - arena.vertices[1]!.y,
    )
    expect(arena.sides.map((side) => [side.playerId, side.neutral])).toEqual([
      ['left', false],
      [null, true],
      ['right', false],
      [null, true],
    ])
  })

  it('creates deterministic, non-tangent serves', () => {
    const arena = createPolygonArena(['a', 'b', 'c'])
    expect(fairServe(42, arena)).toEqual(fairServe(42, arena))
    for (const side of arena.sides)
      expect(
        Math.abs(dot(fairServe(42, arena), side.inwardNormal)),
      ).toBeGreaterThan(GAME_CONFIG.startingBallSpeed * 0.15)
  })
})

describe('match lifecycle', () => {
  it('emits a terminal event when Best Score reaches 25 misses', () => {
    const state = createMatch(
      'best-score',
      [
        { id: 'a', username: 'A' },
        { id: 'b', username: 'B' },
      ],
      0,
      7,
      'a',
      { format: 'best_score', modifiers: [] },
    )
    state.phase = 'playing'
    state.phaseEndsAt = null
    state.players.find((player) => player.id === 'a')!.score = 24
    state.ball.position = { x: -385, y: 300 }
    state.ball.velocity = { x: -300, y: 0 }

    advanceMatch(state, 0.1, 100)

    expect(state.phase).toBe('complete')
    expect(state.winnerId).toBe('b')
    expect(state.events.at(-1)).toMatchObject({
      type: 'match.ended',
      winnerId: 'b',
    })
  })

  it.each(['elimination', 'best_score', 'stocks'])(
    'preserves all modifiers in %s matches',
    (format) => {
      const state = createMatch(
        'modifiers',
        ['a', 'b', 'c'].map((id) => ({ id, username: id })),
        0,
        42,
        'a',
        {
          format: format as 'elimination' | 'best_score' | 'stocks',
          modifiers: ['vortex', 'pulse', 'orbit', 'wormhole'],
        },
      )
      expect(state.modifiers).toEqual(['vortex', 'pulse', 'orbit', 'wormhole'])
      advanceMatch(state, 1 / 60, GAME_CONFIG.countdownMs)
      expect(state.phase).toBe('playing')
      for (let i = 0; i < 420; i++)
        advanceMatch(state, 1 / 60, GAME_CONFIG.countdownMs + i * 16)
      expect(state.modifiers).toHaveLength(4)
    },
  )

  it('teleports a ball that sweeps through a wormhole entrance', () => {
    const state = createMatch(
      'wormhole',
      [
        { id: 'a', username: 'A' },
        { id: 'b', username: 'B' },
      ],
      0,
      42,
      'a',
      { format: 'elimination', modifiers: ['wormhole'] },
    )
    state.phase = 'playing'
    state.modifierTime = GAME_CONFIG.modifierWarmupSeconds
    stepSimulation(state, 0)
    expect(state.wormholeActive).toBe(true)
    const entry = state.wormholeEntry!
    const exit = state.wormholeExit!
    state.ball.position = { x: entry.x - 95, y: entry.y }
    state.ball.velocity = { x: 400, y: 0 }

    stepSimulation(state, 0.2)

    expect(length(sub(state.ball.position, exit))).toBeLessThan(20)
    expect(state.wormholeCooldown).toBeGreaterThan(0)
  })

  it('keeps active wormhole entrances and exits well separated', () => {
    const state = createMatch(
      'wormhole-gap',
      [
        { id: 'a', username: 'A' },
        { id: 'b', username: 'B' },
      ],
      0,
      42,
      'a',
      { format: 'elimination', modifiers: ['wormhole'] },
    )
    state.phase = 'playing'
    for (const modifierTime of [10, 20, 30, 40, 50]) {
      state.modifierTime = modifierTime
      stepSimulation(state, 0)
      if (state.wormholeActive)
        expect(
          length(sub(state.wormholeEntry!, state.wormholeExit!)),
        ).toBeGreaterThanOrEqual(GAME_CONFIG.wormholeMinimumGap)
    }
  })

  it('holds non-vortex modifiers during the opening warm-up', () => {
    const state = createMatch(
      'modifier-warmup',
      [
        { id: 'a', username: 'A' },
        { id: 'b', username: 'B' },
      ],
      0,
      42,
      'a',
      {
        format: 'elimination',
        modifiers: ['vortex', 'pulse', 'orbit', 'wormhole'],
      },
    )
    state.phase = 'playing'
    state.modifierTime = GAME_CONFIG.modifierWarmupSeconds - 0.1
    stepSimulation(state, 0)

    expect(state.pulseWaveRadius).toBe(-1)
    expect(state.orbitWellActive).toBe(false)
    expect(state.wormholeActive).toBe(false)
  })

  it('uses the requested post-warm-up modifier cadence', () => {
    const state = createMatch(
      'modifier-cadence',
      [
        { id: 'a', username: 'A' },
        { id: 'b', username: 'B' },
      ],
      0,
      42,
      'a',
      { format: 'elimination', modifiers: ['pulse', 'orbit', 'wormhole'] },
    )
    state.phase = 'playing'
    state.modifierTime = 10
    stepSimulation(state, 0)
    expect(state.orbitWellActive).toBe(true)
    expect(state.wormholeActive).toBe(true)

    state.modifierTime = 21
    stepSimulation(state, 0)
    expect(state.orbitWellActive).toBe(false)
    expect(state.wormholeActive).toBe(true)

    state.modifierTime = 24
    stepSimulation(state, 0)
    expect(state.wormholeActive).toBe(false)

    state.ball.velocity = { x: 0, y: 0 }
    let sawPulse = false
    for (let time = 10; time <= 30; time += 0.1) {
      state.modifierTime = time
      stepSimulation(state, 0.1)
      sawPulse ||= state.pulseWaveRadius >= 0
    }
    expect(sawPulse).toBe(true)
  })

  it('bends a ball continuously inside an orbit well influence field', () => {
    const state = createMatch(
      'orbit',
      [
        { id: 'a', username: 'A' },
        { id: 'b', username: 'B' },
      ],
      0,
      42,
      'a',
      { format: 'elimination', modifiers: ['orbit'] },
    )
    state.phase = 'playing'
    state.modifierTime = GAME_CONFIG.modifierWarmupSeconds
    stepSimulation(state, 0)
    const well = state.orbitWell!
    state.ball.position = { x: well.x - 190, y: well.y - 100 }
    state.ball.velocity = { x: 500, y: 0 }

    stepSimulation(state, 0.1)

    expect(state.orbitSlingshotCooldown).toBe(0)
    expect(state.ball.velocity.y).toBeGreaterThan(1)
  })

  it('moves from countdown into play and clamps paddle movement', () => {
    const state = createMatch(
      'm',
      [
        { id: 'a', username: 'A' },
        { id: 'b', username: 'B' },
      ],
      0,
      1,
    )
    setInput(state, 'a', 1)
    advanceMatch(state, 1 / 60, GAME_CONFIG.countdownMs)
    expect(state.phase).toBe('playing')
    for (let i = 0; i < 1000; i++)
      advanceMatch(state, 1 / 60, GAME_CONFIG.countdownMs + i * 16)
    expect(
      state.paddles.find((p) => p.playerId === 'a')!.position,
    ).toBeLessThan(1)
  })

  it('preserves survivor order, builds a duel, and assigns placements', () => {
    const state = createMatch(
      'm',
      ['a', 'b', 'c'].map((id) => ({ id, username: id })),
      0,
      9,
    )
    eliminate(state, 'b', 'miss', 1)
    expect(state.activeOrder).toEqual(['a', 'c'])
    advanceMatch(state, 0, 1 + GAME_CONFIG.transitionMs)
    expect(state.arena.type).toBe('duel')
    eliminate(state, 'c', 'forfeit', 5)
    expect(state.phase).toBe('complete')
    expect(state.winnerId).toBe('a')
    expect(state.players.map((p) => [p.id, p.placement])).toEqual([
      ['a', 1],
      ['b', 3],
      ['c', 2],
    ])
  })
})
