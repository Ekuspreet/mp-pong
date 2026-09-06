import { eq } from 'drizzle-orm'
import { users } from '../database/schema.js'
import { createAppError } from '../errors/app-error.js'

export function createUserRepository(db) {
  const create = (user, normalized, passwordHash, now) => {
    try {
      db.insert(users)
        .values({
          id: user.id,
          usernameNormalized: normalized,
          username: user.username,
          passwordHash,
          isGuest: user.guest,
          createdAt: now,
          lastSeenAt: now,
        })
        .run()
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE')
        throw createAppError(
          'USERNAME_TAKEN',
          user.guest
            ? 'That GamerName is already in orbit'
            : 'GamerName is already registered',
          409,
        )
      throw error
    }
  }
  const findCredentials = (normalized) =>
    db
      .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        guest: users.isGuest,
      })
      .from(users)
      .where(eq(users.usernameNormalized, normalized))
      .get()
  return { create, findCredentials }
}
