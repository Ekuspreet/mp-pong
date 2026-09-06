import { z } from 'zod'
import { GAME_FORMAT_IDS, GAME_MODIFIER_IDS } from '../constants/rooms.js'
import { createAppError } from '../errors/app-error.js'
const formatSchema = z.enum(GAME_FORMAT_IDS)
const modifiersSchema = z.array(z.enum(GAME_MODIFIER_IDS))
function parseGameOptions(value) {
  const input = value && typeof value === 'object' ? value : {}
  const format = formatSchema.safeParse(input.format ?? 'elimination')
  if (!format.success)
    throw createAppError('INVALID_GAME_FORMAT', 'Unknown game format')
  const modifiers = modifiersSchema.safeParse(input.modifiers ?? [])
  if (!modifiers.success)
    throw createAppError('INVALID_GAME_MODIFIER', 'Unknown game modifier')
  if (new Set(modifiers.data).size !== modifiers.data.length)
    throw createAppError(
      'INVALID_GAME_MODIFIER',
      'Game modifiers must be unique',
    )
  return { format: format.data, modifiers: modifiers.data }
}
export { parseGameOptions }
