import { afterEach, beforeEach, expect, it } from 'vitest'
import { openDatabase } from './database/connection.js'
import { createServices } from './config/container.js'
let db
let auth
beforeEach(() => {
  db = openDatabase(':memory:')
  auth = createServices({ SESSION_DAYS: 7, NODE_ENV: 'test' }, db).auth
})
afterEach(() => db.close())
it('requires an eight-character password for registration and login', async () => {
  const user = await auth.register('ValidPassword', 'password123')
  expect(await auth.login('ValidPassword', 'password123')).toEqual(user)
  await expect(
    auth.login('ValidPassword', 'password124'),
  ).rejects.toMatchObject({
    code: 'INVALID_CREDENTIALS',
  })
})
it('still requires a password and enforces the input size limit', async () => {
  await expect(auth.register('EmptyPassword', '')).rejects.toMatchObject({
    code: 'INVALID_PASSWORD',
  })
  await expect(auth.register('ShortPassword', 'short')).rejects.toMatchObject({
    code: 'INVALID_PASSWORD',
  })
  await expect(
    auth.register('LongPassword', 'a'.repeat(129)),
  ).rejects.toMatchObject({ code: 'INVALID_PASSWORD' })
})
