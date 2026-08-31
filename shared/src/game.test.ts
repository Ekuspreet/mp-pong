import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from './constants.js'
import { createDuelArena, createPolygonArena, dot, fairServe, length, sub } from './geometry.js'
import { advanceMatch, createMatch, eliminate, setInput } from './match.js'

describe('arena geometry', () => {
  it.each([3, 4, 5, 8])('creates a regular %i-sided arena with inward normals', (count) => {
    const arena = createPolygonArena(Array.from({ length: count }, (_, i) => `p${i}`))
    const lengths = arena.sides.map((side) => length(sub(side.end, side.start)))
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(1e-8)
    for (const side of arena.sides) expect(dot(side.inwardNormal, { x: -((side.start.x + side.end.x) / 2), y: -((side.start.y + side.end.y) / 2) })).toBeGreaterThan(0)
  })

  it('makes only top and bottom neutral in a duel', () => {
    const arena = createDuelArena(['left', 'right'])
    expect(arena.sides.map((side) => [side.playerId, side.neutral])).toEqual([['left', false], [null, true], ['right', false], [null, true]])
  })

  it('creates deterministic, non-tangent serves', () => {
    const arena = createPolygonArena(['a', 'b', 'c'])
    expect(fairServe(42, arena)).toEqual(fairServe(42, arena))
    for (const side of arena.sides) expect(Math.abs(dot(fairServe(42, arena), side.inwardNormal))).toBeGreaterThan(GAME_CONFIG.startingBallSpeed * 0.15)
  })
})

describe('match lifecycle', () => {
  it('moves from countdown into play and clamps paddle movement', () => {
    const state = createMatch('m', [{ id: 'a', username: 'A' }, { id: 'b', username: 'B' }], 0, 1)
    setInput(state, 'a', 1)
    advanceMatch(state, 1 / 60, GAME_CONFIG.countdownMs)
    expect(state.phase).toBe('playing')
    for (let i = 0; i < 1000; i++) advanceMatch(state, 1 / 60, GAME_CONFIG.countdownMs + i * 16)
    expect(state.paddles.find((p) => p.playerId === 'a')!.position).toBeLessThan(1)
  })

  it('preserves survivor order, builds a duel, and assigns placements', () => {
    const state = createMatch('m', ['a', 'b', 'c'].map((id) => ({ id, username: id })), 0, 9)
    eliminate(state, 'b', 'miss', 1)
    expect(state.activeOrder).toEqual(['a', 'c'])
    advanceMatch(state, 0, 1 + GAME_CONFIG.transitionMs)
    expect(state.arena.type).toBe('duel')
    eliminate(state, 'c', 'forfeit', 5)
    expect(state.phase).toBe('complete')
    expect(state.winnerId).toBe('a')
    expect(state.players.map((p) => [p.id, p.placement])).toEqual([['a', 1], ['b', 3], ['c', 2]])
  })
})
