import { describe, expect, it } from 'vitest'
import { clientMessageSchema } from './protocol.js'

describe('client protocol', () => {
  it('accepts legal direction input', () => expect(clientMessageSchema.safeParse({ type: 'input.set', requestId: '1', payload: { sequence: 2, direction: -1 } }).success).toBe(true))
  it('rejects claimed coordinates and illegal directions', () => expect(clientMessageSchema.safeParse({ type: 'input.set', requestId: '1', payload: { sequence: 2, direction: 4, x: 10 } }).success).toBe(false))
  it('rejects client-side elimination claims', () => expect(clientMessageSchema.safeParse({ type: 'player.eliminated', requestId: '1', payload: { playerId: 'x' } }).success).toBe(false))
})
