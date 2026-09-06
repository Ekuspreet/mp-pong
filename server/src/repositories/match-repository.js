import { randomUUID } from 'node:crypto'
import { RULESET_VERSION } from '@polygon-pong/shared'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import {
  matchPlayers,
  matches,
  matchStages,
  users,
} from '../database/schema.js'

export function createMatchRepository(db) {
  const start = (state, roomCode) =>
    db.transaction((tx) => {
      tx.insert(matches)
        .values({
          id: state.matchId,
          roomCode,
          rulesetVersion: RULESET_VERSION,
          status: 'active',
          startedAt: state.startedAt,
          initialPlayerCount: state.players.length,
          format: state.format,
          modifiers: JSON.stringify(state.modifiers),
        })
        .run()
      tx.insert(matchPlayers)
        .values(
          state.players.map((player, initialOrder) => ({
            matchId: state.matchId,
            userId: player.id,
            initialOrder,
          })),
        )
        .run()
    })
  const stageStarted = (matchId, stageNumber, playerCount, serveSeed, now) =>
    db.transaction((tx) => {
      tx.update(matchStages)
        .set({ endedAt: now })
        .where(
          and(eq(matchStages.matchId, matchId), isNull(matchStages.endedAt)),
        )
        .run()
      tx.insert(matchStages)
        .values({
          id: randomUUID(),
          matchId,
          stageNumber,
          playerCount,
          arenaType: playerCount === 2 ? 'duel' : 'polygon',
          serveSeed,
          startedAt: now,
        })
        .onConflictDoNothing()
        .run()
    })
  const playerEliminated = (matchId, stageNumber, playerId) =>
    db
      .update(matchStages)
      .set({ eliminatedUserId: playerId })
      .where(
        and(
          eq(matchStages.matchId, matchId),
          eq(matchStages.stageNumber, stageNumber),
        ),
      )
      .run()
  const finish = (state, now) =>
    db.transaction((tx) => {
      tx.update(matches)
        .set({ status: 'complete', endedAt: now, winnerUserId: state.winnerId })
        .where(eq(matches.id, state.matchId))
        .run()
      for (const player of state.players)
        tx.update(matchPlayers)
          .set({
            placement: player.placement,
            eliminatedAt: player.eliminatedAt,
            eliminationReason: player.eliminationReason,
            returns: player.returns,
            longestRallyReturns: state.longestRally,
            survivalMs: (player.eliminatedAt ?? now) - state.startedAt,
            score: player.score,
            lives: player.lives,
          })
          .where(
            and(
              eq(matchPlayers.matchId, state.matchId),
              eq(matchPlayers.userId, player.id),
            ),
          )
          .run()
    })
  const result = (id, userId) => {
    const match = db.select().from(matches).where(eq(matches.id, id)).get()
    if (!match) return null
    const players = db
      .select({ player: matchPlayers, username: users.username })
      .from(matchPlayers)
      .innerJoin(users, eq(users.id, matchPlayers.userId))
      .where(eq(matchPlayers.matchId, id))
      .orderBy(asc(matchPlayers.placement))
      .all()
      .map(({ player, username }) => ({ ...player, username }))
    if (!players.some((player) => player.userId === userId)) return null
    const stages = db
      .select()
      .from(matchStages)
      .where(eq(matchStages.matchId, id))
      .orderBy(asc(matchStages.stageNumber))
      .all()
    return {
      match: { ...match, modifiers: JSON.parse(match.modifiers) },
      players,
      stages,
    }
  }
  const history = (userId) =>
    db
      .select({ match: matches })
      .from(matches)
      .innerJoin(matchPlayers, eq(matchPlayers.matchId, matches.id))
      .where(eq(matchPlayers.userId, userId))
      .orderBy(desc(matches.startedAt))
      .limit(20)
      .all()
      .map(({ match }) => ({
        ...match,
        modifiers: JSON.parse(match.modifiers),
      }))
  return { start, stageStarted, playerEliminated, finish, result, history }
}
