import { z } from 'zod'
import { createAppError } from '../errors/app-error.js'
const usernameSchema = z.string().regex(/^\w{3,20}$/)
const guestNameSchema = z.string().regex(/^[A-Za-z0-9_-]{3,20}$/)
const passwordSchema = z.string().min(8).max(128)
const normalizeUsername = (name) => name.trim().toLocaleLowerCase('en-US')
function validateCredentials(username, password) {
  if (!usernameSchema.safeParse(username).success)
    throw createAppError(
      'INVALID_USERNAME',
      'GamerName must be 3\u201320 letters, numbers, or underscores',
    )
  if (!passwordSchema.safeParse(password).success)
    throw createAppError(
      'INVALID_PASSWORD',
      'Password must be 8–128 characters',
    )
}
function validateGuestName(username) {
  if (username && !guestNameSchema.safeParse(username).success)
    throw createAppError(
      'INVALID_USERNAME',
      'GamerName must be 3\u201320 letters, numbers, underscores, or hyphens',
    )
}
export { normalizeUsername, validateCredentials, validateGuestName }
