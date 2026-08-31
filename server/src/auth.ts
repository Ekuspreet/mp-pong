import argon2 from 'argon2'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'
import { parse, serialize } from 'cookie'
import type { Db } from './db.js'

export interface AuthUser { id: string; username: string }
const cookieName = 'polygon_session'
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const normalizeUsername = (name: string) => name.trim().toLocaleLowerCase('en-US')

export class AuthService {
  constructor(private db: Db, private sessionDays: number, private production: boolean) {}
  async register(username: string, password: string): Promise<AuthUser> {
    const display = username.trim(), normalized = normalizeUsername(display)
    if (!/^[A-Za-z0-9_]{3,20}$/.test(display)) throw Object.assign(new Error('Username must be 3–20 letters, numbers, or underscores'), { code: 'INVALID_USERNAME', status: 400 })
    if (password.length < 8 || password.length > 128) throw Object.assign(new Error('Password must be 8–128 characters'), { code: 'INVALID_PASSWORD', status: 400 })
    const user = { id: randomUUID(), username: display }, now = Date.now(), passwordHash = await argon2.hash(password, { type: argon2.argon2id })
    try { this.db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)').run(user.id, normalized, display, passwordHash, now, now) }
    catch { throw Object.assign(new Error('Username is already registered'), { code: 'USERNAME_TAKEN', status: 409 }) }
    return user
  }
  async login(username: string, password: string): Promise<AuthUser> {
    const row = this.db.prepare('SELECT id, username_display, password_hash FROM users WHERE username_normalized = ?').get(normalizeUsername(username)) as { id: string; username_display: string; password_hash: string } | undefined
    if (!row || !(await argon2.verify(row.password_hash, password))) throw Object.assign(new Error('Invalid username or password'), { code: 'INVALID_CREDENTIALS', status: 401 })
    return { id: row.id, username: row.username_display }
  }
  createSession(userId: string, response: Response): void {
    const token = randomBytes(32).toString('base64url'), now = Date.now(), expires = now + this.sessionDays * 86_400_000
    this.db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, NULL)').run(randomUUID(), userId, hashToken(token), now, expires, now)
    response.setHeader('Set-Cookie', serialize(cookieName, token, { httpOnly: true, sameSite: 'lax', secure: this.production, path: '/', maxAge: this.sessionDays * 86_400 }))
  }
  userFromCookie(header?: string): AuthUser | null {
    const token = parse(header ?? '')[cookieName]; if (!token) return null
    const row = this.db.prepare('SELECT u.id, u.username_display FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?').get(hashToken(token), Date.now()) as { id: string; username_display: string } | undefined
    return row ? { id: row.id, username: row.username_display } : null
  }
  userFromRequest(request: Request): AuthUser | null { return this.userFromCookie(request.headers.cookie) }
  logout(request: Request, response: Response): void {
    const token = parse(request.headers.cookie ?? '')[cookieName]
    if (token) this.db.prepare('UPDATE sessions SET revoked_at=? WHERE token_hash=?').run(Date.now(), hashToken(token))
    response.setHeader('Set-Cookie', serialize(cookieName, '', { httpOnly: true, sameSite: 'lax', secure: this.production, path: '/', maxAge: 0 }))
  }
}
