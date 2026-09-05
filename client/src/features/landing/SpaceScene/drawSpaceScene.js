import Matter from 'matter-js'
import { sceneConfig } from '../config/scene.js'

const { Vector } = Matter

/** Draws a scene frame; simulation and browser lifecycle live in the runtime. */
export function drawSpaceScene(context, time, state) {
  const {
    width,
    height,
    reduced,
    stars,
    artifacts,
    planets,
    comets,
    balls,
    trails,
    blackHole,
    blackHoleIntensity,
  } = state
  function drawPlanet(body, time) {
    const visual = body.visual,
      x = body.position.x,
      y = body.position.y,
      radius = body.circleRadius
    context.save()
    context.translate(x, y)
    context.rotate(-0.16)
    context.strokeStyle = visual.ring
    context.lineWidth = Math.max(5, radius * 0.11)
    context.globalAlpha = 0.76
    context.beginPath()
    context.ellipse(0, 0, radius * 1.7, radius * 0.43, 0, 0, Math.PI * 2)
    context.stroke()
    context.globalAlpha = 1
    context.fillStyle = visual.color
    context.beginPath()
    context.arc(0, 0, radius, 0, Math.PI * 2)
    context.fill()
    context.globalAlpha = 0.2
    context.fillStyle = '#102e3a'
    for (let band = -2; band <= 2; band++)
      context.fillRect(
        -radius,
        band * radius * 0.27 + Math.sin(time / 900 + band) * 2,
        radius * 2,
        Math.max(2, radius * 0.06),
      )
    context.restore()
  }

  function drawArtifacts(time) {
    artifacts.forEach((artifact) => {
      const bob = Math.sin(time * 0.00045 + artifact.phase) * 2
      context.save()
      context.translate(artifact.x, artifact.y + bob)
      context.rotate(artifact.rotation)
      context.globalAlpha = 0.28
      context.strokeStyle = '#f7e8c6'
      context.fillStyle = '#70b7b5'
      context.lineWidth = 1.4
      const pattern = artifact.constellation,
        scale = artifact.size * 1.45
      context.setLineDash([1.5, 3])
      context.lineWidth = 1
      pattern.edges.forEach(([from, to]) => {
        const a = pattern.points[from],
          b = pattern.points[to]
        context.beginPath()
        context.moveTo(a[0] * scale, a[1] * scale)
        context.lineTo(b[0] * scale, b[1] * scale)
        context.stroke()
      })
      context.setLineDash([])
      pattern.points.forEach(([x, y], index) => {
        const px = x * scale,
          py = y * scale,
          starSize = index % 3 === 0 ? 2.8 : 1.7
        context.beginPath()
        context.moveTo(px, py - starSize)
        context.lineTo(px + starSize * 0.45, py - starSize * 0.45)
        context.lineTo(px + starSize, py)
        context.lineTo(px + starSize * 0.45, py + starSize * 0.45)
        context.lineTo(px, py + starSize)
        context.lineTo(px - starSize * 0.45, py + starSize * 0.45)
        context.lineTo(px - starSize, py)
        context.lineTo(px - starSize * 0.45, py - starSize * 0.45)
        context.closePath()
        context.fill()
      })
      context.rotate(-artifact.rotation)
      context.font = '600 7px Georgia, serif'
      context.letterSpacing = '1px'
      context.fillStyle = '#f7e8c6'
      context.fillText(pattern.name.toUpperCase(), -scale, scale + 10)
      context.restore()
    })
  }

  function drawBlackHole(time) {
    if (!blackHole) return
    const intensity = blackHoleIntensity(time),
      radius = 14 + intensity * 58
    context.save()
    context.translate(blackHole.x, blackHole.y)
    const shadow = context.createRadialGradient(
      0,
      0,
      radius * 0.35,
      0,
      0,
      radius * 3.6,
    )
    shadow.addColorStop(0, 'rgba(0, 0, 0, 1)')
    shadow.addColorStop(0.22, `rgba(0, 0, 0, ${0.98 * intensity})`)
    shadow.addColorStop(0.42, `rgba(3, 10, 14, ${0.84 * intensity})`)
    shadow.addColorStop(0.64, `rgba(9, 25, 32, ${0.48 * intensity})`)
    shadow.addColorStop(0.82, `rgba(93, 137, 144, ${0.14 * intensity})`)
    shadow.addColorStop(1, 'rgba(7, 24, 32, 0)')
    context.fillStyle = shadow
    context.beginPath()
    context.arc(0, 0, radius * 3.6, 0, Math.PI * 2)
    context.fill()
    const core = context.createRadialGradient(0, 0, 0, 0, 0, radius * 1.45)
    core.addColorStop(0, `rgba(0, 0, 0, ${intensity})`)
    core.addColorStop(0.62, `rgba(0, 0, 0, ${0.98 * intensity})`)
    core.addColorStop(0.82, `rgba(0, 0, 0, ${0.72 * intensity})`)
    core.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = core
    context.beginPath()
    context.arc(0, 0, radius * 1.45, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  function draw(time) {
    context.clearRect(0, 0, width, height)
    const gradient = context.createRadialGradient(
      width * 0.65,
      height * 0.32,
      0,
      width * 0.65,
      height * 0.32,
      Math.max(width, height),
    )
    gradient.addColorStop(0, '#183d49')
    gradient.addColorStop(0.56, '#0d2834')
    gradient.addColorStop(1, '#071820')
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
    stars.forEach((star) => {
      const drift = reduced
        ? 0
        : Math.sin(time / (1800 + star.layer * 700) + star.x) *
          (star.layer + 0.4)
      const twinkle = reduced
        ? 1
        : 0.91 + Math.sin(time * star.twinkleSpeed + star.phase) * 0.09
      let x = star.x + drift,
        y =
          star.y +
          (reduced
            ? 0
            : Math.cos(time * star.twinkleSpeed * 0.62 + star.phase) * 0.55),
        alpha = star.alpha * twinkle
      if (blackHole) {
        const toward = Vector.sub(blackHole, { x, y }),
          distance = Vector.magnitude(toward),
          intensity = blackHoleIntensity(time)
        if (distance < sceneConfig.blackHole.pullRadius) {
          const warp =
            intensity *
            Math.pow(1 - distance / sceneConfig.blackHole.pullRadius, 2)
          x += toward.x * warp * 0.82
          y += toward.y * warp * 0.82
          alpha *= Math.max(0, distance / 90)
        }
      }
      context.globalAlpha = alpha
      context.fillStyle = star.layer === 1 ? '#f5b642' : '#f7e8c6'
      context.beginPath()
      context.arc(x, y, star.size, 0, Math.PI * 2)
      context.fill()
    })
    context.globalAlpha = 0.18
    context.strokeStyle = '#70b7b5'
    context.lineWidth = 1
    planets.forEach((planet, index) => {
      context.beginPath()
      context.ellipse(
        width * 0.52,
        height * 0.48,
        width * (0.32 + index * 0.11),
        height * (0.13 + index * 0.08),
        -0.25 + index * 0.15,
        0,
        Math.PI * 2,
      )
      context.stroke()
    })
    drawArtifacts(time)
    context.globalAlpha = 1
    planets.forEach((planet) => drawPlanet(planet, time))
    comets.forEach((comet) => {
      const magnitude = Math.hypot(comet.vx, comet.vy),
        ux = comet.vx / magnitude,
        uy = comet.vy / magnitude
      const tail = context.createLinearGradient(
        comet.x,
        comet.y,
        comet.x - ux * comet.length,
        comet.y - uy * comet.length,
      )
      tail.addColorStop(0, comet.color)
      tail.addColorStop(1, 'rgba(247, 232, 198, 0)')
      context.globalAlpha = 0.72
      context.strokeStyle = tail
      context.lineWidth = 2.2
      context.beginPath()
      context.moveTo(comet.x, comet.y)
      context.lineTo(comet.x - ux * comet.length, comet.y - uy * comet.length)
      context.stroke()
      context.globalAlpha = 1
      context.fillStyle = comet.color
      context.beginPath()
      context.arc(comet.x, comet.y, 2.6, 0, Math.PI * 2)
      context.fill()
    })
    balls.forEach((ball) => {
      const trail = trails.get(ball.id)
      trail.forEach((point, index) => {
        context.globalAlpha = (index / trail.length) * 0.22
        context.fillStyle = ball.renderColor
        context.beginPath()
        context.arc(
          point.x,
          point.y,
          (ball.circleRadius * index) / trail.length,
          0,
          Math.PI * 2,
        )
        context.fill()
      })
      context.globalAlpha = 1
      context.fillStyle = ball.renderColor
      context.strokeStyle = '#f7e8c6'
      context.lineWidth = 2
      context.beginPath()
      context.arc(
        ball.position.x,
        ball.position.y,
        ball.circleRadius,
        0,
        Math.PI * 2,
      )
      context.fill()
      context.stroke()
    })
    drawBlackHole(time)
    context.globalAlpha = 0.055
    context.fillStyle = '#f7e8c6'
    for (let y = 0; y < height; y += 4) context.fillRect(0, y, width, 1)
    context.globalAlpha = 1
  }

  draw(time)
}
