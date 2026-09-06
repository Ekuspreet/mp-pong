import { and, eq, gt, isNull, lt } from 'drizzle-orm'
import { sessions, users } from '../database/schema.js'

export function createSessionRepository(db) {
  const create = (id, userId, tokenHash, now, expiresAt) =>
    db
      .insert(sessions)
      .values({
        id,
        userId,
        tokenHash,
        createdAt: now,
        expiresAt,
        lastUsedAt: now,
      })
      .run()
  const findUser = (tokenHash, now) =>
    db
      .select({ id: users.id, username: users.username, guest: users.isGuest })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
        ),
      )
      .get() ?? null
  const revoke = (tokenHash, now) =>
    db
      .update(sessions)
      .set({ revokedAt: now })
      .where(eq(sessions.tokenHash, tokenHash))
      .run()
  const purgeExpired = (now) =>
    db.delete(sessions).where(lt(sessions.expiresAt, now)).run()
  return { create, findUser, revoke, purgeExpired }
}
