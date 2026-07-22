// Pure, dependency-free helpers for the 会場交流ポイントゲーム「繋がりレース」.
// No Firebase import so these stay trivially unit-testable — the single source
// of truth for edge identity and scoring. Firestore I/O lives in connections.ts.
// See issue #11 for the full spec.
import { EDITION } from './ticket'

/** Stable id for the undirected edge between two guests: the two uids sorted and
 *  joined with '__'. Sorting makes (a,b) and (b,a) the SAME document, so a pair
 *  can exist at most once — the rules layer relies on this for dedup (no update
 *  path on connections/{pairId}). */
export function connectionId(uid1: string, uid2: string): string {
  return (uid1 < uid2 ? [uid1, uid2] : [uid2, uid1]).join('__')
}

/** The two endpoints of an edge, in the same sorted order the id uses (a < b).
 *  Callers write these as the `a`/`b` fields so they match the doc id. */
export function edgeEndpoints(uid1: string, uid2: string): { a: string; b: string } {
  return uid1 < uid2 ? { a: uid1, b: uid2 } : { a: uid2, b: uid1 }
}

export interface Edge {
  a: string
  b: string
}

/** Rarity label shown to players. The public specials are announced, so the room
 *  already knows where those points are — that's SR. A hidden special is the one
 *  you can only find by scanning, so it takes the top rarity: SSR. */
export type Rarity = 'SR' | 'SSR'

export function rarityOf(special: { public: boolean } | null | undefined): Rarity | null {
  if (!special) return null
  return special.public ? 'SR' : 'SSR'
}

/** The score, everywhere: the live ranking on /live, each guest's own number on
 *  /game, and the standing frozen at the reveal all run through this, so they
 *  can never disagree. What each end earns depends solely on WHO THEY MET: an
 *  SR/SSR partner pays their own `bonusPoints`, anyone else pays the base 1.
 *  Your own status never changes what you earn, so two rares meeting each pay
 *  the other their bonus. `bonus` holds only the rares (uid → bonusPoints).
 *
 *  Because bonuses are live, a big jump reveals that someone just met an SSR.
 *  That is accepted — see the `specials` block in firestore.rules. */
export function finalScoreFrom(edges: Edge[], bonus: Map<string, number>): Map<string, number> {
  const m = new Map<string, number>()
  const add = (uid: string, n: number) => m.set(uid, (m.get(uid) ?? 0) + n)
  for (const e of edges) {
    add(e.a, bonus.get(e.b) ?? 1)
    add(e.b, bonus.get(e.a) ?? 1)
  }
  return m
}

export interface RankEntry {
  uid: string
  score: number
}

/** Rank high → low. Ties keep insertion order — the tiebreak is deliberately
 *  "決めない" (同着), so no secondary sort is imposed here. */
export function rankFrom(scores: Map<string, number>): RankEntry[] {
  return [...scores.entries()]
    .map(([uid, score]) => ({ uid, score }))
    .sort((x, y) => y.score - x.score)
}

/** Pull the uid out of a scanned ticket QR. The ticket QR encodes the share URL
 *  `${origin}/t/{uid}` (see components/ticket-card), so the game scanner reads
 *  that same QR — printed on a name tag or shown on a phone — and extracts the
 *  uid rather than navigating. Accepts a full URL or a bare `/t/{uid}` path;
 *  returns null for anything that isn't a ticket link. */
export function uidFromQrText(text: string): string | null {
  const match = text.match(/\/t\/([^/?#\s]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/** Resolve a hand-typed 4-char ticket code (the XXXX of MU-<edition>-XXXX) to
 *  the full ticketNo, so a scan fallback can match it against `shares`. The code
 *  alphabet excludes 0/O/1/I, so we accept case-insensitively and reject
 *  anything that isn't exactly four code characters. Returns null on bad input. */
export function ticketNoFromCode(code: string): string | null {
  const c = code.trim().toUpperCase()
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(c)) return null
  return `MU-${EDITION}-${c}`
}
