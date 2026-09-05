import { useEffect, useRef } from 'react'
import { drawArena } from './drawArena.js'

export default function GameCanvas({ snapshot }) {
  const canvasRef = useRef(null)
  const snapshotRef = useRef(snapshot)

  useEffect(() => {
    snapshotRef.current = snapshot
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (context)
      drawArena(context, snapshot, canvas.clientWidth, canvas.clientHeight)
  }, [snapshot])

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
        snapshotRef.current,
        canvas.clientWidth,
        canvas.clientHeight,
      )
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    return () => observer.disconnect()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width="1000"
      height="700"
      aria-label="Polygon Pong arena"
    />
  )
}
