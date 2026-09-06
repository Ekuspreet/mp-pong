import { createMatchRepository } from '../repositories/match-repository.js'
import { createSessionRepository } from '../repositories/session-repository.js'
import { createUserRepository } from '../repositories/user-repository.js'
import { argon2PasswordHasher } from '../security/password-hasher.js'
import { createAuthService } from '../services/auth-service.js'
import { createMatchManager } from '../services/match-manager.js'
import { createRoomRegistry } from '../services/room-service.js'
import { createSessionService } from '../services/session-service.js'
import { createMatchPublisher } from '../transport/match-publisher.js'
import { createSessionCookies } from '../transport/session-cookies.js'

export function createServices(config, db) {
  const userRepository = createUserRepository(db.orm)
  const sessionRepository = createSessionRepository(db.orm)
  const matchRepository = createMatchRepository(db.orm)
  const auth = createAuthService(userRepository, argon2PasswordHasher)
  const sessionStore = createSessionService(
    sessionRepository,
    config.SESSION_DAYS,
  )
  const cookies = createSessionCookies(
    sessionStore,
    config.SESSION_DAYS,
    config.NODE_ENV === 'production',
  )
  const rooms = createRoomRegistry()
  const matches = createMatchManager(matchRepository, createMatchPublisher())
  return { auth, cookies, matchRepository, matches, rooms }
}
