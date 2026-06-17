import { describe, it, expect } from 'vitest'
import { EDITION, generateTicketNo } from '../../src/lib/ticket'

describe('generateTicketNo', () => {
  it('matches the MU-<edition>-XXXX format', () => {
    expect(generateTicketNo()).toMatch(/^MU-2026-[A-HJ-NP-Z2-9]{4}$/)
  })

  it('embeds the current edition', () => {
    expect(EDITION).toBe('2026')
    expect(generateTicketNo().startsWith(`MU-${EDITION}-`)).toBe(true)
  })

  it('never uses ambiguous characters (0/O/1/I)', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateTicketNo().split('-')[2]
      expect(code).not.toMatch(/[0O1I]/)
    }
  })
})
