import { GAME_CONFIG } from './constants.js'
import {
  add,
  clamp,
  dot,
  length,
  normalize,
  paddleSegment,
  scale,
  sub,
} from './geometry.js'
import type { MatchState, Side, Vec2 } from './types.js'

interface Contact {
  time: number
  side?: Side
  point: Vec2
  kind: 'paddle' | 'boundary' | 'vertex'
  playerId: string | null
  normal?: Vec2
}

function lineContact(
  origin: Vec2,
  velocity: Vec2,
  radius: number,
  side: Side,
  maxTime: number,
  offset = 0,
): Contact | null {
  const distance =
    dot(sub(origin, side.start), side.inwardNormal) - radius - offset
  const approach = dot(velocity, side.inwardNormal)
  if (approach >= -1e-9) return null
  const time = -distance / approach
  if (time < -1e-7 || time > maxTime + 1e-7) return null
  const center = add(origin, scale(velocity, Math.max(0, time)))
  const point = sub(center, scale(side.inwardNormal, radius + offset))
  const edge = sub(side.end, side.start)
  const projection = dot(sub(point, side.start), edge) / dot(edge, edge)
  return projection < -1e-6 || projection > 1 + 1e-6
    ? null
    : {
        time: Math.max(0, time),
        side,
        point,
        kind: 'boundary',
        playerId: side.playerId,
      }
}

function findContact(state: MatchState, maxTime: number): Contact | null {
  let earliest: Contact | null = null
  for (const side of state.arena.sides) {
    const boundary = lineContact(
      state.ball.position,
      state.ball.velocity,
      state.ball.radius,
      side,
      maxTime,
    )
    if (boundary && (!earliest || boundary.time < earliest.time))
      earliest = boundary
    if (!side.playerId) continue
    const paddle = state.paddles.find((item) => item.playerId === side.playerId)
    if (!paddle) continue
    const [start, end] = paddleSegment(side, paddle.position, paddle.length)
    const hit = lineContact(
      state.ball.position,
      state.ball.velocity,
      state.ball.radius,
      { ...side, start, end },
      maxTime,
      GAME_CONFIG.paddleThickness,
    )
    if (hit && (!earliest || hit.time <= earliest.time + 1e-7))
      earliest = { ...hit, kind: 'paddle', playerId: paddle.playerId }
  }
  for (const vertex of state.arena.vertices) {
    const vertexContact = findVertexContact(
      state.ball.position,
      state.ball.velocity,
      state.ball.radius,
      vertex,
      maxTime,
    )
    if (vertexContact && (!earliest || vertexContact.time < earliest.time))
      earliest = vertexContact
  }
  return earliest
}

function findVertexContact(
  origin: Vec2,
  velocity: Vec2,
  radius: number,
  vertex: Vec2,
  maxTime: number,
): Contact | null {
  const relative = sub(origin, vertex)
  const velocitySquared = dot(velocity, velocity)
  if (velocitySquared < 1e-9) return null
  const b = 2 * dot(relative, velocity)
  const c = dot(relative, relative) - radius * radius
  const discriminant = b * b - 4 * velocitySquared * c
  if (discriminant < 0) return null
  const time = (-b - Math.sqrt(discriminant)) / (2 * velocitySquared)
  if (time < -1e-7 || time > maxTime + 1e-7) return null
  const center = add(origin, scale(velocity, Math.max(0, time)))
  return {
    time: Math.max(0, time),
    point: vertex,
    kind: 'vertex',
    playerId: null,
    normal: normalize(sub(center, vertex)),
  }
}

