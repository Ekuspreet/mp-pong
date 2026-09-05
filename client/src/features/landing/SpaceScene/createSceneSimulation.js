import Matter from 'matter-js'
import { sceneConfig } from '../config/scene.js'
import { makeStars, makeArtifacts } from './sceneObjects.js'

const { Bodies, Body, Composite, Engine, Events, Vector } = Matter

/** Simulation state and physics, independent of React, canvas, and DOM events. */
export function createSceneSimulation({ reduced = false } = {}) {
  const engine = Engine.create({ gravity: { x: 0, y: 0 } })
  let width = 0,
    height = 0,
    stars = [],
    artifacts = [],
    planets = [],
    walls = [],
    balls = [],
    comets = [],
    accumulator = 0,
    spawnElapsed = 0,
    cometElapsed = 0,
    blackHole = null
  const randomCometDelay = () =>
    sceneConfig.comets.minDelayMs +
    Math.random() *
      (sceneConfig.comets.maxDelayMs - sceneConfig.comets.minDelayMs)
  let nextCometDelay = randomCometDelay()
  let blackHoleReadyAt = 0
  let blackHoleSequence = 0
  const pointer = { x: 0, y: 0, active: false }
  const trails = new Map()

  function resize(nextWidth, nextHeight) {
    width = nextWidth
    height = nextHeight
    Composite.clear(engine.world, false)
    balls = []
    comets = []
    trails.clear()
    stars = makeStars(width, height, reduced)
    artifacts = makeArtifacts(width, height, reduced)
    const wallSize = 100
    walls = [
      Bodies.rectangle(
        width / 2,
        -wallSize / 2,
        width + wallSize * 2,
        wallSize,
        { isStatic: true },
      ),
      Bodies.rectangle(
        width / 2,
        height + wallSize / 2,
        width + wallSize * 2,
        wallSize,
        { isStatic: true },
      ),
      Bodies.rectangle(
        -wallSize / 2,
        height / 2,
        wallSize,
        height + wallSize * 2,
        { isStatic: true },
      ),
      Bodies.rectangle(
        width + wallSize / 2,
        height / 2,
        wallSize,
        height + wallSize * 2,
        { isStatic: true },
      ),
    ]
    planets = sceneConfig.planets.map((planet, index) => {
      const scale = width < 700 ? 0.62 : 1
      const body = Bodies.circle(
        planet.x * width,
        planet.y * height,
        planet.radius * scale,
        { isStatic: true, restitution: 1, label: `planet-${index}` },
      )
      body.visual = planet
      return body
    })
    Composite.add(engine.world, [...walls, ...planets])
    if (!reduced)
      for (let index = 0; index < Math.min(7, maxBalls()); index++)
        spawnBall(index % planets.length)
  }

  function orbitPlanets(time) {
    planets.forEach((body) => {
      const orbit = body.visual.orbit,
        angle = orbit.phase + time * orbit.speed
      let x = (orbit.centerX + Math.cos(angle) * orbit.radiusX) * width
      let y = (orbit.centerY + Math.sin(angle) * orbit.radiusY) * height
      if (blackHole) {
        const pulse = blackHoleIntensity(time)
        x += (blackHole.x - x) * pulse * 0.12
        y += (blackHole.y - y) * pulse * 0.12
      }
      Body.setPosition(body, { x, y })
    })
  }

  function beginBlackHole(time) {
    const position =
      sceneConfig.blackHole.positions[
        blackHoleSequence % sceneConfig.blackHole.positions.length
      ]
    blackHoleSequence += 1
    blackHole = {
      x: width * position.x,
      y: height * position.y,
      startedAt: time,
    }
  }

  function blackHoleIntensity(time) {
    if (!blackHole) return 0
    const progress = Math.min(
      1,
      Math.max(
        0,
        (time - blackHole.startedAt) / sceneConfig.blackHole.durationMs,
      ),
    )
    if (progress < 0.24) {
      const intro = progress / 0.24
      return 1 - Math.pow(1 - intro, 3)
    }
    if (progress > 0.7) {
      const exit = (progress - 0.7) / 0.3
      return Math.pow(1 - exit, 3)
    }
    return 1
  }

  function updateBlackHole(time) {
    if (
      !blackHole &&
      balls.length >= sceneConfig.blackHole.triggerBallCount &&
      time >= blackHoleReadyAt
    )
      beginBlackHole(time)
    if (!blackHole) return
    const elapsed = time - blackHole.startedAt
    if (elapsed >= sceneConfig.blackHole.durationMs) {
      blackHole = null
      blackHoleReadyAt = time + sceneConfig.blackHole.cooldownMs
      stars = makeStars(width, height, reduced)
      while (!reduced && balls.length < Math.min(7, maxBalls()))
        spawnBall(balls.length % planets.length)
      return
    }
    const intensity = blackHoleIntensity(time)
    balls.slice().forEach((ball) => {
      const toward = Vector.sub(blackHole, ball.position),
        distance = Math.max(18, Vector.magnitude(toward))
      if (distance < 30 + intensity * 34) {
        Composite.remove(engine.world, ball)
        balls = balls.filter((item) => item !== ball)
        trails.delete(ball.id)
        return
      }
      if (distance < sceneConfig.blackHole.pullRadius)
        Body.applyForce(
          ball,
          ball.position,
          Vector.mult(
            Vector.normalise(toward),
            0.00032 *
              ball.mass *
              intensity *
              (sceneConfig.blackHole.pullRadius / distance),
          ),
        )
    })
  }

  const maxBalls = () =>
    width < 720 ? sceneConfig.mobileBallLimit : sceneConfig.desktopBallLimit
  function spawnBall(planetIndex = Math.floor(Math.random() * planets.length)) {
    if (reduced || balls.length >= maxBalls()) return
    const planet = planets[planetIndex],
      angle = Math.random() * Math.PI * 2,
      radius = 7 + Math.random() * 7
    const offset = planet.circleRadius + radius + 7
    const ball = Bodies.circle(
      planet.position.x + Math.cos(angle) * offset,
      planet.position.y + Math.sin(angle) * offset,
      radius,
      {
        restitution: 0.98,
        friction: 0,
        frictionAir: 0.0007,
        density: 0.0015,
        label: 'pong-ball',
      },
    )
    ball.renderColor =
      sceneConfig.colors[planetIndex % sceneConfig.colors.length]
    Body.setVelocity(ball, {
      x: Math.cos(angle) * (3.2 + Math.random() * 2.7),
      y: Math.sin(angle) * (3.2 + Math.random() * 2.7),
    })
    balls.push(ball)
    trails.set(ball.id, [])
    Composite.add(engine.world, ball)
  }

  function spawnComet() {
    if (reduced || comets.length >= sceneConfig.comets.maxVisible) return
    const fromTop = Math.random() > 0.45
    const speed = 380 + Math.random() * 180
    const angle = 0.48 + Math.random() * 0.28
    comets.push({
      x: fromTop ? Math.random() * width * 0.8 : -50,
      y: fromTop ? -40 : Math.random() * height * 0.42,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: 55 + Math.random() * 65,
      color: Math.random() > 0.55 ? '#f7e8c6' : '#70b7b5',
    })
  }

  function updateComets(delta) {
    const seconds = delta / 1000
    comets.forEach((comet) => {
      comet.x += comet.vx * seconds
      comet.y += comet.vy * seconds
    })
    comets = comets.filter(
      (comet) =>
        comet.x < width + comet.length && comet.y < height + comet.length,
    )
  }

  function step(now, delta) {
    if (!reduced) {
      accumulator += delta
      spawnElapsed += delta
      cometElapsed += delta
      updateComets(delta)
      updateBlackHole(now)
      orbitPlanets(now)
      while (accumulator >= sceneConfig.fixedStepMs) {
        if (pointer.active)
          balls.forEach((ball) => {
            const toward = Vector.sub(pointer, ball.position),
              distance = Math.max(Vector.magnitude(toward), 80)
            Body.applyForce(
              ball,
              ball.position,
              Vector.mult(
                Vector.normalise(toward),
                0.000018 * ball.mass * Math.min(3, 500 / distance),
              ),
            )
          })
        Engine.update(engine, sceneConfig.fixedStepMs)
        accumulator -= sceneConfig.fixedStepMs
      }
      if (!blackHole && spawnElapsed >= sceneConfig.spawnEveryMs) {
        spawnElapsed = 0
        spawnBall()
      }
      if (!blackHole && cometElapsed >= nextCometDelay) {
        cometElapsed = 0
        nextCometDelay = randomCometDelay()
        spawnComet()
      }
    }
    balls.forEach((ball) => {
      const trail = trails.get(ball.id)
      trail.push({ x: ball.position.x, y: ball.position.y })
      if (trail.length > 16) trail.shift()
    })
  }
  function pulse(x, y) {
    if (reduced) return
    balls.forEach((ball) => {
      const away = Vector.sub(ball.position, { x: x, y: y }),
        distance = Math.max(Vector.magnitude(away), 45)
      Body.applyForce(
        ball,
        ball.position,
        Vector.mult(
          Vector.normalise(away),
          0.0025 * ball.mass * Math.min(1.8, 180 / distance),
        ),
      )
    })
  }
  return {
    resize,
    step,
    pulse,
    movePointer(x, y) {
      Object.assign(pointer, { x, y, active: true })
    },
    clearPointer() {
      pointer.active = false
    },
    getState: () => ({
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
    }),
    dispose() {
      Events.off(engine)
      Composite.clear(engine.world, false)
      Engine.clear(engine)
    },
  }
}
