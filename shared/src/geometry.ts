import { GAME_CONFIG } from './constants.js'
import type { Arena, Side, Vec2 } from './types.js'

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (v: Vec2, n: number): Vec2 => ({ x: v.x * n, y: v.y * n })
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y
export const length = (v: Vec2): number => Math.hypot(v.x, v.y)
export const normalize = (v: Vec2): Vec2 => { const n = length(v); return n ? scale(v, 1 / n) : { x: 0, y: 0 } }
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => add(a, scale(sub(b, a), t))
export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v))

function makeSide(index: number, start: Vec2, end: Vec2, playerId: string | null, neutral = false): Side {
  const edge = sub(end, start); const possible = normalize({ x: -edge.y, y: edge.x }); const midpoint = lerp(start, end, 0.5)
  return { index, start, end, playerId, neutral, inwardNormal: dot(possible, scale(midpoint, -1)) >= 0 ? possible : scale(possible, -1) }
}
export function createPolygonArena(ids: string[], radius = GAME_CONFIG.arenaRadius): Arena {
  if (ids.length < 3) throw new Error('Polygon arenas require at least three players')
  const offset = -Math.PI / 2 - Math.PI / ids.length
  const vertices = ids.map((_, i) => ({ x: Math.cos(offset + i * Math.PI * 2 / ids.length) * radius, y: Math.sin(offset + i * Math.PI * 2 / ids.length) * radius }))
  return { type: 'polygon', vertices, sides: vertices.map((v, i) => makeSide(i, v, vertices[(i + 1) % vertices.length]!, ids[i]!)) }
}
export function createDuelArena(ids: string[]): Arena {
  if (ids.length !== 2) throw new Error('Duel arenas require exactly two players')
  const w = GAME_CONFIG.duelHalfWidth, h = GAME_CONFIG.duelHalfHeight
  const vertices = [{ x: -w, y: -h }, { x: w, y: -h }, { x: w, y: h }, { x: -w, y: h }]
  return { type: 'duel', vertices, sides: [makeSide(0, vertices[3]!, vertices[0]!, ids[0]!), makeSide(1, vertices[0]!, vertices[1]!, null, true), makeSide(2, vertices[1]!, vertices[2]!, ids[1]!), makeSide(3, vertices[2]!, vertices[3]!, null, true)] }
}
export function paddleSegment(side: Side, position: number, paddleLength: number): [Vec2, Vec2] {
  const ratio = paddleLength / length(sub(side.end, side.start)), half = ratio / 2
  return [lerp(side.start, side.end, clamp(position - half, 0, 1)), lerp(side.start, side.end, clamp(position + half, 0, 1))]
}
export function seededRandom(seed: number): () => number { let value = seed >>> 0; return () => { value += 0x6d2b79f5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
export function fairServe(seed: number, arena: Arena): Vec2 {
  const random = seededRandom(seed)
  for (let i = 0; i < 100; i++) { const a = random() * Math.PI * 2, v = { x: Math.cos(a), y: Math.sin(a) }; if (!arena.sides.some((s) => Math.abs(dot(v, s.inwardNormal)) < 0.16)) return scale(v, GAME_CONFIG.startingBallSpeed) }
  return { x: GAME_CONFIG.startingBallSpeed, y: 0 }
}