export function stepSimulation(
  state: MatchState,
  seconds: number,
): string | null {
  state.orbitSlingshotCooldown = Math.max(
    0,
    state.orbitSlingshotCooldown - seconds,
  )
  state.wormholeCooldown = Math.max(0, state.wormholeCooldown - seconds)
  const speedMultiplier = dynamicSpeedMultiplier(state)
  for (const paddle of state.paddles) {
    paddle.speed = GAME_CONFIG.paddleSpeed * speedMultiplier
    const side = state.arena.sides[paddle.sideIndex]!,
      sideLength = length(sub(side.end, side.start)),
      half = paddle.length / sideLength / 2
    paddle.position = clamp(
      paddle.position +
        (paddle.direction * paddle.speed * seconds) / sideLength,
      half,
      1 - half,
    )
  }
  if (state.phase !== 'playing') return null
  applyModifiers(state, seconds)
  capBallSpeed(state)
  let remaining = seconds
  for (let count = 0; count < 4 && remaining > 1e-7; count++) {
    const contact = findContact(state, remaining)
    if (!contact) {
      const previous = state.ball.position
      state.ball.position = add(
        state.ball.position,
        scale(state.ball.velocity, remaining),
      )
      if (tryWormholeCapture(state, previous, state.ball.position)) return null
      if (tryOrbitSlingshot(state, previous, state.ball.position)) return null
      break
    }
    const previous = state.ball.position
    state.ball.position = add(
      state.ball.position,
      scale(state.ball.velocity, contact.time),
    )
    if (tryWormholeCapture(state, previous, state.ball.position)) return null
    if (tryOrbitSlingshot(state, previous, state.ball.position)) return null
    remaining -= contact.time
    if (contact.kind === 'vertex' && contact.normal) {
      state.ball.velocity = sub(
        state.ball.velocity,
        scale(contact.normal, 2 * dot(state.ball.velocity, contact.normal)),
      )
      state.ball.position = add(
        state.ball.position,
        scale(contact.normal, 0.02),
      )
    } else if (contact.kind === 'paddle' && contact.playerId) {
      const side = contact.side!
      const paddle = state.paddles.find(
        (item) => item.playerId === contact.playerId,
      )!
      const [start, end] = paddleSegment(side, paddle.position, paddle.length),
        axis = normalize(sub(end, start)),
        center = add(start, scale(sub(end, start), 0.5))
      const offset = clamp(
        dot(sub(contact.point, center), axis) / (paddle.length / 2),
        -1,
        1,
      )
      let direction = normalize(
        add(
          side.inwardNormal,
          scale(axis, offset * 0.8 + paddle.direction * 0.15),
        ),
      )
      if (
        dot(direction, side.inwardNormal) < GAME_CONFIG.minimumInwardComponent
      )
        direction = normalize(
          add(
            direction,
            scale(side.inwardNormal, GAME_CONFIG.minimumInwardComponent),
          ),
        )
      state.ball.velocity = scale(
        direction,
        Math.min(
          length(state.ball.velocity) * GAME_CONFIG.ballAcceleration,
          dynamicMaximumBallSpeed(state),
        ),
      )
      state.ball.position = add(
        state.ball.position,
        scale(side.inwardNormal, 0.02),
      )
      const player = state.players.find((item) => item.id === contact.playerId)!
      state.lastHitterId = player.id
      player.returns++
      state.currentRally++
      state.longestRally = Math.max(state.longestRally, state.currentRally)
      state.events.push({ type: 'ball.returned', playerId: player.id })
    } else if (contact.side?.neutral || isHardCorner(contact)) {
      const side = contact.side!
      state.ball.velocity = sub(
        state.ball.velocity,
        scale(
          side.inwardNormal,
          2 * dot(state.ball.velocity, side.inwardNormal),
        ),
      )
      state.ball.position = add(
        state.ball.position,
        scale(side.inwardNormal, 0.02),
      )
    } else if (contact.playerId) return contact.playerId
    remaining = Math.max(0, remaining - 1e-7)
  }
  return null
}

function isHardCorner(contact: Contact): boolean {
  if (!contact.side?.playerId) return false
  const edge = sub(contact.side.end, contact.side.start)
  const edgeLengthSquared = dot(edge, edge)
  const projection =
    dot(sub(contact.point, contact.side.start), edge) / edgeLengthSquared
  return (
    projection <= GAME_CONFIG.hardCornerRatio ||
    projection >= 1 - GAME_CONFIG.hardCornerRatio
  )
}

