import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameSocket } from './GameSocket.js'

class FakeSocket {
  static OPEN = 1
  static instances = []
  readyState = 1
  sent = []
  constructor() {
    FakeSocket.instances.push(this)
  }
  send(data) {
    this.sent.push(JSON.parse(data))
  }
  close() {
    this.onclose?.()
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  FakeSocket.instances = []
})
afterEach(() => vi.useRealTimers())

describe('socket resource ownership', () => {
  it('cancels scheduled reconnects when closed', () => {
    const transport = new GameSocket('ws://test', vi.fn(), vi.fn(), FakeSocket)
    FakeSocket.instances[0].close()
    transport.close()
    vi.runAllTimers()
    expect(FakeSocket.instances).toHaveLength(1)
  })

  it('clears acknowledgement timers and forwards the acknowledged event', async () => {
    const receive = vi.fn()
    const transport = new GameSocket('ws://test', receive, vi.fn(), FakeSocket)
    const pending = transport.send('room.ready', { ready: true })
    const socket = FakeSocket.instances[0]
    const response = {
      type: 'room.snapshot',
      requestId: socket.sent[0].requestId,
      payload: {},
    }
    socket.onmessage({ data: JSON.stringify(response) })
    await expect(pending).resolves.toEqual(response)
    expect(receive).toHaveBeenCalledWith(response)
    expect(vi.getTimerCount()).toBe(0)
    transport.close()
  })

  it('rejects pending requests immediately on cleanup', async () => {
    const transport = new GameSocket('ws://test', vi.fn(), vi.fn(), FakeSocket)
    const rejected = expect(transport.send('room.start')).rejects.toThrow(
      'closed',
    )
    transport.close()
    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })

  it('preserves server error codes for UI recovery flows', async () => {
    const transport = new GameSocket('ws://test', vi.fn(), vi.fn(), FakeSocket)
    const pending = transport.send('room.join', { roomId: 'CLOSED' })
    const socket = FakeSocket.instances[0]
    socket.onmessage({
      data: JSON.stringify({
        type: 'error',
        requestId: socket.sent[0].requestId,
        payload: { code: 'ROOM_CLOSED', message: 'Room has already started' },
      }),
    })
    await expect(pending).rejects.toMatchObject({ code: 'ROOM_CLOSED' })
    transport.close()
  })
})
