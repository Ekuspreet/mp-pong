import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { openDatabase, type Db } from './db.js'
import { AuthService } from './auth.js'
import { RoomRegistry } from './rooms.js'
import { MatchManager } from './matches.js'
import { createApp } from './app.js'
import type { Config } from './config.js'

const config: Config = { NODE_ENV: 'test', PORT: 3000, CLIENT_ORIGIN: 'http://localhost:5173', DATABASE_PATH: ':memory:', SESSION_DAYS: 7, LOG_LEVEL: 'silent' }
let db: Db
let matches: MatchManager

beforeEach(() => { db = openDatabase(':memory:'); matches = new MatchManager(db) })
afterEach(() => { matches.close(); db.close() })

function setup() { const auth = new AuthService(db, 7, false), rooms = new RoomRegistry(); return { app: createApp(config, db, { auth, rooms, matches }), rooms } }

describe('authentication API', () => {
  it('creates a guest session that can immediately use protected APIs', async () => {
    const { app } = setup(), agent = request.agent(app)
    const response = await agent.post('/api/auth/guest').send({}).expect(201)
    expect(response.body.user.username).toMatch(/^Guest-[A-F0-9]{6}$/)
    expect(response.body.user.guest).toBe(true)
    expect((await agent.get('/api/auth/me').expect(200)).body.user.guest).toBe(true)
    await agent.post('/api/rooms').send({}).expect(201)
  })

  it('registers, restores, logs out, and protects APIs', async () => {
    const { app } = setup(), agent = request.agent(app)
    await agent.post('/api/auth/register').send({ username: 'Player_1', password: 'password123' }).expect(201)
    expect((await agent.get('/api/auth/me').expect(200)).body.user.username).toBe('Player_1')
    await agent.post('/api/auth/logout').expect(204)
    await agent.get('/api/rooms').expect(401)
    await agent.post('/api/auth/login').send({ username: 'player_1', password: 'password123' }).expect(200)
    await agent.get('/api/auth/me').expect(200)
  })

  it('rejects duplicate usernames and bad credentials', async () => {
    const { app } = setup()
    await request(app).post('/api/auth/register').send({ username: 'Player_2', password: 'password123' }).expect(201)
    await request(app).post('/api/auth/register').send({ username: 'player_2', password: 'password123' }).expect(409)
    await request(app).post('/api/auth/login').send({ username: 'Player_2', password: 'wrongpass' }).expect(401)
  })
})

describe('rooms', () => {
  it('enforces membership, readiness, and host transfer', () => {
    const rooms = new RoomRegistry(), a = { id: 'a', username: 'A', guest: false }, b = { id: 'b', username: 'B', guest: false }
    const room = rooms.create(a); rooms.join(room.id, b); rooms.ready(a.id, true); rooms.ready(b.id, true)
    expect(rooms.canStart(room, a.id)).toBe(true); expect(rooms.canStart(room, b.id)).toBe(false)
    rooms.leave(a.id); expect(room.hostId).toBe(b.id)
  })
})
