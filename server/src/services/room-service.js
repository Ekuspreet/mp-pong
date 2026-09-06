import {
  MAX_ROOM_PLAYERS,
  MIN_ROOM_PLAYERS,
  ROOM_CODE_ATTEMPTS,
} from '../constants/rooms.js'
import { createAppError } from '../errors/app-error.js'
import { snapshotRoom } from '../serializers/room.js'
import { generateRoomCode } from './room-code.js'
const roomError = (code, message) => createAppError(code, message)

export function createRoomRegistry(codeGenerator = generateRoomCode) {
  const rooms = new Map()
  const membership = new Map()
  const find = (id) => rooms.get(id.trim().toUpperCase())
  const allocateId = () => {
    for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS; attempt++) {
      const id = codeGenerator()
      if (!rooms.has(id)) return id
    }
    throw roomError(
      'ROOM_CODE_UNAVAILABLE',
      'Could not allocate a room code. Please try again.',
    )
  }
  const join = (idOrCode, user) => {
    const room = find(idOrCode)
    if (!room) throw roomError('ROOM_NOT_FOUND', 'Room not found')
    if (room.status !== 'open')
      throw roomError('ROOM_CLOSED', 'Room has already started')
    const existing = membership.get(user.id)
    if (existing && existing !== room.id)
      throw roomError('ALREADY_IN_ROOM', 'Leave the current room first')
    if (!room.members.has(user.id) && room.members.size >= MAX_ROOM_PLAYERS)
      throw roomError('ROOM_FULL', 'Room is full')
    room.members.set(user.id, {
      ...user,
      ready: room.members.get(user.id)?.ready ?? false,
      connected: true,
      joinedAt: room.members.get(user.id)?.joinedAt ?? Date.now(),
    })
    membership.set(user.id, room.id)
    return room
  }
  const create = (
    user,
    visibility = 'public',
    options = { format: 'elimination', modifiers: [] },
  ) => {
    if (membership.has(user.id))
      throw roomError('ALREADY_IN_ROOM', 'Leave the current room first')
    const id = allocateId()
    const room = {
      id,
      code: id,
      visibility,
      status: 'open',
      options: { format: options.format, modifiers: [...options.modifiers] },
      hostId: user.id,
      members: new Map(),
      matchId: null,
    }
    rooms.set(id, room)
    return join(id, user)
  }
  const forUser = (userId) => {
    const room = rooms.get(membership.get(userId) ?? '')
    if (!room) throw roomError('NOT_IN_ROOM', 'Join a room first')
    return room
  }
  const isMember = (room, userId) => room?.members.has(userId) ?? false
  const leave = (userId) => {
    const id = membership.get(userId)
    if (!id) return null
    const room = rooms.get(id)
    room.members.delete(userId)
    membership.delete(userId)
    if (!room.members.size) {
      rooms.delete(id)
      return null
    }
    if (room.hostId === userId)
      room.hostId = [...room.members.values()].sort(
        (a, b) => a.joinedAt - b.joinedAt,
      )[0].id
    return room
  }
  const ready = (userId, value) => {
    const room = forUser(userId)
    room.members.get(userId).ready = value
    return room
  }
  const requireFinishedHost = (userId) => {
    const room = forUser(userId)
    if (room.hostId !== userId)
      throw roomError('HOST_ONLY', 'Only the room owner can do that')
    if (room.status !== 'finished')
      throw roomError('MATCH_NOT_FINISHED', 'The current match is not finished')
    return room
  }
  const restart = (userId) => requireFinishedHost(userId)
  const lobby = (userId) => {
    const room = requireFinishedHost(userId)
    room.status = 'open'
    room.matchId = null
    room.members.forEach((member) => {
      member.ready = false
    })
    return room
  }
  const canStart = (room, userId) =>
    room.hostId === userId &&
    room.members.size >= MIN_ROOM_PLAYERS &&
    [...room.members.values()].every(
      (member) => member.ready && member.connected,
    ) &&
    room.status === 'open'
  const list = () =>
    [...rooms.values()]
      .filter((room) => room.visibility === 'public' && room.status === 'open')
      .map(snapshotRoom)
  return {
    rooms,
    membership,
    find,
    create,
    join,
    leave,
    ready,
    restart,
    lobby,
    forUser,
    isMember,
    canStart,
    list,
  }
}
