import { createServer } from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import WebSocket from 'ws'
import { createApp } from './app.js'
import { openDatabase } from './database/connection.js'
import { createServices } from './config/container.js'
import { attachWebSockets } from './ws.js'
const config = {
  NODE_ENV: 'test',
  PORT: 3e3,
  CLIENT_ORIGIN: 'http://localhost',
  DATABASE_PATH: ':memory:',
  SESSION_DAYS: 7,
  LOG_LEVEL: 'silent',
}
let db, server, matches, rooms, cookies
beforeEach(() => {
  db = openDatabase(':memory:')
  const services = createServices(config, db)
  ;({ matches, rooms, cookies } = services)
  server = createServer(createApp(config, db, services))
  attachWebSockets(server, cookies, rooms, matches)
})
afterEach(async () => {
  matches.close()
  await new Promise((resolve) => server.close(resolve))
  db.close()
})
const next = (socket, type) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for ${type}`)),
      2e3,
    )
    const handler = (data) => {
      const message = JSON.parse(data.toString())
      if (message.type === type) {
        clearTimeout(timeout)
        socket.off('message', handler)
        resolve(message)
      }
    }
    socket.on('message', handler)
  })
const command = async (socket, type, payload = {}) => {
  const requestId = crypto.randomUUID(),
    received = next(socket, 'ack')
  socket.send(JSON.stringify({ type, payload, requestId }))
  return received
}
const responseCookie = (response) => {
  const values = response.headers['set-cookie']
  if (!values?.[0]) throw new Error('Missing session cookie')
  return String(values[0]).split(';')[0]
}
describe('WebSocket rooms and matches', () => {
  it('authenticates two clients and starts an authoritative match', async () => {
    await new Promise((resolve) => server.listen(0, resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No port')
    const register = async (username) =>
      responseCookie(
        await request(server)
          .post('/api/auth/register')
          .send({ username, password: 'password123' }),
      )
    const cookieA = await register('SocketA'),
      cookieB = await register('SocketB')
    const roomResponse = await request(server)
      .post('/api/auth/login')
      .send({ username: 'SocketA', password: 'password123' })
    const loginCookie = responseCookie(roomResponse)
    const created = await request(server)
      .post('/api/rooms')
      .set('Cookie', loginCookie)
      .send({})
    const roomId = String(created.body.room.id)
    const connect = async (cookie) => {
      const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws`, {
        headers: { Cookie: cookie },
      })
      await next(socket, 'server.hello')
      return socket
    }
    const a = await connect(cookieA),
      b = await connect(cookieB)
    await command(a, 'room.join', { roomId })
    await command(b, 'room.join', { roomId })
    await command(a, 'room.ready', { ready: true })
    await command(b, 'room.ready', { ready: true })
    const startedA = next(a, 'match.started'),
      startedB = next(b, 'match.started')
    await command(a, 'room.start')
    expect((await startedA).payload.phase).toBe('countdown')
    expect((await startedB).payload.players).toHaveLength(2)
    await command(a, 'room.leave')
    expect(
      [...rooms.rooms.get(roomId).members.values()].some(
        (member) => member.username === 'SocketA',
      ),
    ).toBe(false)
    const returned = next(b, 'room.snapshot')
    await command(b, 'room.lobby')
    expect((await returned).payload.status).toBe('open')
    a.close()
    b.close()
  })
})
