import { useEffect, useRef } from 'react'
import { bindKeyboardControls } from './keyboardControls.js'

export function toServerDirection(snapshot, userId, visualDirection) {
  if (!snapshot || visualDirection === 0) return visualDirection
  const localPaddle = snapshot.paddles.find((p) => p.playerId === userId)
  const localSide = localPaddle && snapshot.arena.sides[localPaddle.sideIndex]
  if (!localSide) return visualDirection
  const normalAngle = Math.atan2(
    localSide.inwardNormal.y,
    localSide.inwardNormal.x,
  )
  const rotation = -Math.PI / 2 - normalAngle
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const screenAxisX =
    (localSide.end.x - localSide.start.x) * cos -
    (localSide.end.y - localSide.start.y) * sin
  return screenAxisX >= 0 ? visualDirection : -visualDirection
}

export default function useMatchControls(channel, status, snapshot, userId) {
  const sequence = useRef(0)
  const snapshotRef = useRef(snapshot)
  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    if (status !== 'connected') return
    return bindKeyboardControls(window, (direction) => {
      const serverDirection = toServerDirection(
        snapshotRef.current,
        userId,
        direction,
      )
      // Inputs are ephemeral; the connection status communicates transport failure.
      channel
        .send('input.set', {
          sequence: ++sequence.current,
          direction: serverDirection,
        })
        .catch(() => {})
    })
  }, [channel, status, userId])
}
