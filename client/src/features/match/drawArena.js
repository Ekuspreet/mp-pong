/** Pure canvas drawing: no React lifecycle, networking or input handling. */
const BRAND_COLORS = {
  cream: '#f7e8c6',
  teal: '#70b7b5',
  orange: '#ef5b34',
  yellow: '#f5b642',
}
const BALL_COLORS = [
  BRAND_COLORS.orange,
  BRAND_COLORS.yellow,
  BRAND_COLORS.teal,
]

export function drawArena(context, snapshot, width, height, userId) {
  context.clearRect(0, 0, width, height)
  if (!snapshot) return
  const localPaddle = snapshot.paddles.find((p) => p.playerId === userId)
  const localSide = localPaddle && snapshot.arena.sides[localPaddle.sideIndex]
  const normalAngle = localSide
    ? Math.atan2(localSide.inwardNormal.y, localSide.inwardNormal.x)
    : -Math.PI / 2
  const rotation = -Math.PI / 2 - normalAngle
  const cos = Math.cos(rotation),
    sin = Math.sin(rotation)
  const rotate = (v) => ({
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  })
  // Frame every arena by its visible bounds. A triangle and an octagon should
  // use the same viewport, even though their world-space extents differ.
  const vertices = snapshot.arena.vertices.map(rotate)
  const bounds = vertices.reduce(
    (box, vertex) => ({
      minX: Math.min(box.minX, vertex.x),
      maxX: Math.max(box.maxX, vertex.x),
      minY: Math.min(box.minY, vertex.y),
      maxY: Math.max(box.maxY, vertex.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )
  const padding = Math.max(28, Math.min(width, height) * 0.07)
  const spanX = Math.max(1, bounds.maxX - bounds.minX)
  const spanY = Math.max(1, bounds.maxY - bounds.minY)
  const zoom = Math.min(
    (width - padding * 2) / spanX,
    (height - padding * 2) / spanY,
  )
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const point = (v) => {
    const rotated = rotate(v)
    return {
      x: width / 2 + (rotated.x - centerX) * zoom,
      y: height / 2 + (rotated.y - centerY) * zoom,
    }
  }
  context.strokeStyle = BRAND_COLORS.teal
  context.lineWidth = 2
  for (const side of snapshot.arena.sides) {
    const edge = {
      x: side.end.x - side.start.x,
      y: side.end.y - side.start.y,
    }
    const lerpSide = (ratio) => ({
      x: side.start.x + edge.x * ratio,
      y: side.start.y + edge.y * ratio,
    })
    const a = point(side.start),
      b = point(side.end)
    context.beginPath()
    context.moveTo(a.x, a.y)
    context.lineTo(b.x, b.y)
    context.strokeStyle = side.playerId ? '#d15c4c' : BRAND_COLORS.teal
    context.stroke()
    if (side.playerId) {
      context.strokeStyle = '#b7d5d0'
      context.lineWidth = 5
      for (const [start, end] of [
        [0, 0.12],
        [0.88, 1],
      ]) {
        const cornerStart = point(lerpSide(start))
        const cornerEnd = point(lerpSide(end))
        context.beginPath()
        context.moveTo(cornerStart.x, cornerStart.y)
        context.lineTo(cornerEnd.x, cornerEnd.y)
        context.stroke()
      }
      context.lineWidth = 2
    }
  }
  if (snapshot.modifiers?.includes('vortex'))
    drawVortex(context, point, zoom, snapshot.tick)
  if (snapshot.modifiers?.includes('pulse'))
    drawPulseWave(context, point, zoom, snapshot.pulseWaveRadius)
  drawModifierPortals(context, point, zoom, snapshot)
  snapshot.paddles.forEach((paddle, index) => {
    const side = snapshot.arena.sides[paddle.sideIndex],
      size = Math.hypot(side.end.x - side.start.x, side.end.y - side.start.y),
      half = paddle.length / size / 2,
      lerp = (a, b, t) => ({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      }),
      a = point(lerp(side.start, side.end, paddle.position - half)),
      b = point(lerp(side.start, side.end, paddle.position + half))
    context.strokeStyle =
      paddle.playerId === userId
        ? BRAND_COLORS.yellow
        : index % 2
          ? BRAND_COLORS.orange
          : BRAND_COLORS.cream
    context.lineWidth = 12
    context.beginPath()
    context.moveTo(a.x, a.y)
    context.lineTo(b.x, b.y)
    context.stroke()
  })
  const ball = point(snapshot.ball.position)
  const velocity = snapshot.ball.velocity
  const speed = Math.hypot(velocity.x, velocity.y)
  const ballColor =
    BALL_COLORS[(Math.max(1, snapshot.stage) - 1) % BALL_COLORS.length]
  if (speed > 0) {
    const direction = { x: velocity.x / speed, y: velocity.y / speed }
    const trailLength = 5
    for (let index = trailLength; index >= 1; index--) {
      const progress = 1 - index / (trailLength + 1)
      const trailPoint = point({
        x:
          snapshot.ball.position.x -
          direction.x * index * snapshot.ball.radius * 0.8,
        y:
          snapshot.ball.position.y -
          direction.y * index * snapshot.ball.radius * 0.8,
      })
      context.globalAlpha = progress * 0.12
      context.fillStyle = ballColor
      context.beginPath()
      context.arc(
        trailPoint.x,
        trailPoint.y,
        snapshot.ball.radius * zoom * progress,
        0,
        Math.PI * 2,
      )
      context.fill()
    }
  }
  context.globalAlpha = 1
  context.save()
  context.shadowColor = ballColor
  context.shadowBlur = Math.max(10, snapshot.ball.radius * zoom * 1.8)
  context.fillStyle = ballColor
  context.strokeStyle = BRAND_COLORS.cream
  context.lineWidth = 2
  context.beginPath()
  context.arc(ball.x, ball.y, snapshot.ball.radius * zoom, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  context.restore()
}

function drawModifierPortals(context, point, zoom, snapshot) {
  if (snapshot.orbitWellActive && snapshot.orbitWell)
    drawGravityWell(context, point(snapshot.orbitWell), zoom)
  if (snapshot.wormholeActive) {
    if (snapshot.wormholeEntry)
      drawPortal(
        context,
        point(snapshot.wormholeEntry),
        22 * zoom,
        '#101820',
        0.9,
        90 * zoom,
      )
    if (snapshot.wormholeExit)
      drawPortal(
        context,
        point(snapshot.wormholeExit),
        22 * zoom,
        '#e9eef0',
        0.9,
      )
    if (snapshot.wormholeEntry && snapshot.wormholeExit)
      drawWormholeParticles(
        context,
        point(snapshot.wormholeEntry),
        point(snapshot.wormholeExit),
        zoom,
        snapshot.tick,
      )
  }
}

function drawWormholeParticles(context, entry, exit, zoom, tick) {
  const random = (seed) => {
    const value = Math.sin(seed * 19.17) * 43758.5453
    return value - Math.floor(value)
  }
  context.save()
  context.globalCompositeOperation = 'lighter'
  for (let index = 0; index < 18; index++) {
    const seed = index + 41
    const angle = random(seed) * Math.PI * 2 + tick * 0.025
    const progress = (tick * (1.2 + random(seed + 1) * 0.8) + index * 13) % 86
    const inwardDistance = 90 - progress
    const outwardDistance = 12 + progress
    const size = Math.max(1.2, (1.5 + random(seed + 2) * 2.5) * zoom)
    const drawParticle = (center, distance, color) => {
      const x = center.x + Math.cos(angle) * distance * zoom
      const y = center.y + Math.sin(angle) * distance * zoom
      context.globalAlpha = 0.25 + random(seed + 3) * 0.55
      context.fillStyle = color
      context.beginPath()
      context.arc(x, y, size, 0, Math.PI * 2)
      context.fill()
    }
    drawParticle(entry, inwardDistance, '#111a20')
    drawParticle(exit, outwardDistance, '#e9eef0')
  }
  context.restore()
}

function drawGravityWell(context, center, zoom) {
  context.save()
  context.globalCompositeOperation = 'lighter'
  context.strokeStyle = '#9fc5c2'
  context.fillStyle = '#18343a'
  context.shadowColor = '#7fb7b2'
  context.shadowBlur = 18 * zoom
  context.globalAlpha = 0.72
  context.beginPath()
  context.arc(center.x, center.y, 12 * zoom, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  context.shadowBlur = 0
  const influenceRadius = 230 * zoom
  context.globalAlpha = 0.14
  context.lineWidth = Math.max(1, zoom * 1.5)
  context.setLineDash([8 * zoom, 9 * zoom])
  context.beginPath()
  context.arc(center.x, center.y, influenceRadius, 0, Math.PI * 2)
  context.stroke()
  context.setLineDash([])
  context.globalAlpha = 0.24
  context.lineWidth = Math.max(1, zoom * 2)
  context.beginPath()
  context.arc(center.x, center.y, 82 * zoom, 0, Math.PI * 2)
  context.stroke()
  for (let ring = 1; ring <= 4; ring++) {
    context.globalAlpha = 0.34 / ring
    context.lineWidth = Math.max(1, zoom * 2.5)
    context.beginPath()
    context.arc(center.x, center.y, (18 + ring * 20) * zoom, 0, Math.PI * 2)
    context.stroke()
  }
  context.restore()
}

function drawPortal(context, center, radius, color, alpha, influenceRadius) {
  context.save()
  context.globalAlpha = alpha
  context.fillStyle = color
  context.shadowColor = color
  context.shadowBlur = radius * 0.8
  context.beginPath()
  context.arc(center.x, center.y, radius, 0, Math.PI * 2)
  context.fill()
  if (influenceRadius) {
    context.globalAlpha = 0.18
    context.strokeStyle = color
    context.shadowBlur = 0
    context.lineWidth = Math.max(1, zoomForPortal(radius) * 2)
    context.beginPath()
    context.arc(center.x, center.y, influenceRadius, 0, Math.PI * 2)
    context.stroke()
  }
  context.restore()
}

function zoomForPortal(radius) {
  return Math.max(1, radius / 22)
}

function drawPulseWave(context, point, zoom, radius) {
  if (!(radius >= 0)) return
  const center = point({ x: 0, y: 0 })
  const edge = point({ x: radius, y: 0 })
  const size = Math.hypot(edge.x - center.x, edge.y - center.y)
  context.save()
  const fade = Math.max(0.18, 1 - radius / 700)
  context.globalAlpha = 0.78 * fade
  context.strokeStyle = '#b7d5d0'
  context.shadowColor = '#b7d5d0'
  context.shadowBlur = Math.max(8, zoom * 18)
  context.lineWidth = Math.max(3, zoom * 10)
  context.beginPath()
  context.arc(center.x, center.y, size, 0, Math.PI * 2)
  context.stroke()
  context.globalAlpha = 0.32 * fade
  context.shadowBlur = 0
  context.lineWidth = Math.max(1, zoom * 3)
  context.beginPath()
  context.arc(center.x, center.y, size + zoom * 12, 0, Math.PI * 2)
  context.stroke()
  context.restore()
}

function drawVortex(context, point, zoom, tick) {
  return drawProceduralTornado(context, point, zoom, tick)
  /* Legacy renderer retained below for reference. */
  const center = point({ x: 0, y: 0 })
  const rotation = tick * 0.045
  const tornadoScale = 1 / 3
  const random = (seed) => {
    const value = Math.sin(seed * 12.9898) * 43758.5453
    return value - Math.floor(value)
  }
  context.save()
  context.translate(center.x, center.y)
  context.globalCompositeOperation = 'screen'
  for (let fragment = 0; fragment < 190; fragment++) {
    const seed = fragment + 17
    const radius =
      (12 + Math.pow(random(seed), 0.72) * 210) * zoom * tornadoScale
    const angularSpeed = 0.6 + random(seed + 1) * 1.5
    const angle = rotation * angularSpeed + random(seed + 2) * Math.PI * 2
    const length = (16 + random(seed + 3) * 68) * zoom * tornadoScale
    const arc = 0.12 + random(seed + 4) * 0.38
    const bend = (random(seed + 5) - 0.5) * 0.28
    const width = Math.max(6.4, (14 + random(seed + 6) * 16) * zoom)
    const startAngle = angle - arc * 0.5
    const endAngle = angle + arc * 0.5
    const start = {
      x: Math.cos(startAngle) * (radius - length * 0.35),
      y: Math.sin(startAngle) * (radius - length * 0.35),
    }
    const end = {
      x: Math.cos(endAngle) * (radius + length * 0.65),
      y: Math.sin(endAngle) * (radius + length * 0.65),
    }
    const radialProgress = Math.min(1, radius / (222 * zoom * tornadoScale))
    const baseOpacity = 0.35 + random(seed + 8) * 0.55
    const opacity = baseOpacity * (1 - radialProgress * 0.72)
    context.globalAlpha = opacity
    context.fillStyle =
      random(seed + 9) > 0.2 ? BRAND_COLORS.cream : BRAND_COLORS.teal
    const tangent = {
      x: end.x - start.x,
      y: end.y - start.y,
    }
    const tangentLength = Math.max(1, Math.hypot(tangent.x, tangent.y))
    const normal = {
      x: -tangent.y / tangentLength,
      y: tangent.x / tangentLength,
    }
    const midpoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    }
    const midpointRadius = Math.max(1, Math.hypot(midpoint.x, midpoint.y))
    const outward = {
      x: midpoint.x / midpointRadius,
      y: midpoint.y / midpointRadius,
    }
    const middle = {
      x: midpoint.x + outward.x * width * 1.2,
      y: midpoint.y + outward.y * width * 1.2,
    }
    const leftStart = {
      x: start.x + normal.x * width * 0.28,
      y: start.y + normal.y * width * 0.28,
    }
    const rightStart = {
      x: start.x - normal.x * width * 0.28,
      y: start.y - normal.y * width * 0.28,
    }
    const leftEnd = {
      x: end.x + normal.x * width * 0.12,
      y: end.y + normal.y * width * 0.12,
    }
    const rightEnd = {
      x: end.x - normal.x * width * 0.12,
      y: end.y - normal.y * width * 0.12,
    }
    context.beginPath()
    context.moveTo(leftStart.x, leftStart.y)
    context.quadraticCurveTo(middle.x, middle.y, leftEnd.x, leftEnd.y)
    context.quadraticCurveTo(end.x, end.y, rightEnd.x, rightEnd.y)
    context.quadraticCurveTo(middle.x, middle.y, rightStart.x, rightStart.y)
    context.quadraticCurveTo(start.x, start.y, leftStart.x, leftStart.y)
    context.fill()
  }
  drawAtmosphericWisps(context, zoom, rotation, tornadoScale, random)
  context.globalAlpha = 0.3
  context.fillStyle = BRAND_COLORS.cream
  context.beginPath()
  context.arc(0, 0, 13 * zoom * tornadoScale, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawProceduralTornado(context, point, zoom, tick) {
  return drawWingedVortex(context, point, zoom, tick)
  /* Atmospheric renderer retained below for reference. */
  const center = point({ x: 0, y: 0 })
  const scale = 1 / 3
  const rotation = tick * 0.032
  const random = (seed) => {
    const value = Math.sin(seed * 91.17) * 43758.5453
    return value - Math.floor(value)
  }
  context.save()
  context.translate(center.x, center.y)
  context.globalCompositeOperation = 'lighter'
  context.lineCap = 'round'
  for (let path = 0; path < 13; path++) {
    const seed = 800 + path * 31
    const points = []
    const phase = random(seed) * Math.PI * 2
    for (let step = 0; step < 15; step++) {
      const progress = step / 14
      const radius =
        (8 + progress * (180 + random(seed + 1) * 80)) * zoom * scale
      const angle = phase + rotation * (0.3 + progress * 1.4) + progress * 2.2
      const wobble = (random(seed + step + 4) - 0.5) * 35 * zoom * scale
      points.push({
        x: Math.cos(angle) * radius + wobble,
        y: Math.sin(angle) * radius + wobble,
      })
    }
    context.globalAlpha = 0.06 + random(seed + 2) * 0.16
    context.strokeStyle = random(seed + 3) > 0.35 ? '#d8ddd4' : '#718f91'
    context.lineWidth = (2 + random(seed + 5) * 7) * zoom
    context.beginPath()
    context.moveTo(points[0].x, points[0].y)
    points.slice(1).forEach((p) => context.lineTo(p.x, p.y))
    context.stroke()
  }
  for (let particle = 0; particle < 150; particle++) {
    const seed = 1200 + particle * 7
    const radius = (12 + Math.pow(random(seed), 0.6) * 220) * zoom * scale
    const angle =
      rotation * (0.4 + random(seed + 1) * 1.8) + random(seed + 2) * Math.PI * 2
    const size = (2 + random(seed + 3) * 7) * zoom
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    context.globalAlpha =
      (0.15 + random(seed + 4) * 0.55) *
      (1 - (radius / (240 * zoom * scale)) * 0.65)
    context.fillStyle = random(seed + 5) > 0.25 ? '#e3e0d2' : '#8b7563'
    context.beginPath()
    context.ellipse(x, y, size * 1.8, size * 0.55, angle + 0.8, 0, Math.PI * 2)
    context.fill()
  }
  context.globalAlpha = 0.45
  context.fillStyle = '#101b20'
  context.beginPath()
  context.ellipse(
    0,
    0,
    14 * zoom * scale,
    10 * zoom * scale,
    rotation,
    0,
    Math.PI * 2,
  )
  context.fill()
  context.restore()
}

function drawWingedVortex(context, point, zoom, tick) {
  return drawReferenceVortex(context, point, zoom, tick)
  /* Previous wing renderer retained below for reference. */
  const center = point({ x: 0, y: 0 })
  const scale = 1 / 3
  const rotation = tick * 0.028
  const random = (seed) => {
    const value = Math.sin(seed * 17.31) * 43758.5453
    return value - Math.floor(value)
  }
  const wingCount = 9 + Math.floor(random(11) * 4)
  context.save()
  context.translate(center.x, center.y)
  context.rotate(rotation)
  context.globalCompositeOperation = 'source-over'

  for (let wing = 0; wing < wingCount; wing++) {
    const seed = 3000 + wing * 41
    const angle = (wing / wingCount) * Math.PI * 2 + (random(seed) - 0.5) * 0.24
    const length = (145 + random(seed + 1) * 95) * zoom * scale
    const width = (28 + random(seed + 2) * 34) * zoom * scale
    const curl = 0.45 + random(seed + 3) * 0.45
    const start = 8 * zoom * scale
    const pointAt = (radius, offset = 0) => ({
      x: Math.cos(angle + offset) * radius,
      y: Math.sin(angle + offset) * radius,
    })
    const inner = pointAt(start)
    const outer = pointAt(length, -curl)
    const outerBack = pointAt(length * 0.82, -curl * 0.7)
    const left = pointAt(length * 0.64, -curl * 0.35)
    const right = pointAt(length * 0.34, 0.04)
    context.fillStyle = random(seed + 4) > 0.28 ? '#718aa0' : '#61788d'
    context.globalAlpha = 0.82 + random(seed + 5) * 0.16
    context.beginPath()
    context.moveTo(inner.x, inner.y)
    context.bezierCurveTo(right.x, right.y, left.x, left.y, outer.x, outer.y)
    context.bezierCurveTo(
      outerBack.x,
      outerBack.y,
      left.x,
      left.y,
      inner.x,
      inner.y,
    )
    context.closePath()
    context.fill()

    const highlightStart = pointAt(start + width * 0.22, 0.02)
    const highlightEnd = pointAt(
      length * (0.58 + random(seed + 6) * 0.2),
      -curl * 0.55,
    )
    context.fillStyle = '#aabccc'
    context.globalAlpha = 0.35 + random(seed + 7) * 0.25
    context.beginPath()
    context.moveTo(highlightStart.x, highlightStart.y)
    context.bezierCurveTo(
      pointAt(length * 0.24, -0.03).x,
      pointAt(length * 0.24, -0.03).y,
      pointAt(length * 0.42, -curl * 0.28).x,
      pointAt(length * 0.42, -curl * 0.28).y,
      highlightEnd.x,
      highlightEnd.y,
    )
    context.bezierCurveTo(
      pointAt(length * 0.48, -curl * 0.18).x,
      pointAt(length * 0.48, -curl * 0.18).y,
      pointAt(length * 0.28, 0.02).x,
      pointAt(length * 0.28, 0.02).y,
      highlightStart.x,
      highlightStart.y,
    )
    context.fill()
  }
  context.globalAlpha = 0.95
  context.fillStyle = '#e9eef0'
  context.beginPath()
  context.arc(0, 0, 17 * zoom * scale, 0, Math.PI * 2)
  context.fill()
  context.globalAlpha = 1
  context.fillStyle = '#7890a5'
  context.beginPath()
  context.arc(0, 0, 10 * zoom * scale, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawReferenceVortex(context, point, zoom, tick) {
  const center = point({ x: 0, y: 0 })
  const rotation = tick * 0.028
  const scale = 0.72
  const count = 10
  context.save()
  context.translate(center.x, center.y)
  context.rotate(rotation)
  for (let wing = 0; wing < count; wing++) {
    const base = (wing / count) * Math.PI * 2
    const maxRadius = 190 * zoom * scale
    const bladeWidth = 32 * zoom * scale
    const curl = 1.72
    const left = []
    const right = []
    for (let step = 0; step <= 10; step++) {
      const progress = step / 10
      const radius = 9 + progress * maxRadius
      const angle = base - progress * curl
      const width =
        bladeWidth * Math.sin(progress * Math.PI) * (0.35 + progress * 0.65)
      const tangent = { x: -Math.sin(angle), y: Math.cos(angle) }
      const pointOnWing = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
      left.push({
        x: pointOnWing.x + tangent.x * width,
        y: pointOnWing.y + tangent.y * width,
      })
      right.push({
        x: pointOnWing.x - tangent.x * width,
        y: pointOnWing.y - tangent.y * width,
      })
    }
    context.globalAlpha = 0.9
    context.fillStyle = '#718aa0'
    context.beginPath()
    context.moveTo(left[0].x, left[0].y)
    left.slice(1).forEach((p) => context.lineTo(p.x, p.y))
    right.reverse().forEach((p) => context.lineTo(p.x, p.y))
    context.closePath()
    context.fill()
    const highlight = left.slice(2, 7)
    context.globalAlpha = 0.35
    context.strokeStyle = '#b8c7d0'
    context.lineWidth = Math.max(1.5, bladeWidth * 0.12)
    context.beginPath()
    context.moveTo(highlight[0].x, highlight[0].y)
    highlight.slice(1).forEach((p) => context.lineTo(p.x, p.y))
    context.stroke()
  }
  context.globalAlpha = 1
  context.fillStyle = '#e7edf0'
  context.beginPath()
  context.arc(0, 0, 11 * zoom * scale, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawAtmosphericWisps(context, zoom, rotation, scale, random) {
  // Broad, uneven inflow bands keep the effect organic instead of logo-like.
  context.lineCap = 'round'
  for (let arm = 0; arm < 9; arm++) {
    const seed = 400 + arm * 19
    const startRadius = (125 + random(seed) * 100) * zoom * scale
    const startAngle =
      random(seed + 1) * Math.PI * 2 +
      rotation * (0.35 + random(seed + 2) * 0.5)
    const points = []
    for (let step = 0; step < 9; step++) {
      const progress = step / 8
      const radius = startRadius * (1 - progress * 0.82)
      const angle =
        startAngle + progress * (1.8 + random(seed + step + 3) * 1.5)
      const jitter = (random(seed + step + 20) - 0.5) * 24 * zoom * scale
      points.push({
        x: Math.cos(angle) * radius + jitter,
        y: Math.sin(angle) * radius + jitter,
      })
    }
    context.globalAlpha = 0.08 + random(seed + 30) * 0.16
    context.strokeStyle =
      random(seed + 31) > 0.3 ? BRAND_COLORS.cream : BRAND_COLORS.teal
    context.lineWidth = (3 + random(seed + 32) * 6) * zoom
    context.beginPath()
    context.moveTo(points[0].x, points[0].y)
    for (let index = 1; index < points.length - 1; index += 2) {
      const control = points[index]
      const end = points[index + 1]
      context.quadraticCurveTo(control.x, control.y, end.x, end.y)
    }
    context.stroke()
  }
  // Embedded secondary eddies break up the main circulation.
  for (let eddy = 0; eddy < 5; eddy++) {
    const seed = 700 + eddy * 23
    const radius = (45 + random(seed) * 105) * zoom * scale
    const angle =
      rotation * (0.5 + random(seed + 1)) + random(seed + 2) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    context.globalAlpha = 0.14 + random(seed + 3) * 0.2
    context.strokeStyle = BRAND_COLORS.teal
    context.lineWidth = Math.max(1, (2 + random(seed + 4) * 3) * zoom)
    context.beginPath()
    for (let step = 0; step < 8; step++) {
      const localRadius = (4 + step * 3.5) * zoom * scale
      const localAngle = rotation * (1.5 + random(seed + 5) * 0.8) + step * 0.7
      const px = x + Math.cos(localAngle) * localRadius
      const py = y + Math.sin(localAngle) * localRadius
      if (step === 0) context.moveTo(px, py)
      else context.lineTo(px, py)
    }
    context.stroke()
  }
  context.lineCap = 'butt'
}
