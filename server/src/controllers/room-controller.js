import { createAppError } from '../errors/app-error.js'
import { userOf } from '../middleware/authentication.js'
import { snapshotRoom } from '../serializers/room.js'
import { parseGameOptions } from '../validation/game-options.js'

export function createRoomController(rooms) {
  return {
    list: (_request, response) => response.json({ rooms: rooms.list() }),
    create: (request, response) => {
      const room = rooms.create(
        userOf(response),
        request.body?.visibility === 'private' ? 'private' : 'public',
        parseGameOptions(request.body?.options),
      )
      response.status(201).json({ room: snapshotRoom(room) })
    },
    get: (request, response) => {
      const room = rooms.find(String(request.params.id))
      if (!room) throw createAppError('ROOM_NOT_FOUND', 'Room not found', 404)
      if (
        room.visibility === 'private' &&
        !rooms.isMember(room, userOf(response).id)
      )
        throw createAppError('ROOM_NOT_FOUND', 'Room not found', 404)
      response.json({ room: snapshotRoom(room) })
    },
  }
}
