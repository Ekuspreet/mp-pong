import { describe, expect, it } from 'vitest'
import { selectRoomState } from './roomSelectors.js'

describe('room launch eligibility', () => {
  const host = { id: 'host', host: true, ready: true }
  const guest = { id: 'guest', host: false, ready: true }
  it('requires the current player to be host and every player ready', () => {
    const room = { members: [host, guest] }
    expect(selectRoomState(room, 'host').canStart).toBe(true)
    expect(selectRoomState(room, 'guest').canStart).toBe(false)
    expect(
      selectRoomState({ members: [host, { ...guest, ready: false }] }, 'host')
        .canStart,
    ).toBe(false)
  })
  it('does not allow a lone host or missing room to launch', () => {
    expect(selectRoomState({ members: [host] }, 'host').canStart).toBe(false)
    expect(selectRoomState(null, 'host')).toEqual({
      members: [],
      member: undefined,
      canStart: false,
    })
  })
})
