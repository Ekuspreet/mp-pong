import { createMatch } from '@polygon-pong/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../database/connection.js'
import { users } from '../database/schema.js'
import { createMatchRepository } from './match-repository.js'

describe('match repository', () => {
  let db

  afterEach(() => db?.close())

  it('persists the selected rules and final score-based player state', () => {
    db = openDatabase(':memory:')
    const now = Date.now()
    db.orm
      .insert(users)
      .values([
        {
          id: 'u1',
          usernameNormalized: 'pilot-one',
          username: 'Pilot One',
          passwordHash: 'hash',
          isGuest: true,
          createdAt: now,
          lastSeenAt: now,
        },
        {
          id: 'u2',
          usernameNormalized: 'pilot-two',
          username: 'Pilot Two',
          passwordHash: 'hash',
          isGuest: true,
          createdAt: now,
          lastSeenAt: now,
        },
      ])
      .run()
    const state = createMatch(
      'match-1',
      [
        { id: 'u1', username: 'Pilot One' },
        { id: 'u2', username: 'Pilot Two' },
      ],
      now,
      1,
      'u1',
      { format: 'stocks', modifiers: ['vortex', 'pulse'] },
    )
    const repository = createMatchRepository(db.orm)
    repository.start(state, 'ROOM01')
    state.winnerId = 'u1'
    state.players[0].placement = 1
    state.players[0].score = 4
    state.players[0].lives = 2.5
    state.players[1].placement = 2
    state.players[1].score = 8
    state.players[1].lives = 0
    repository.finish(state, now + 1000)

    const result = repository.result('match-1', 'u1')
    expect(result.match).toMatchObject({
      format: 'stocks',
      modifiers: ['vortex', 'pulse'],
    })
    expect(result.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'u1', score: 4, lives: 2.5 }),
        expect.objectContaining({ userId: 'u2', score: 8, lives: 0 }),
      ]),
    )
  })
})
