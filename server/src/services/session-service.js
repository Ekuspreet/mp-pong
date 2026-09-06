import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { SECONDS_PER_DAY } from '../constants/auth.js'
const hashToken = (token) => createHash('sha256').update(token).digest('hex')

export function createSessionService(sessions, sessionDays, clock = Date.now) {
  const create = (userId) => {
    const token = randomBytes(32).toString('base64url')
    const now = clock()
    sessions.purgeExpired(now)
    sessions.create(
      randomUUID(),
      userId,
      hashToken(token),
      now,
      now + sessionDays * SECONDS_PER_DAY * 1000,
    )
    return token
  }
  return {
    create,
    resolve: (token) =>
      token ? sessions.findUser(hashToken(token), clock()) : null,
    revoke: (token) => {
      if (token) sessions.revoke(hashToken(token), clock())
    },
  }
}
