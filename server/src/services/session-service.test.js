import { describe, expect, it, vi } from 'vitest'
import { createSessionService } from './session-service.js'

describe('session service', () => {
  it('cleans expired sessions before issuing a new token', () => {
    const sessions = {
      create: vi.fn(),
      purgeExpired: vi.fn(),
      findUser: vi.fn(),
      revoke: vi.fn(),
    }
    const service = createSessionService(sessions, 7, () => 1_000)

    service.create('u1')

    expect(sessions.purgeExpired).toHaveBeenCalledWith(1_000)
    expect(sessions.create).toHaveBeenCalledWith(
      expect.any(String),
      'u1',
      expect.any(String),
      1_000,
      604_801_000,
    )
  })
})
