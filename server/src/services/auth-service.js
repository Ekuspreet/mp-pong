import { randomBytes, randomUUID } from 'node:crypto'
import { GUEST_ALLOCATION_ATTEMPTS } from '../constants/auth.js'
import { createAppError } from '../errors/app-error.js'
import {
  normalizeUsername,
  validateCredentials,
  validateGuestName,
} from '../validation/auth.js'

export function createAuthService(users, passwords) {
  const register = async (username, password) => {
    const display = username.trim()
    validateCredentials(display, password)
    const user = { id: randomUUID(), username: display, guest: false }
    users.create(
      user,
      normalizeUsername(display),
      await passwords.hash(password),
      Date.now(),
    )
    return user
  }
  const login = async (username, password) => {
    const user = users.findCredentials(normalizeUsername(username))
    if (
      !user ||
      user.guest ||
      !(await passwords.verify(user.passwordHash, password))
    )
      throw createAppError(
        'INVALID_CREDENTIALS',
        'Invalid username or password',
        401,
      )
    return { id: user.id, username: user.username, guest: user.guest }
  }
  const createGuest = (requestedUsername) => {
    const requested = requestedUsername?.trim()
    validateGuestName(requested)
    for (let attempt = 0; attempt < GUEST_ALLOCATION_ATTEMPTS; attempt++) {
      const username =
        requested ?? `Guest-${randomBytes(3).toString('hex').toUpperCase()}`
      const user = { id: randomUUID(), username, guest: true }
      try {
        users.create(
          user,
          normalizeUsername(username),
          'guest-account',
          Date.now(),
        )
        return user
      } catch (error) {
        if (requested !== undefined || error.code !== 'USERNAME_TAKEN')
          throw error
      }
    }
    throw createAppError(
      'GUEST_UNAVAILABLE',
      'Could not allocate a guest account',
      503,
    )
  }
  return { register, login, createGuest }
}
