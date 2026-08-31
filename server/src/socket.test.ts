import { createServer, type Server } from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import WebSocket from 'ws'
import { createApp } from './app.js'
import { AuthService } from './auth.js'
import type { Config } from './config.js'
import { openDatabase, type Db } from './db.js'
import { MatchManager } from './matches.js'
import { RoomRegistry } from './rooms.js'
import { attachWebSockets } from './ws.js'

const config: Config = { NODE_ENV: 'test', PORT: 3000, CLIENT_ORIGIN: 'http://localhost', DATABASE_PATH: ':memory:', SESSION_DAYS: 7, LOG_LEVEL: 'silent' }
let db: Db, server: Server, matches: MatchManager, rooms: RoomRegistry, auth: AuthService
beforeEach(() => { db = openDatabase(':memory:'); matches = new MatchManager(db); rooms = new RoomRegistry(); auth = new AuthService(db, 7, false); server = createServer(createApp(config, db, { auth, rooms, matches })); attachWebSockets(server, auth, rooms, matches) })
afterEach(async () => { matches.close(); await new Promise((resolve) => server.close(resolve)); db.close() })
const next = (socket: WebSocket, type: string) => new Promise<any>((resolve, reject) => { const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 2000); const handler = (data: WebSocket.RawData) => { const message = JSON.parse(data.toString()); if (message.type === type) { clearTimeout(timeout); socket.off('message', handler); resolve(message) } }; socket.on('message', handler) })
const command = async (socket: WebSocket, type: string, payload = {}) => { const requestId = crypto.randomUUID(), received = next(socket, 'ack'); socket.send(JSON.stringify({ type, payload, requestId })); return received }
const responseCookie = (response: request.Response): string => { const values = response.headers['set-cookie']; if (!values?.[0]) throw new Error('Missing session cookie'); return String(values[0]).split(';')[0]! }

describe('WebSocket rooms and matches', () => {
  it('authenticates two clients and starts an authoritative match', async () => {
    await new Promise<void>((resolve) => server.listen(0, resolve)); const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port')
    const register = async (username: string) => responseCookie(await request(server).post('/api/auth/register').send({ username, password: 'password123' }))
    const cookieA = await register('SocketA'), cookieB = await register('SocketB')
    const roomResponse = await request(server).post('/api/auth/login').send({ username: 'SocketA', password: 'password123' }); const loginCookie = responseCookie(roomResponse)
    const created = await request(server).post('/api/rooms').set('Cookie', loginCookie).send({}); const roomId = String(created.body.room.id)
    const connect = async (cookie: string) => { const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws`, { headers: { Cookie: cookie } }); await next(socket, 'server.hello'); return socket }
    const a = await connect(cookieA), b = await connect(cookieB)
    await command(a, 'room.join', { roomId }); await command(b, 'room.join', { roomId }); await command(a, 'room.ready', { ready: true }); await command(b, 'room.ready', { ready: true })
    const startedA = next(a, 'match.started'), startedB = next(b, 'match.started'); await command(a, 'room.start')
    expect((await startedA).payload.phase).toBe('countdown'); expect((await startedB).payload.players).toHaveLength(2)
    a.close(); b.close()
  })
})
