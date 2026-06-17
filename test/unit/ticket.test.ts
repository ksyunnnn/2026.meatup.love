import { describe, it, expect } from 'vitest'
import {
  EDITION,
  generateTicketNo,
  expectationChars,
  displayRole,
} from '../../src/lib/ticket'

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

describe('expectationChars', () => {
  it('maps each known key to its watermark kanji, in order', () => {
    expect(expectationChars(['meat', 'drink', 'play', 'connect'])).toEqual([
      '肉',
      '麦',
      '遊',
      '繋',
    ])
  })

  it('drops unknown keys and tolerates undefined', () => {
    expect(expectationChars(['meat', 'bogus'])).toEqual(['肉'])
    expect(expectationChars(undefined)).toEqual([])
    expect(expectationChars([])).toEqual([])
  })
})

describe('displayRole', () => {
  it('returns the category as-is for the fixed buckets', () => {
    expect(displayRole('エンジニア')).toBe('エンジニア')
  })

  it('uses the free text for その他, falling back to その他', () => {
    expect(displayRole('その他', '寿司職人')).toBe('寿司職人')
    expect(displayRole('その他', '  ')).toBe('その他')
    expect(displayRole('その他')).toBe('その他')
  })

  it('is empty when no job was chosen', () => {
    expect(displayRole(undefined)).toBe('')
    expect(displayRole('')).toBe('')
  })
})
