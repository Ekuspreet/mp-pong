import { describe, expect, it } from 'vitest'
import { generateCallSign } from './content.js'

describe('generateCallSign', () => {
  it('creates a valid editable retro guest identity', () => {
    const callSign = generateCallSign(() => 0)
    expect(callSign).toBe('Star-Marshal-AAAA')
    expect(callSign).toMatch(/^[A-Za-z0-9_-]{3,20}$/)
  })
})
