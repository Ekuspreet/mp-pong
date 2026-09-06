import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  usernameNormalized: text('username_normalized').notNull().unique(),
  username: text('username_display').notNull(),
  passwordHash: text('password_hash').notNull(),
  isGuest: integer('is_guest', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  lastSeenAt: integer('last_seen_at').notNull(),
})
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  lastUsedAt: integer('last_used_at').notNull(),
  revokedAt: integer('revoked_at'),
})
export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  roomCode: text('room_code').notNull(),
  rulesetVersion: text('ruleset_version').notNull(),
  status: text('status').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  winnerUserId: text('winner_user_id').references(() => users.id),
  noContestReason: text('no_contest_reason'),
  initialPlayerCount: integer('initial_player_count').notNull(),
  format: text('format').notNull().default('elimination'),
  modifiers: text('modifiers').notNull().default('[]'),
})
export const matchPlayers = sqliteTable(
  'match_players',
  {
    matchId: text('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    initialOrder: integer('initial_order').notNull(),
    placement: integer('placement'),
    eliminatedAt: integer('eliminated_at'),
    eliminationReason: text('elimination_reason'),
    returns: integer('returns').notNull().default(0),
    longestRallyReturns: integer('longest_rally_returns').notNull().default(0),
    survivalMs: integer('survival_ms').notNull().default(0),
    score: integer('score').notNull().default(0),
    lives: integer('lives', { mode: 'number' }).notNull().default(3),
  },
  (table) => [primaryKey({ columns: [table.matchId, table.userId] })],
)
export const matchStages = sqliteTable('match_stages', {
  id: text('id').primaryKey(),
  matchId: text('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  stageNumber: integer('stage_number').notNull(),
  playerCount: integer('player_count').notNull(),
  arenaType: text('arena_type').notNull(),
  serveSeed: integer('serve_seed').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  eliminatedUserId: text('eliminated_user_id').references(() => users.id),
})
