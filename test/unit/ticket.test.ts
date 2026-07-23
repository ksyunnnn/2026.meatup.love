import { describe, it, expect } from 'vitest'
import {
  EDITION,
  generateTicketNo,
  expectationChars,
  displayRole,
  shareProjection,
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

describe('shareProjection (attendee → public shares doc; used by register + 参加に戻す)', () => {
  it('projects the ticket-card fields and stamps the edition', () => {
    expect(
      shareProjection({
        name: 'こばしゅん',
        ticketNo: 'MU-2026-MEAT',
        job: 'エンジニア',
        expectations: ['meat', 'connect'],
      }),
    ).toEqual({
      name: 'こばしゅん',
      ticketNo: 'MU-2026-MEAT',
      edition: '2026',
      role: 'エンジニア',
      expectations: ['meat', 'connect'],
    })
  })

  it('omits role and expectations rather than writing undefined (rules allow-list)', () => {
    const p = shareProjection({ name: 'A', ticketNo: 'MU-2026-XXXX' })
    expect(p).toEqual({ name: 'A', ticketNo: 'MU-2026-XXXX', edition: '2026' })
    expect('role' in p).toBe(false)
    expect('expectations' in p).toBe(false)
  })

  it('resolves the その他 free-text job like the ticket does', () => {
    const p = shareProjection({ name: 'A', ticketNo: 'X', job: 'その他', jobOther: '寿司職人' })
    expect(p.role).toBe('寿司職人')
  })

  it('rebuilds a share byte-for-byte from the attendee it was projected from', () => {
    // The whole point of 参加に戻す: restore derives the share from the surviving
    // attendee doc, and it must equal what registration wrote. Same input in →
    // same object out, so cancel→restore is a true round-trip.
    const attendee = {
      name: 'えばたあや',
      ticketNo: 'MU-2026-NZ98',
      job: 'エンジニア',
      expectations: ['drink', 'connect'],
    }
    expect(shareProjection(attendee)).toEqual(shareProjection(attendee))
    expect(shareProjection(attendee)).toEqual({
      name: 'えばたあや',
      ticketNo: 'MU-2026-NZ98',
      edition: '2026',
      role: 'エンジニア',
      expectations: ['drink', 'connect'],
    })
  })
})
