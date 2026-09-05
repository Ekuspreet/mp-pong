import { describe, expect, it, vi } from 'vitest'
import { bindKeyboardControls } from './keyboardControls.js'

function setup() {
  const target = new EventTarget()
  const send = vi.fn()
  const cleanup = bindKeyboardControls(target, send)
  const key = (type, value) => {
    const event = new Event(type, { cancelable: true })
    Object.defineProperty(event, 'key', { value })
    target.dispatchEvent(event)
  }
  return { target, send, cleanup, key }
}

describe('match keyboard controls', () => {
  it('keeps moving when one of multiple equivalent keys is released', () => {
    const { key, send, cleanup } = setup()
    key('keydown', 'a')
    key('keydown', 'ArrowLeft')
    key('keyup', 'a')
    expect(send.mock.calls).toEqual([[-1]])
    key('keyup', 'ArrowLeft')
    expect(send.mock.calls).toEqual([[-1], [0]])
    cleanup()
  })

  it('cancels opposing inputs, ignores repeats, and releases on blur and cleanup', () => {
    const { key, send, target, cleanup } = setup()
    key('keydown', 'a')
    key('keydown', 'a')
    key('keydown', 'D')
    key('keyup', 'a')
    target.dispatchEvent(new Event('blur'))
    key('keydown', 'w')
    cleanup()
    key('keydown', 'd')
    expect(send.mock.calls).toEqual([[-1], [0], [1], [0], [-1], [0]])
  })
})
