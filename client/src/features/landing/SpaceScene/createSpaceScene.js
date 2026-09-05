import { createSceneSimulation } from './createSceneSimulation.js'
import { drawSpaceScene } from './drawSpaceScene.js'

/** Browser adapter: owns sizing, animation scheduling, and input subscriptions. */
export function createSpaceScene(canvas) {
  const context = canvas.getContext('2d')
  if (!context) return undefined
  const simulation = createSceneSimulation({
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  })
  let frame = 0
  let previous = performance.now()
  let visible = !document.hidden

  const rebuild = () => {
    const { width, height } = canvas.getBoundingClientRect()
    const ratio = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    simulation.resize(width, height)
  }
  const tick = (now) => {
    const delta = Math.min(now - previous, 50)
    previous = now
    if (visible) simulation.step(now, delta)
    drawSpaceScene(context, now, simulation.getState())
    frame = requestAnimationFrame(tick)
  }
  const onPointerMove = (event) =>
    simulation.movePointer(event.clientX, event.clientY)
  const onPointerLeave = () => simulation.clearPointer()
  const onPulse = (event) => {
    if (!event.target.closest('a, button, input'))
      simulation.pulse(event.clientX, event.clientY)
  }
  const onVisibility = () => {
    visible = !document.hidden
    previous = performance.now()
  }
  const resizeObserver = new ResizeObserver(rebuild)
  resizeObserver.observe(canvas)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onPointerLeave)
  window.addEventListener('pointerdown', onPulse)
  document.addEventListener('visibilitychange', onVisibility)
  rebuild()
  frame = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    window.removeEventListener('pointermove', onPointerMove)
    document.documentElement.removeEventListener('pointerleave', onPointerLeave)
    window.removeEventListener('pointerdown', onPulse)
    document.removeEventListener('visibilitychange', onVisibility)
    simulation.dispose()
  }
}
