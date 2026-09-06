import { describe, expect, it, vi } from 'vitest'
import { bindKeyboardControls } from './keyboardControls.js'
import { toServerDirection } from './useMatchControls.js'

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

  it('maps visual left and right to each player rotated arena view', () => {
    const snapshot = {
      arena: {
        type: 'polygon',
        sides: [
          {
            start: { x: -400, y: 400 },
            end: { x: -400, y: -400 },
            inwardNormal: { x: 1, y: 0 },
          },
          {
            start: { x: 400, y: -400 },
            end: { x: 400, y: 400 },
            inwardNormal: { x: -1, y: 0 },
          },
        ],
      },
      paddles: [
        { playerId: 'a', sideIndex: 0 },
        { playerId: 'b', sideIndex: 1 },
      ],
    }

    expect(toServerDirection(snapshot, 'a', -1)).toBe(1)
    expect(toServerDirection(snapshot, 'a', 1)).toBe(-1)
    expect(toServerDirection(snapshot, 'b', -1)).toBe(1)
    expect(toServerDirection(snapshot, 'b', 1)).toBe(-1)
    expect(toServerDirection(snapshot, 'a', 0)).toBe(0)
  })

  it('maps duel controls to the player-relative bottom paddle view', () => {
    const snapshot = {
      arena: {
        type: 'duel',
        sides: [
          {
            start: { x: -400, y: 400 },
            end: { x: -400, y: -400 },
            inwardNormal: { x: 1, y: 0 },
          },
          {
            start: { x: -400, y: -400 },
            end: { x: 400, y: -400 },
            inwardNormal: { x: 0, y: 1 },
          },
          {
            start: { x: 400, y: -400 },
            end: { x: 400, y: 400 },
            inwardNormal: { x: -1, y: 0 },
          },
          {
            start: { x: 400, y: 400 },
            end: { x: -400, y: 400 },
            inwardNormal: { x: 0, y: -1 },
          },
        ],
      },
      paddles: [
        { playerId: 'a', sideIndex: 0 },
        { playerId: 'b', sideIndex: 2 },
      ],
    }

    expect(toServerDirection(snapshot, 'a', -1)).toBe(1)
    expect(toServerDirection(snapshot, 'a', 1)).toBe(-1)
    expect(toServerDirection(snapshot, 'b', -1)).toBe(1)
    expect(toServerDirection(snapshot, 'b', 1)).toBe(-1)
  })
})