function tryWormholeCapture(state: MatchState, from: Vec2, to: Vec2): boolean {
  if (!state.wormholeActive || !state.wormholeEntry || !state.wormholeExit)
    return false
  if (state.wormholeCooldown > 0) return false
  const travel = sub(to, from)
  const lengthSquared = dot(travel, travel)
  const projection = lengthSquared
    ? clamp(dot(sub(state.wormholeEntry, from), travel) / lengthSquared, 0, 1)
    : 0
  const closest = add(from, scale(travel, projection))
  // The entry's visible 90-unit influence ring is the capture boundary. Using
  // the same radius in the simulation prevents a ball from visibly crossing
  // that region without entering the wormhole.
  const captureRadius = 90 + state.ball.radius
  if (length(sub(closest, state.wormholeEntry)) > captureRadius) return false
  const direction =
    length(state.ball.velocity) > 1
      ? normalize(state.ball.velocity)
      : { x: 1, y: 0 }
  state.ball.position = add(
    state.wormholeExit,
    scale(direction, state.ball.radius + 2),
  )
  state.wormholeCooldown = 0.2
  return true
}

function tryOrbitSlingshot(state: MatchState, from: Vec2, to: Vec2): boolean {
  if (
    !state.orbitWellActive ||
    !state.orbitWell ||
    state.orbitSlingshotCooldown > 0
  )
    return false
  const travel = sub(to, from)
  const travelLengthSquared = dot(travel, travel)
  const projection = travelLengthSquared
    ? clamp(dot(sub(state.orbitWell, from), travel) / travelLengthSquared, 0, 1)
    : 0
  const closest = add(from, scale(travel, projection))
  const closestOffset = sub(closest, state.orbitWell)
  const closestDistance = length(closestOffset)
  const coreRadius = GAME_CONFIG.orbitCoreRadius + state.ball.radius
  if (closestDistance > coreRadius) return false
  const velocity = state.ball.velocity
  const travelDirection =
    length(velocity) > 1 ? normalize(velocity) : { x: 1, y: 0 }
  const radial =
    closestDistance > 1
      ? normalize(closestOffset)
      : { x: -travelDirection.y, y: travelDirection.x }
  const tangentA = { x: -radial.y, y: radial.x }
  const tangent = dot(velocity, tangentA) >= 0 ? tangentA : scale(tangentA, -1)
  const speed = Math.min(
    length(velocity) * 1.05,
    dynamicMaximumBallSpeed(state),
  )
  state.ball.position = add(state.orbitWell, scale(radial, coreRadius + 2))
  state.ball.velocity = scale(
    normalize(add(scale(tangent, 1), scale(radial, 0.35))),
    speed,
  )
  state.orbitSlingshotCooldown = 0.12
  return true
}

