import { describe, it, expect } from 'vitest'
import {
  connectionId,
  edgeEndpoints,
  scoreFrom,
  finalScoreFrom,
  rarityOf,
  rankFrom,
  ticketNoFromCode,
  uidFromQrText,
} from '../../src/lib/game'

describe('connectionId (pair identity / dedup)', () => {
  it('is the two uids sorted and joined with __', () => {
    expect(connectionId('abc', 'xyz')).toBe('abc__xyz')
  })
  it('is order-independent — (a,b) and (b,a) collapse to one id', () => {
    expect(connectionId('xyz', 'abc')).toBe(connectionId('abc', 'xyz'))
  })
  it('edgeEndpoints returns fields in the same sorted order as the id', () => {
    expect(edgeEndpoints('xyz', 'abc')).toEqual({ a: 'abc', b: 'xyz' })
  })
})

describe('scoreFrom (live = connection count)', () => {
  it('counts degree: each edge is +1 for both ends', () => {
    const s = scoreFrom([
      { a: 'u1', b: 'u2' },
      { a: 'u1', b: 'u3' },
    ])
    expect(s.get('u1')).toBe(2)
    expect(s.get('u2')).toBe(1)
    expect(s.get('u3')).toBe(1)
  })
  it('never differs by partner — a hidden special still moves a score by 1', () => {
    // scoreFrom takes no specials input at all, so it cannot leak specialness.
    const s = scoreFrom([{ a: 'normal', b: 'hiddenSpecial' }])
    expect(s.get('normal')).toBe(1)
    expect(s.get('hiddenSpecial')).toBe(1)
  })
})

describe('finalScoreFrom (reveal = count + bonuses)', () => {
  const bonus = new Map<string, number>([
    ['staffA', 5],
    ['staffB', 10],
  ])

  it('normal×normal: each end gets 1', () => {
    const s = finalScoreFrom([{ a: 'n1', b: 'n2' }], bonus)
    expect(s.get('n1')).toBe(1)
    expect(s.get('n2')).toBe(1)
  })
  it('normal×special: the normal earns the bonus, the special earns 1', () => {
    const s = finalScoreFrom([{ a: 'n1', b: 'staffA' }], bonus)
    expect(s.get('n1')).toBe(5)
    expect(s.get('staffA')).toBe(1)
  })
  it('special×special: each earns the OTHER bonus (own status is irrelevant)', () => {
    const s = finalScoreFrom([{ a: 'staffA', b: 'staffB' }], bonus)
    expect(s.get('staffA')).toBe(10) // staffB's bonus
    expect(s.get('staffB')).toBe(5) // staffA's bonus
  })
  it('accumulates across edges (per-special bonuses add up)', () => {
    const s = finalScoreFrom(
      [
        { a: 'n1', b: 'n2' }, // +1
        { a: 'n1', b: 'staffA' }, // +5
        { a: 'n1', b: 'staffB' }, // +10
      ],
      bonus,
    )
    expect(s.get('n1')).toBe(16)
  })
})

describe('rarityOf', () => {
  it('a public special is SR — the room already knows where those points are', () => {
    expect(rarityOf({ public: true })).toBe('SR')
  })
  it('a hidden special is SSR — you can only find it by scanning', () => {
    expect(rarityOf({ public: false })).toBe('SSR')
  })
  it('an ordinary guest has no rarity', () => {
    expect(rarityOf(null)).toBeNull()
    expect(rarityOf(undefined)).toBeNull()
  })
})

describe('rankFrom', () => {
  it('sorts high → low', () => {
    const r = rankFrom(new Map([['a', 3], ['b', 9], ['c', 1]]))
    expect(r.map((e) => e.uid)).toEqual(['b', 'a', 'c'])
  })
  it('keeps insertion order for ties (tiebreak = 同着/決めない)', () => {
    const r = rankFrom(new Map([['a', 5], ['b', 5]]))
    expect(r.map((e) => e.uid)).toEqual(['a', 'b'])
  })
})

describe('uidFromQrText (scanned ticket QR → uid)', () => {
  it('extracts the uid from a full ticket URL', () => {
    expect(uidFromQrText('https://meatup.love/t/abc123')).toBe('abc123')
  })
  it('ignores query/hash and trailing path', () => {
    expect(uidFromQrText('https://meatup.love/t/abc123?t=MU-2026-7Q3K')).toBe('abc123')
  })
  it('accepts a bare /t/{uid} path', () => {
    expect(uidFromQrText('/t/abc123')).toBe('abc123')
  })
  it('returns null for a non-ticket QR', () => {
    expect(uidFromQrText('https://example.com/hello')).toBeNull()
    expect(uidFromQrText('just some text')).toBeNull()
  })
})

describe('ticketNoFromCode (hand-typed 4-char fallback)', () => {
  it('expands a valid code to the full ticketNo', () => {
    expect(ticketNoFromCode('7Q3K')).toBe('MU-2026-7Q3K')
  })
  it('is case-insensitive and trims', () => {
    expect(ticketNoFromCode(' 7q3k ')).toBe('MU-2026-7Q3K')
  })
  it('rejects wrong length', () => {
    expect(ticketNoFromCode('7Q3')).toBeNull()
    expect(ticketNoFromCode('7Q3KX')).toBeNull()
  })
  it('rejects ambiguous / non-code characters (0/O/1/I)', () => {
    expect(ticketNoFromCode('0O1I')).toBeNull()
  })
})
