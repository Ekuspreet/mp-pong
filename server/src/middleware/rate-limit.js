import { createAppError } from '../errors/app-error.js'

export function createRateLimit({ windowMs, max, maxEntries = 10_000 }) {
  const attempts = new Map()
  const pruneExpired = (now) => {
    attempts.forEach((attempt, key) => {
      if (now - attempt.startedAt >= windowMs) attempts.delete(key)
    })
  }
  const evictOldest = () => {
    let oldestKey
    let oldestStartedAt = Infinity
    attempts.forEach((attempt, key) => {
      if (attempt.startedAt < oldestStartedAt) {
        oldestKey = key
        oldestStartedAt = attempt.startedAt
      }
    })
    if (oldestKey) attempts.delete(oldestKey)
  }
  return (request, _response, next) => {
    const now = Date.now()
    const key = request.ip ?? request.socket?.remoteAddress ?? 'unknown'
    if (attempts.size >= maxEntries && !attempts.has(key)) pruneExpired(now)
    if (attempts.size >= maxEntries && !attempts.has(key)) evictOldest()
    const current = attempts.get(key)
    const window =
      current && now - current.startedAt < windowMs
        ? current
        : { startedAt: now, count: 0 }
    window.count++
    attempts.set(key, window)
    if (window.count > max)
      throw createAppError(
        'RATE_LIMITED',
        'Too many requests. Please try again shortly.',
        429,
      )
    next()
  }
}
