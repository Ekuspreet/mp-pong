import { useEffect, useRef } from 'react'
import { createSpaceScene } from './createSpaceScene.js'

export default function SpaceScene() {
  const canvasRef = useRef(null)
  useEffect(() => createSpaceScene(canvasRef.current), [])
  return <canvas ref={canvasRef} className="space-scene" aria-hidden="true" />
}
