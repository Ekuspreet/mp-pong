import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export type Db = Database.Database
export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('foreign_keys = ON'); db.pragma('journal_mode = WAL'); db.pragma('busy_timeout = 5000')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username_normalized TEXT NOT NULL UNIQUE, username_display TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_used_at INTEGER NOT NULL, revoked_at INTEGER);
    CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash);
    CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, room_code TEXT NOT NULL, ruleset_version TEXT NOT NULL, status TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, winner_user_id TEXT REFERENCES users(id), no_contest_reason TEXT, initial_player_count INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS match_players (match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), initial_order INTEGER NOT NULL, placement INTEGER, eliminated_at INTEGER, elimination_reason TEXT, returns INTEGER NOT NULL DEFAULT 0, longest_rally_returns INTEGER NOT NULL DEFAULT 0, survival_ms INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(match_id, user_id));
    CREATE TABLE IF NOT EXISTS match_stages (id TEXT PRIMARY KEY, match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE, stage_number INTEGER NOT NULL, player_count INTEGER NOT NULL, arena_type TEXT NOT NULL, serve_seed INTEGER NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, eliminated_user_id TEXT REFERENCES users(id));
  `)
  return db
}
