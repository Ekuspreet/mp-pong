import { useEffect, useRef } from 'react'
import { drawArena } from './drawArena.js'

export default function GameCanvas({ snapshot, userId }) {
  const canvasRef = useRef(null)
  const targetRef = useRef(snapshot)
  const visualRef = useRef(snapshot)

  useEffect(() => {
    targetRef.current = snapshot
    if (!visualRef.current || visualRef.current.stage !== snapshot.stage)
      visualRef.current = snapshot
  }, [snapshot, userId])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * ratio
      canvas.height = canvas.clientHeight * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      drawArena(
        context,
        visualRef.current,
        canvas.clientWidth,
        canvas.clientHeight,
        userId,
      )
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    return () => observer.disconnect()
  }, [userId])

  useEffect(() => {
    let frame
    const render = () => {
      const canvas = canvasRef.current
      const target = targetRef.current
      const visual = visualRef.current
      if (canvas && target && visual) {
        const context = canvas.getContext('2d')
        if (context) {
          visualRef.current = interpolateSnapshot(visual, target, 0.24)
          drawArena(
            context,
            visualRef.current,
            canvas.clientWidth,
            canvas.clientHeight,
            userId,
          )
        }
      }
      frame = window.requestAnimationFrame(render)
    }
    frame = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(frame)
  }, [userId])

  return (
    <canvas
      ref={canvasRef}
      width="900"
      height="900"
      aria-label="Polygon Pong arena"
    />
  )
}

function interpolateSnapshot(current, target, amount) {
  if (current.stage !== target.stage) return target
  const lerp = (from, to) => from + (to - from) * amount
  return {
    ...target,
    ball: {
      ...target.ball,
      position: {
        x: lerp(current.ball.position.x, target.ball.position.x),
        y: lerp(current.ball.position.y, target.ball.position.y),
      },
    },
    paddles: target.paddles.map((paddle) => {
      const previous = current.paddles.find(
        (item) => item.playerId === paddle.playerId,
      )
      return previous
        ? { ...paddle, position: lerp(previous.position, paddle.position) }
        : paddle
    }),
  }
}
