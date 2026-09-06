import { createServer } from 'node:http'
import { createApp } from './app.js'
import { createServices } from './config/container.js'
import { loadConfig } from './config/environment.js'
import { openDatabase } from './database/connection.js'
import { attachWebSockets } from './ws.js'
import { createLogger } from './logging/logger.js'

const config = loadConfig()
const logger = createLogger(config)
const db = openDatabase(config.DATABASE_PATH)
const services = createServices(config, db)
const app = createApp(config, db, services, logger)
const server = createServer(app)
const webSockets = attachWebSockets(
  server,
  services.cookies,
  services.rooms,
  services.matches,
  logger,
  config,
)

server.on('error', (error) =>
  logger.error({ err: error }, 'HTTP server failed'),
)

server.listen(config.PORT, () =>
  logger.info({ port: config.PORT }, 'Server listening'),
)

let shuttingDown = false
const shutdown = (exitCode = 0) => {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ exitCode }, 'Server shutting down')
  services.matches.close()
  webSockets.close()
  server.close(() => {
    db.close()
    process.exit(exitCode)
  })
  setTimeout(() => process.exit(1), 5_000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception')
  shutdown(1)
})
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection')
  shutdown(1)
})
