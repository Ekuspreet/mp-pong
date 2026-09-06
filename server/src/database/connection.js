import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

const ensureColumn = (client, table, column, definition) => {
  const columns = client.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some((entry) => entry.name === column))
    client.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

const initializeSchema = (client) => {
  client.exec(`
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username_normalized TEXT NOT NULL UNIQUE, username_display TEXT NOT NULL, password_hash TEXT NOT NULL, is_guest INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_used_at INTEGER NOT NULL, revoked_at INTEGER);
  CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash);
  CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, room_code TEXT NOT NULL, ruleset_version TEXT NOT NULL, status TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, winner_user_id TEXT REFERENCES users(id), no_contest_reason TEXT, initial_player_count INTEGER NOT NULL, format TEXT NOT NULL DEFAULT 'elimination', modifiers TEXT NOT NULL DEFAULT '[]');
  CREATE TABLE IF NOT EXISTS match_players (match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), initial_order INTEGER NOT NULL, placement INTEGER, eliminated_at INTEGER, elimination_reason TEXT, returns INTEGER NOT NULL DEFAULT 0, longest_rally_returns INTEGER NOT NULL DEFAULT 0, survival_ms INTEGER NOT NULL DEFAULT 0, score INTEGER NOT NULL DEFAULT 0, lives REAL NOT NULL DEFAULT 3, PRIMARY KEY(match_id, user_id));
  CREATE TABLE IF NOT EXISTS match_stages (id TEXT PRIMARY KEY, match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE, stage_number INTEGER NOT NULL, player_count INTEGER NOT NULL, arena_type TEXT NOT NULL, serve_seed INTEGER NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, eliminated_user_id TEXT REFERENCES users(id));
`)
  ensureColumn(
    client,
    'matches',
    'format',
    "TEXT NOT NULL DEFAULT 'elimination'",
  )
  ensureColumn(client, 'matches', 'modifiers', "TEXT NOT NULL DEFAULT '[]'")
  ensureColumn(client, 'match_players', 'score', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(client, 'match_players', 'lives', 'REAL NOT NULL DEFAULT 3')
}

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const client = new Database(path)
  client.pragma('foreign_keys = ON')
  client.pragma('journal_mode = WAL')
  client.pragma('busy_timeout = 5000')
  initializeSchema(client)
  return {
    client,
    orm: drizzle(client, { schema }),
    close: () => client.close(),
    healthCheck: () => client.prepare('SELECT 1').get(),
  }
}