function applyModifiers(state: MatchState, seconds: number): void {
  const position = state.ball.position
  updateModifierLocations(state)
  if (state.modifiers.includes('vortex')) {
    const distance = Math.max(length(position), 1)
    const velocityDirection = normalize(state.ball.velocity)
    const outward =
      length(position) > 1
        ? normalize(position)
        : length(state.ball.velocity) > 1
          ? velocityDirection
          : { x: 1, y: 0 }
    const tangent = normalize({ x: -position.y, y: position.x })
    const strength = Math.min(2.5, 1 + state.modifierTime / 45)
    const force = add(
      scale(tangent, 34),
      scale(outward, 125 / Math.min(distance / 160, 1)),
    )
    const velocity = add(state.ball.velocity, scale(force, seconds * strength))
    state.ball.velocity = scale(
      normalize(velocity),
      Math.min(length(velocity), dynamicMaximumBallSpeed(state)),
    )
  }
  if (state.modifiers.includes('orbit')) {
    if (state.orbitWellActive && state.orbitWell) {
      const toward = sub(state.orbitWell, position)
      const distance = length(toward)
      const influence = clamp(
        1 - distance / GAME_CONFIG.orbitInfluenceRadius,
        0,
        1,
      )
      if (influence) {
        const radial =
          distance > 1
            ? normalize(toward)
            : length(state.ball.velocity) > 1
              ? normalize(scale(state.ball.velocity, -1))
              : { x: 1, y: 0 }
        const tangentA = { x: -radial.y, y: radial.x }
        const tangent =
          dot(state.ball.velocity, tangentA) >= 0
            ? tangentA
            : scale(tangentA, -1)
        const coreRepulsion =
          distance < GAME_CONFIG.orbitCoreRadius
            ? (1 - distance / GAME_CONFIG.orbitCoreRadius) * 900
            : 0
        state.ball.velocity = add(
          state.ball.velocity,
          scale(
            add(
              scale(radial, 1_400 * influence - coreRepulsion),
              scale(tangent, 180 * influence),
            ),
            seconds,
          ),
        )
      }
    }
  }
  const pulseCount = completedPulseCount(state, state.modifierTime)
  const previousPulseCount = completedPulseCount(
    state,
    Math.max(0, state.modifierTime - seconds),
  )
  if (pulseCount > previousPulseCount) {
    state.pulseWavePreviousRadius = 0
    state.pulseWaveRadius = 0
  }
  if (state.pulseWaveRadius >= 0) {
    state.pulseWavePreviousRadius = state.pulseWaveRadius
    state.pulseWaveRadius += 360 * seconds
    const distance = length(position)
    if (
      state.pulseWavePreviousRadius >= state.ball.radius * 2 &&
      distance >= state.pulseWavePreviousRadius &&
      distance < state.pulseWaveRadius
    ) {
      const outward =
        distance > 1 ? normalize(position) : normalize(state.ball.velocity)
      const impulse = add(
        state.ball.velocity,
        scale(outward.x || outward.y ? outward : { x: 1, y: 0 }, 260),
      )
      state.ball.velocity = scale(
        normalize(impulse),
        Math.min(length(impulse), dynamicMaximumBallSpeed(state)),
      )
    }
    if (state.pulseWaveRadius > GAME_CONFIG.arenaRadius * 1.5) {
      state.pulseWaveRadius = -1
      state.pulseWavePreviousRadius = -1
    }
  }
  if (
    state.modifiers.includes('wormhole') &&
    state.wormholeActive &&
    state.wormholeEntry &&
    state.wormholeExit
  ) {
    const offset = sub(state.wormholeEntry, position)
    const distance = length(offset)
    const captureRadius = 90
    if (distance < captureRadius) {
      const pull = normalize(offset)
      state.ball.velocity = add(
        state.ball.velocity,
        scale(pull, 700 * seconds * (1 - distance / captureRadius)),
      )
    }
  }
}

function updateModifierLocations(state: MatchState): void {
  const random = (seed: number) => modifierRandom(state, seed)
  const orbitSchedule = timedModifierState(state, 'orbit')
  if (state.modifiers.includes('orbit')) {
    state.orbitWellActive = orbitSchedule.active
    state.orbitWell = state.orbitWellActive
      ? {
          x: (random(orbitSchedule.cycle * 3 + 1) - 0.5) * 420,
          y: (random(orbitSchedule.cycle * 3 + 2) - 0.5) * 420,
        }
      : null
  }
  const wormholeSchedule = timedModifierState(state, 'wormhole')
  if (state.modifiers.includes('wormhole')) {
    state.wormholeActive = wormholeSchedule.active
    if (state.wormholeActive) {
      const drift =
        (state.modifierTime - GAME_CONFIG.modifierWarmupSeconds) %
        GAME_CONFIG.wormholeActivitySeconds
      state.wormholeEntry = {
        x:
          (random(wormholeSchedule.cycle * 5 + 3) - 0.5) * 600 +
          Math.sin(drift * 0.8 + 1) * 24,
        y:
          (random(wormholeSchedule.cycle * 5 + 4) - 0.5) * 600 +
          Math.cos(drift * 0.65 + 2) * 24,
      }
      const portalPosition = (seed: number) => ({
        x: (random(seed) - 0.5) * 600 + Math.cos(drift * 0.7 + seed) * 24,
        y: (random(seed + 1) - 0.5) * 600 + Math.sin(drift * 0.9 + seed) * 24,
      })
      state.wormholeExit = portalPosition(wormholeSchedule.cycle * 5 + 5)
      for (let attempt = 1; attempt <= 4; attempt++) {
        if (
          length(sub(state.wormholeExit, state.wormholeEntry)) >=
          GAME_CONFIG.wormholeMinimumGap
        )
          break
        state.wormholeExit = portalPosition(
          wormholeSchedule.cycle * 5 + 5 + attempt * 17,
        )
      }
      if (
        length(sub(state.wormholeExit, state.wormholeEntry)) <
        GAME_CONFIG.wormholeMinimumGap
      ) {
        const away =
          length(state.wormholeEntry) > 1
            ? normalize(scale(state.wormholeEntry, -1))
            : { x: 1, y: 0 }
        state.wormholeExit = add(
          state.wormholeEntry,
          scale(away, GAME_CONFIG.wormholeMinimumGap),
        )
      }
    } else {
      state.wormholeEntry = null
      state.wormholeExit = null
    }
  }
}

