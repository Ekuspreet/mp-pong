import { describe, expect, it, vi } from 'vitest'
import { RoomRegistry, snapshotRoom } from './rooms.js'

const host = { id: 'host', username: 'Host', guest: true }
const guest = { id: 'guest', username: 'Guest', guest: true }

describe('canonical room codes', () => {
  it('uses the six-character code as the registry key and public identifier', () => {
    const registry = new RoomRegistry()
    const room = registry.create(host)
    expect(room.id).toMatch(/^[A-Z0-9]{6}$/)
    expect(room.code).toBe(room.id)
    expect(registry.rooms.get(room.code)).toBe(room)
    expect(snapshotRoom(room)).toMatchObject({ id: room.id, code: room.id })
    expect(registry.membership.get(host.id)).toBe(room.code)
    expect(registry.join(room.code.toLowerCase(), guest)).toBe(room)
    registry.ready(host.id, true)
    registry.ready(guest.id, true)
    expect(registry.canStart(room, host.id)).toBe(true)
  })

  it('retries a collision without overwriting the existing room', () => {
    const generate = vi.fn().mockReturnValueOnce('ABC123').mockReturnValueOnce('ABC123').mockReturnValueOnce('XYZ789')
    const registry = new RoomRegistry(generate)
    const first = registry.create(host)
    const second = registry.create(guest)
    expect(first.id).toBe('ABC123')
    expect(second.id).toBe('XYZ789')
    expect(registry.find(' abc123 ')).toBe(first)
    expect(registry.rooms.size).toBe(2)
  })

  it('bounds collision retries and does not leave an orphan room on duplicate creation', () => {
    const registry = new RoomRegistry(() => 'ABC123')
    registry.create(host)
    expect(() => registry.create(host)).toThrow('Leave the current room first')
    expect(() => registry.create(guest)).toThrow('Could not allocate a room code')
    expect(registry.rooms.size).toBe(1)
    expect(registry.membership.has(guest.id)).toBe(false)
  })
})
