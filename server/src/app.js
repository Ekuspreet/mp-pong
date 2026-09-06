import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { createAuthController } from './controllers/auth-controller.js'
import { createHealthController } from './controllers/health-controller.js'
import { createMatchController } from './controllers/match-controller.js'
import { createRoomController } from './controllers/room-controller.js'
import { createErrorHandler } from './middleware/error-handler.js'
import { createRateLimit } from './middleware/rate-limit.js'
import { createLogger } from './logging/logger.js'
import { requireUser } from './middleware/authentication.js'
import { authRoutes } from './routes/auth-routes.js'
import { healthRoutes } from './routes/health-routes.js'
import { matchRoutes } from './routes/match-routes.js'
import { roomRoutes } from './routes/room-routes.js'

export function createApp(config, db, services, logger = createLogger(config)) {
  const app = express()
  const authenticate = requireUser(services.cookies)

  app.disable('x-powered-by')
  app.use(pinoHttp({ logger }))
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }))
  app.use(express.json({ limit: '16kb' }))
  app.use('/health', healthRoutes(createHealthController(db.healthCheck)))
  app.use(
    '/api/auth',
    createRateLimit({ windowMs: 60_000, max: 30 }),
    authRoutes(
      createAuthController(services.auth, services.cookies),
      authenticate,
    ),
  )
  app.use(
    '/api/rooms',
    roomRoutes(createRoomController(services.rooms), authenticate),
  )
  app.use(
    '/api/matches',
    matchRoutes(createMatchController(services.matchRepository), authenticate),
  )

  const clientDist = fileURLToPath(
    new URL('../../client/dist/', import.meta.url),
  )
  if (config.NODE_ENV === 'production' && existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get('/{*splat}', (_request, response) =>
      response.sendFile(
        fileURLToPath(new URL('index.html', `file://${clientDist}/`)),
      ),
    )
  }
  app.use(createErrorHandler(logger))
  return app
}
