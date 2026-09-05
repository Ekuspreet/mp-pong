import { useEffect, useRef } from 'react'
import { bindKeyboardControls } from './keyboardControls.js'

export default function useMatchControls(channel, status) {
  const sequence = useRef(0)
  useEffect(() => {
    if (status !== 'connected') return
    return bindKeyboardControls(window, (direction) => {
      // Inputs are ephemeral; the connection status communicates transport failure.
      channel
        .send('input.set', { sequence: ++sequence.current, direction })
        .catch(() => {})
    })
  }, [channel, status])
}
