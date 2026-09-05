import { describe, expect, it, vi } from 'vitest'
import { createGameChannel } from './createGameChannel.js'

function setup() {
  const connections = []
  const factory = vi.fn((onMessage, onStatus) => {
    const connection = {
      onMessage,
      onStatus,
      send: vi.fn().mockResolvedValue({}),
      close: vi.fn(),
    }
    connections.push(connection)
    return connection
  })
  return { channel: createGameChannel(factory), connections, factory }
}

describe('game channel lifecycle', () => {
  it('delivers consecutive events, caches snapshots, and removes subscriptions', () => {
    const { channel, connections } = setup()
    const receive = vi.fn()
    const unsubscribe = channel.subscribe(receive)
    channel.start()
    const events = [
      { type: 'room.snapshot', payload: {} },
      { type: 'match.started', payload: { matchId: 'm1' } },
    ]
    events.forEach(connections[0].onMessage)
    expect(receive.mock.calls.map(([message]) => message)).toEqual(events)
    expect(channel.getLatest('match.started')).toBe(events[1])
    unsubscribe()
    connections[0].onMessage(events[0])
    expect(receive).toHaveBeenCalledTimes(2)
  })

  it('closes once, rejects disconnected commands, and ignores events from a previous lifecycle', async () => {
    const { channel, connections, factory } = setup()
    channel.start()
    channel.start()
    expect(factory).toHaveBeenCalledTimes(1)
    connections[0].onStatus('connected')
    channel.stop()
    expect(connections[0].close).toHaveBeenCalledTimes(1)
    expect(channel.getStatus()).toBe('disconnected')
    await expect(channel.send('room.join')).rejects.toThrow('not connected')
    channel.start()
    connections[0].onMessage({
      type: 'room.snapshot',
      payload: { id: 'stale' },
    })
    connections[0].onStatus('connected')
    expect(channel.getLatest('room.snapshot')).toBeUndefined()
    expect(channel.getStatus()).toBe('disconnected')
    connections[1].onStatus('connected')
    expect(channel.getStatus()).toBe('connected')
  })
})
