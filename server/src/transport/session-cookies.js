import { parse, serialize } from 'cookie'
import { SECONDS_PER_DAY, SESSION_COOKIE_NAME } from '../constants/auth.js'

export function createSessionCookies(sessions, sessionDays, production) {
  const serializeToken = (token, maxAge) =>
    serialize(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: production,
      path: '/',
      maxAge,
    })
  return {
    userFromCookie: (header) =>
      sessions.resolve(parse(header ?? '')[SESSION_COOKIE_NAME]),
    create: (userId) =>
      serializeToken(sessions.create(userId), sessionDays * SECONDS_PER_DAY),
    clear: (header) => {
      sessions.revoke(parse(header ?? '')[SESSION_COOKIE_NAME])
      return serializeToken('', 0)
    },
  }
}
