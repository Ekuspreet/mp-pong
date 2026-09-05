import { afterEach, beforeEach, expect, it } from 'vitest'
import { AuthService } from './auth.js'
import { openDatabase, type Db } from './db.js'

let db: Db
let auth: AuthService
beforeEach(() => { db = openDatabase(':memory:'); auth = new AuthService(db, 7, false) })
afterEach(() => db.close())

it('accepts a one-character password for registration and login', async () => {
  const user = await auth.register('ShortPassword', 'a')
  expect(await auth.login('ShortPassword', 'a')).toEqual(user)
  await expect(auth.login('ShortPassword', 'b')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
})

it('still requires a password and enforces the input size limit', async () => {
  await expect(auth.register('EmptyPassword', '')).rejects.toMatchObject({ code: 'INVALID_PASSWORD' })
  await expect(auth.register('LongPassword', 'a'.repeat(129))).rejects.toMatchObject({ code: 'INVALID_PASSWORD' })
})
