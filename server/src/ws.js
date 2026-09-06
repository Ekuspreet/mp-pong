import { PROTOCOL_VERSION, clientMessageSchema } from '@polygon-pong/shared'
import { WebSocketServer, WebSocket } from 'ws'
import { snapshotRoom } from './serializers/room.js'
function attachWebSockets(
  server,
  cookies,
  rooms,
  matches,
  logger = { error: () => {} },
  config = { NODE_ENV: 'development', CLIENT_ORIGIN: null },
) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16384 })
  let sequence = 0
  const userSockets = new Map()
  const send = (socket, type, payload, requestId) => {
    if (socket.readyState === WebSocket.OPEN) {
      const message = {
        type,
        sequence: ++sequence,
        serverTime: Date.now(),
        protocolVersion: PROTOCOL_VERSION,
        payload,
      }
      if (requestId) message.requestId = requestId
      socket.send(JSON.stringify(message))
    }
  }
  const roomSockets = (roomId) =>
    [...wss.clients].filter((candidate) => candidate.roomId === roomId)
  const broadcastRoom = (roomId) => {
    const room = rooms.rooms.get(roomId)
    if (room)
      roomSockets(roomId).forEach((socket) =>
        send(socket, 'room.snapshot', snapshotRoom(room)),
      )
  }
  server.on('upgrade', (request, socket, head) => {
    if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/ws')
      return socket.destroy()
    const origin = request.headers.origin
    if (
      (origin && origin !== config.CLIENT_ORIGIN) ||
      (config.NODE_ENV === 'production' && !origin)
    )
      return socket.destroy()
    const user = cookies.userFromCookie(request.headers.cookie)
    if (!user) return socket.destroy()
    wss.handleUpgrade(request, socket, head, (ws) => {
      const player = ws
      player.user = user
      wss.emit('connection', player, request)
    })
  })
  wss.on('connection', (socket) => {
    socket.isAlive = true
    let messageWindowStartedAt = Date.now()
    let messagesInWindow = 0
    const previousSocket = userSockets.get(socket.user.id)
    userSockets.set(socket.user.id, socket)
    if (previousSocket && previousSocket !== socket)
      previousSocket.close(4000, 'Connection replaced')
    matches.connect(socket.user.id, socket)
    const active = matches.forUser(socket.user.id)
    if (active) socket.roomId = active.room.id
    else {
      socket.roomId = rooms.membership.get(socket.user.id)
      const room = socket.roomId && rooms.rooms.get(socket.roomId)
      const member = room?.members.get(socket.user.id)
      if (room?.status === 'open' && member) member.connected = true
    }
    send(socket, 'server.hello', {
      user: socket.user,
      protocolVersion: PROTOCOL_VERSION,
    })
    if (socket.roomId) broadcastRoom(socket.roomId)
    socket.on('message', (data) => {
      if (userSockets.get(socket.user.id) !== socket)
        return socket.close(4000, 'Connection replaced')
      const now = Date.now()
      if (now - messageWindowStartedAt >= 1_000) {
        messageWindowStartedAt = now
        messagesInWindow = 0
      }
      messagesInWindow++
      if (messagesInWindow > 90) {
        send(socket, 'error', {
          code: 'RATE_LIMITED',
          message: 'Too many WebSocket commands',
        })
        socket.close(1008, 'Rate limit exceeded')
        return
      }
      let raw
      try {
        raw = JSON.parse(data.toString())
      } catch {
        logger.error({ userId: socket.user.id }, 'Invalid WebSocket JSON')
        return send(socket, 'error', {
          code: 'INVALID_JSON',
          message: 'Message must be valid JSON',
        })
      }
      const parsed = clientMessageSchema.safeParse(raw)
      if (!parsed.success) {
        logger.error(
          { userId: socket.user.id, validation: parsed.error },
          'Invalid WebSocket message',
        )
        return send(socket, 'error', {
          code: 'INVALID_MESSAGE',
          message: 'Message did not match the protocol',
        })
      }
      const message = parsed.data
      try {
        if (message.type === 'ping')
          return send(socket, 'pong', {}, message.requestId)
        if (message.type === 'room.join') {
          const room = rooms.join(message.payload.roomId, socket.user)
          socket.roomId = room.id
          broadcastRoom(room.id)
        } else if (message.type === 'match.join') {
          const runtime = matches.join(
            socket.user.id,
            message.payload.matchId,
            socket,
          )
          socket.roomId = runtime.room.id
        } else if (message.type === 'room.leave') {
          const old = socket.roomId
          matches.leave(socket.user.id, socket)
          const remainingRoom = rooms.leave(socket.user.id)
          if (old && remainingRoom)
            matches.updateHost(old, remainingRoom.hostId)
          socket.roomId = void 0
          if (old) broadcastRoom(old)
        } else if (message.type === 'room.restart') {
          const room = rooms.restart(socket.user.id)
          matches.start(
            room,
            new Map(roomSockets(room.id).map((s) => [s.user.id, s])),
          )
        } else if (message.type === 'room.lobby') {
          const room = rooms.lobby(socket.user.id)
          broadcastRoom(room.id)
        } else if (message.type === 'room.ready')
          broadcastRoom(rooms.ready(socket.user.id, message.payload.ready).id)
        else if (message.type === 'room.start') {
          const room = rooms.forUser(socket.user.id)
          if (!rooms.canStart(room, socket.user.id))
            throw Object.assign(
              new Error('Host, two players, and all ready are required'),
              { code: 'CANNOT_START' },
            )
          matches.start(
            room,
            new Map(roomSockets(room.id).map((s) => [s.user.id, s])),
          )
        } else if (message.type === 'input.set')
          matches.input(
            socket.user.id,
            message.payload.sequence,
            message.payload.direction,
            socket,
          )
        send(socket, 'ack', {}, message.requestId)
      } catch (error) {
        const typed = error
        logger.error(
          { err: error, userId: socket.user.id, messageType: message.type },
          'WebSocket command failed',
        )
        send(
          socket,
          'error',
          { code: typed.code ?? 'COMMAND_FAILED', message: typed.message },
          message.requestId,
        )
      }
    })
    socket.on('close', () => {
      if (userSockets.get(socket.user.id) !== socket) return
      userSockets.delete(socket.user.id)
      matches.disconnect(socket.user.id, socket)
      const room = socket.roomId && rooms.rooms.get(socket.roomId)
      if (room && room.status === 'open') {
        const member = room.members.get(socket.user.id)
        if (member) member.connected = false
        broadcastRoom(room.id)
      }
    })
    socket.on('pong', () => {
      socket.isAlive = true
    })
    socket.on('error', (error) =>
      logger.error({ err: error, userId: socket.user.id }, 'WebSocket failed'),
    )
  })
  const heartbeat = setInterval(
    () =>
      wss.clients.forEach((socket) => {
        if (socket.readyState !== WebSocket.OPEN) return
        if (socket.isAlive === false) return socket.terminate()
        socket.isAlive = false
        socket.ping()
      }),
    3e4,
  )
  heartbeat.unref()
  wss.on('close', () => clearInterval(heartbeat))
  wss.on('error', (error) =>
    logger.error({ err: error }, 'WebSocket server failed'),
  )
  return wss
}
export { attachWebSockets }
