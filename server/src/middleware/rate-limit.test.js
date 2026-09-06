import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRateLimit } from './rate-limit.js'

describe('createRateLimit', () => {
  afterEach(() => vi.useRealTimers())

  it('limits a client only within the configured window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const limit = createRateLimit({ windowMs: 1_000, max: 2 })
    const request = { ip: '127.0.0.1' }
    const next = vi.fn()

    limit(request, {}, next)
    limit(request, {}, next)
    expect(() => limit(request, {}, next)).toThrow(/Too many requests/)
    expect(next).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(1_000)
    limit(request, {}, next)
    expect(next).toHaveBeenCalledTimes(3)
  })
})