function modifierRandom(state: MatchState, seed: number): number {
  const value = Math.sin((state.serveSeed + seed) * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function randomGap(
  state: MatchState,
  seed: number,
  minimum: number,
  maximum: number,
): number {
  return minimum + modifierRandom(state, seed) * (maximum - minimum)
}

function completedPulseCount(state: MatchState, time: number): number {
  if (
    !state.modifiers.includes('pulse') ||
    time < GAME_CONFIG.modifierWarmupSeconds
  )
    return 0
  const elapsed = time - GAME_CONFIG.modifierWarmupSeconds
  let nextPulseAt = 0
  let count = 0
  while (true) {
    nextPulseAt += randomGap(
      state,
      101 + count * 29,
      GAME_CONFIG.pulseMinimumGapSeconds,
      GAME_CONFIG.pulseMaximumGapSeconds,
    )
    if (nextPulseAt > elapsed) return count
    count++
  }
}

function timedModifierState(
  state: MatchState,
  modifier: 'orbit' | 'wormhole',
  time = state.modifierTime,
): { active: boolean; cycle: number } {
  if (
    !state.modifiers.includes(modifier) ||
    time < GAME_CONFIG.modifierWarmupSeconds
  )
    return { active: false, cycle: -1 }
  const elapsed = time - GAME_CONFIG.modifierWarmupSeconds
  const settings =
    modifier === 'orbit'
      ? {
          activeSeconds: GAME_CONFIG.orbitActivitySeconds,
          minimumGap: GAME_CONFIG.orbitMinimumGapSeconds,
          maximumGap: GAME_CONFIG.orbitMaximumGapSeconds,
          salt: 211,
        }
      : {
          activeSeconds: GAME_CONFIG.wormholeActivitySeconds,
          minimumGap: GAME_CONFIG.wormholeMinimumGapSeconds,
          maximumGap: GAME_CONFIG.wormholeMaximumGapSeconds,
          salt: 307,
        }
  let cycle = 0
  let cycleStartedAt = 0
  while (true) {
    if (elapsed < cycleStartedAt + settings.activeSeconds)
      return { active: true, cycle }
    cycleStartedAt += settings.activeSeconds
    const gap = randomGap(
      state,
      settings.salt + cycle * 31,
      settings.minimumGap,
      settings.maximumGap,
    )
    if (elapsed < cycleStartedAt + gap) return { active: false, cycle }
    cycleStartedAt += gap
    cycle++
  }
}

function dynamicSpeedMultiplier(state: MatchState): number {
  return Math.min(1.75, 1 + state.modifierTime / 120)
}

function dynamicMaximumBallSpeed(state: MatchState): number {
  return Math.min(
    GAME_CONFIG.maximumBallSpeed * 1.5,
    GAME_CONFIG.maximumBallSpeed * dynamicSpeedMultiplier(state),
  )
}

function capBallSpeed(state: MatchState): void {
  const speed = length(state.ball.velocity)
  const maximum = dynamicMaximumBallSpeed(state)
  if (speed > maximum)
    state.ball.velocity = scale(normalize(state.ball.velocity), maximum)
}
