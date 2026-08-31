import { GAME_CONFIG } from './constants.js'
import { add, clamp, dot, length, normalize, paddleSegment, scale, sub } from './geometry.js'
import type { MatchState, Side, Vec2 } from './types.js'

interface Contact { time: number; side: Side; point: Vec2; kind: 'paddle' | 'boundary'; playerId: string | null }

function lineContact(origin: Vec2, velocity: Vec2, radius: number, side: Side, maxTime: number, offset = 0): Contact | null {
  const distance = dot(sub(origin, side.start), side.inwardNormal) - radius - offset
  const approach = dot(velocity, side.inwardNormal)
  if (approach >= -1e-9) return null
  const time = -distance / approach
  if (time < -1e-7 || time > maxTime + 1e-7) return null
  const center = add(origin, scale(velocity, Math.max(0, time)))
  const point = sub(center, scale(side.inwardNormal, radius + offset))
  const edge = sub(side.end, side.start)
  const projection = dot(sub(point, side.start), edge) / dot(edge, edge)
  return projection < -1e-6 || projection > 1 + 1e-6 ? null : { time: Math.max(0, time), side, point, kind: 'boundary', playerId: side.playerId }
}

function findContact(state: MatchState, maxTime: number): Contact | null {
  let earliest: Contact | null = null
  for (const side of state.arena.sides) {
    const boundary = lineContact(state.ball.position, state.ball.velocity, state.ball.radius, side, maxTime)
    if (boundary && (!earliest || boundary.time < earliest.time)) earliest = boundary
    if (!side.playerId) continue
    const paddle = state.paddles.find((item) => item.playerId === side.playerId)
    if (!paddle) continue
    const [start, end] = paddleSegment(side, paddle.position, paddle.length)
    const hit = lineContact(state.ball.position, state.ball.velocity, state.ball.radius, { ...side, start, end }, maxTime, GAME_CONFIG.paddleThickness)
    if (hit && (!earliest || hit.time <= earliest.time + 1e-7)) earliest = { ...hit, kind: 'paddle', playerId: paddle.playerId }
  }
  return earliest
}

export function stepSimulation(state: MatchState, seconds: number): string | null {
  for (const paddle of state.paddles) {
    const side = state.arena.sides[paddle.sideIndex]!, sideLength = length(sub(side.end, side.start)), half = paddle.length / sideLength / 2
    paddle.position = clamp(paddle.position + paddle.direction * paddle.speed * seconds / sideLength, half, 1 - half)
  }
  if (state.phase !== 'playing') return null
  let remaining = seconds
  for (let count = 0; count < 4 && remaining > 1e-7; count++) {
    const contact = findContact(state, remaining)
    if (!contact) { state.ball.position = add(state.ball.position, scale(state.ball.velocity, remaining)); break }
    state.ball.position = add(state.ball.position, scale(state.ball.velocity, contact.time)); remaining -= contact.time
    if (contact.kind === 'paddle' && contact.playerId) {
      const paddle = state.paddles.find((item) => item.playerId === contact.playerId)!
      const [start, end] = paddleSegment(contact.side, paddle.position, paddle.length), axis = normalize(sub(end, start)), center = add(start, scale(sub(end, start), 0.5))
      const offset = clamp(dot(sub(contact.point, center), axis) / (paddle.length / 2), -1, 1)
      let direction = normalize(add(contact.side.inwardNormal, scale(axis, offset * 0.8 + paddle.direction * 0.15)))
      if (dot(direction, contact.side.inwardNormal) < GAME_CONFIG.minimumInwardComponent) direction = normalize(add(direction, scale(contact.side.inwardNormal, GAME_CONFIG.minimumInwardComponent)))
      state.ball.velocity = scale(direction, Math.min(length(state.ball.velocity) * GAME_CONFIG.ballAcceleration, GAME_CONFIG.maximumBallSpeed))
      state.ball.position = add(state.ball.position, scale(contact.side.inwardNormal, 0.02))
      const player = state.players.find((item) => item.id === contact.playerId)!; player.returns++; state.currentRally++; state.longestRally = Math.max(state.longestRally, state.currentRally)
      state.events.push({ type: 'ball.returned', playerId: player.id })
    } else if (contact.side.neutral) {
      state.ball.velocity = sub(state.ball.velocity, scale(contact.side.inwardNormal, 2 * dot(state.ball.velocity, contact.side.inwardNormal)))
      state.ball.position = add(state.ball.position, scale(contact.side.inwardNormal, 0.02))
    } else if (contact.playerId) return contact.playerId
    remaining = Math.max(0, remaining - 1e-7)
  }
  return null
}
