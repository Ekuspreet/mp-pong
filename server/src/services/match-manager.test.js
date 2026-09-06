import { describe, expect, it, vi } from 'vitest'
import { createMatchManager } from './match-manager.js'

describe('match manager', () => {
  it('releases a completed match runtime after persisting its result', () => {
    const repository = {
      start: vi.fn(),
      stageStarted: vi.fn(),
      playerEliminated: vi.fn(),
      finish: vi.fn(),
      result: vi.fn(),
      history: vi.fn(),
    }
    const publisher = { broadcast: vi.fn(), send: vi.fn() }
    const manager = createMatchManager(repository, publisher)
    const room = {
      id: 'ROOM01',
      code: 'ROOM01',
      hostId: 'u1',
      status: 'open',
      options: { format: 'elimination', modifiers: [] },
      members: new Map([
        ['u1', { id: 'u1', username: 'Pilot One' }],
        ['u2', { id: 'u2', username: 'Pilot Two' }],
      ]),
    }
    const state = manager.start(room, new Map())

    manager.leave('u2')

    expect(repository.finish).toHaveBeenCalledOnce()
    expect(room.status).toBe('finished')
    expect(manager.matches.has(state.matchId)).toBe(false)
  })
})
