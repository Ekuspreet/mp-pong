import { randomInt } from 'node:crypto'
import { ROOM_ALPHABET, ROOM_CODE_LENGTH } from '../constants/rooms.js'
const generateRoomCode = () =>
  Array.from(
    { length: ROOM_CODE_LENGTH },
    () => ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)],
  ).join('')
export { generateRoomCode }
