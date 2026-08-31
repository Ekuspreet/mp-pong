import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import pino from 'pino'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Config } from './config.js'
import type { Db } from './db.js'
import { AuthService, type AuthUser } from './auth.js'
import { RoomRegistry, snapshotRoom } from './rooms.js'
import type { MatchManager } from './matches.js'

export interface Services { auth: AuthService; rooms: RoomRegistry; matches: MatchManager }
const requireUser = (auth: AuthService) => (request: Request, response: Response, next: NextFunction) => { const user = auth.userFromRequest(request); if (!user) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } }); (request as Request & { user: AuthUser }).user = user; next() }
const userOf = (request: Request) => (request as Request & { user: AuthUser }).user

export function createApp(config: Config, db: Db, services: Services) {
  const app = express(); const logger = pino({ level: config.LOG_LEVEL, enabled: config.NODE_ENV !== 'test' })
  app.disable('x-powered-by'); app.use(pinoHttp({ logger })); app.use(helmet({ contentSecurityPolicy: false })); app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true })); app.use(express.json({ limit: '16kb' }))
  app.get('/health/live', (_req, res) => res.json({ status: 'ok' })); app.get('/health/ready', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ready' }) })
  app.post('/api/auth/register', async (req, res, next) => { try { const user = await services.auth.register(String(req.body?.username ?? ''), String(req.body?.password ?? '')); services.auth.createSession(user.id, res); res.status(201).json({ user }) } catch (e) { next(e) } })
  app.post('/api/auth/login', async (req, res, next) => { try { const user = await services.auth.login(String(req.body?.username ?? ''), String(req.body?.password ?? '')); services.auth.createSession(user.id, res); res.json({ user }) } catch (e) { next(e) } })
  app.post('/api/auth/logout', (req, res) => { services.auth.logout(req, res); res.status(204).end() })
  app.get('/api/auth/me', requireUser(services.auth), (req, res) => res.json({ user: userOf(req) }))
  app.get('/api/rooms', requireUser(services.auth), (_req, res) => res.json({ rooms: services.rooms.list() }))
  app.post('/api/rooms', requireUser(services.auth), (req, res, next) => { try { res.status(201).json({ room: snapshotRoom(services.rooms.create(userOf(req), req.body?.visibility === 'private' ? 'private' : 'public')) }) } catch (e) { next(e) } })
  app.get('/api/rooms/:id', requireUser(services.auth), (req, res) => { const id = String(req.params.id); const room = services.rooms.rooms.get(id) ?? [...services.rooms.rooms.values()].find((r) => r.code === id.toUpperCase()); return room ? res.json({ room: snapshotRoom(room) }) : res.status(404).json({ error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } }) })
  app.get('/api/matches', requireUser(services.auth), (req, res) => res.json({ matches: services.matches.history(userOf(req).id) }))
  app.get('/api/matches/:id', requireUser(services.auth), (req, res) => { const result = services.matches.result(String(req.params.id)); return result ? res.json(result) : res.status(404).json({ error: { code: 'MATCH_NOT_FOUND', message: 'Match not found' } }) })
  const clientDist = resolve(process.cwd(), 'client/dist')
  if (config.NODE_ENV === 'production' && existsSync(clientDist)) { app.use(express.static(clientDist)); app.get('/{*splat}', (_req, res) => res.sendFile(resolve(clientDist, 'index.html'))) }
  app.use((error: Error & { status?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) => res.status(error.status ?? 500).json({ error: { code: error.code ?? 'INTERNAL_ERROR', message: error.status ? error.message : 'Unexpected server error' } }))
  return app
}

export function createServices(config: Config, db: Db): Services { const auth = new AuthService(db, config.SESSION_DAYS, config.NODE_ENV === 'production'); const rooms = new RoomRegistry(); return { auth, rooms, matches: undefined as unknown as MatchManager } }
