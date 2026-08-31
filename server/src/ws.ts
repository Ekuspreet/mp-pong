import type { Server } from 'node:http'
import { PROTOCOL_VERSION, clientMessageSchema, type ServerEnvelope } from '@polygon-pong/shared'
import { WebSocketServer, WebSocket } from 'ws'
import type { AuthService, AuthUser } from './auth.js'
import type { MatchManager } from './matches.js'
import { RoomRegistry, snapshotRoom } from './rooms.js'

export function attachWebSockets(server: Server, auth: AuthService, rooms: RoomRegistry, matches: MatchManager): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16_384 }); let sequence = 0
  const send = (socket: WebSocket, type: string, payload: unknown, requestId?: string) => { if (socket.readyState === WebSocket.OPEN) { const message: ServerEnvelope = { type, sequence: ++sequence, serverTime: Date.now(), protocolVersion: PROTOCOL_VERSION, payload }; if (requestId) message.requestId = requestId; socket.send(JSON.stringify(message)) } }
  const roomSockets = (roomId: string) => [...wss.clients].filter((candidate) => (candidate as PlayerSocket).roomId === roomId) as PlayerSocket[]
  const broadcastRoom = (roomId: string) => { const room = rooms.rooms.get(roomId); if (room) roomSockets(roomId).forEach((socket) => send(socket, 'room.snapshot', snapshotRoom(room))) }
  server.on('upgrade', (request, socket, head) => { if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/ws') return socket.destroy(); const user = auth.userFromCookie(request.headers.cookie); if (!user) return socket.destroy(); wss.handleUpgrade(request, socket, head, (ws) => { const player = ws as PlayerSocket; player.user = user; wss.emit('connection', player, request) }) })
  wss.on('connection', (socket: PlayerSocket) => {
    matches.connect(socket.user.id, socket); const active = matches.forUser(socket.user.id); if (active) socket.roomId = active.room.id; else socket.roomId = rooms.membership.get(socket.user.id)
    send(socket, 'server.hello', { user: socket.user, protocolVersion: PROTOCOL_VERSION })
    socket.on('message', (data) => { let raw: unknown; try { raw = JSON.parse(data.toString()) } catch { return send(socket, 'error', { code: 'INVALID_JSON', message: 'Message must be valid JSON' }) } const parsed = clientMessageSchema.safeParse(raw); if (!parsed.success) return send(socket, 'error', { code: 'INVALID_MESSAGE', message: 'Message did not match the protocol' }); const message = parsed.data; try {
      if (message.type === 'ping') return send(socket, 'pong', {}, message.requestId)
      if (message.type === 'room.join') { const room = rooms.join(message.payload.roomId, socket.user); socket.roomId = room.id; broadcastRoom(room.id) }
      else if (message.type === 'room.leave') { const old = socket.roomId; rooms.leave(socket.user.id); socket.roomId = undefined; if (old) broadcastRoom(old) }
      else if (message.type === 'room.ready') broadcastRoom(rooms.ready(socket.user.id, message.payload.ready).id)
      else if (message.type === 'room.start') { const room = rooms.forUser(socket.user.id); if (!rooms.canStart(room, socket.user.id)) throw Object.assign(new Error('Host, two players, and all ready are required'), { code: 'CANNOT_START' }); matches.start(room, new Map(roomSockets(room.id).map((s) => [s.user.id, s]))) }
      else if (message.type === 'input.set') matches.input(socket.user.id, message.payload.sequence, message.payload.direction)
      send(socket, 'ack', {}, message.requestId)
    } catch (error) { const typed = error as Error & { code?: string }; send(socket, 'error', { code: typed.code ?? 'COMMAND_FAILED', message: typed.message }, message.requestId) } })
    socket.on('close', () => { matches.disconnect(socket.user.id); const room = socket.roomId && rooms.rooms.get(socket.roomId); if (room && room.status === 'open') { const member = room.members.get(socket.user.id); if (member) member.connected = false; broadcastRoom(room.id) } })
  })
  const heartbeat = setInterval(() => wss.clients.forEach((socket) => { if (socket.readyState === WebSocket.OPEN) socket.ping() }), 30_000); heartbeat.unref(); wss.on('close', () => clearInterval(heartbeat)); return wss
}
interface PlayerSocket extends WebSocket { user: AuthUser; roomId?: string }
