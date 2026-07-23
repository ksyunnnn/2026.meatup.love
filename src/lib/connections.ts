// Firestore I/O for the 会場交流ポイントゲーム「繋がりレース」(issue #11).
// Pure edge-identity/scoring lives in game.ts (unit-tested); this file is the
// thin Firestore layer the pages use. Imported by client components only.
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import { EDITION } from './ticket'
import { connectionId, edgeEndpoints, finalScoreFrom, rankFrom } from './game'
import type { Connection, Special, GameControl } from './types'

// ---- edges (繋がり) ----

export type CreateConnectionResult = 'created' | 'exists' | 'self'

/** Create the edge between the signed-in user (`me`) and `other`. Idempotent:
 *  a pair that already exists (or races us) resolves to 'exists' rather than
 *  throwing — the rules layer guarantees a pair can be written at most once. */
export async function createConnection(me: string, other: string): Promise<CreateConnectionResult> {
  if (me === other) return 'self'
  const ref = doc(db, 'connections', connectionId(me, other))
  if ((await getDoc(ref)).exists()) return 'exists'
  const { a, b } = edgeEndpoints(me, other)
  try {
    await setDoc(ref, { a, b, by: me, edition: EDITION, createdAt: serverTimestamp() })
    return 'created'
  } catch (err) {
    // A concurrent create lands as an update and is denied; if the doc now
    // exists that's the benign "already connected" case, otherwise re-throw.
    if ((await getDoc(ref)).exists()) return 'exists'
    throw err
  }
}

/** Live subscription to every edge (world-readable). Powers the graph, the
 *  count-based ranking, and each guest's own score and Mate list. */
export function subscribeConnections(cb: (edges: Connection[]) => void): () => void {
  return onSnapshot(collection(db, 'connections'), (snap) => {
    cb(snap.docs.map((d) => d.data() as Connection))
  })
}

/** Fires ONCE per edge that appears AFTER the subscription is established —
 *  the projector's "つながり速報" toast. The very first snapshot delivers every
 *  pre-existing edge as an 'added' change; we skip that whole batch (primed) so
 *  opening /live mid-event doesn't replay the history as a flood of toasts. */
export function subscribeNewConnections(onAdded: (edge: Connection) => void): () => void {
  let primed = false
  return onSnapshot(collection(db, 'connections'), (snap) => {
    if (!primed) {
      primed = true
      return
    }
    for (const ch of snap.docChanges()) {
      if (ch.type === 'added') onAdded(ch.doc.data() as Connection)
    }
  })
}

// ---- specials (bonus users) ----

/** Resolve ONE special by uid (single-doc get, allowed for signed-in users).
 *  Used at scan time to show the ✨ reveal on the scanner's own phone. Never
 *  list the collection from a guest — that path is admin-only by design. */
export async function getSpecial(uid: string): Promise<Special | null> {
  const s = await getDoc(doc(db, 'specials', uid))
  return s.exists() ? (s.data() as Special) : null
}

/** Admin-only: the full specials map (uid → config), for the reveal computation
 *  and the host's setup screen. Fails for non-admins (list is admin-only). */
export async function listSpecials(): Promise<Map<string, Special>> {
  const snap = await getDocs(collection(db, 'specials'))
  return new Map(snap.docs.map((d) => [d.id, d.data() as Special]))
}

export async function setSpecial(
  uid: string,
  bonusPoints: number,
  isPublic: boolean,
  name?: string,
): Promise<void> {
  await setDoc(doc(db, 'specials', uid), {
    bonusPoints,
    public: isPublic,
    name: name ?? '',
    edition: EDITION,
  })
}

export async function removeSpecial(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'specials', uid))
}

/** Admin-only live subscription to the specials map. The projector (opened
 *  signed-in as the host) uses it to glow public staff and to apply bonuses at
 *  the reveal. Non-admins can't list, so this is never used from a guest. */
export function subscribeSpecials(cb: (specials: Map<string, Special>) => void): () => void {
  return onSnapshot(collection(db, 'specials'), (snap) => {
    cb(new Map(snap.docs.map((d) => [d.id, d.data() as Special])))
  })
}

// ---- control (game + display state) ----

const controlRef = () => doc(db, 'control', EDITION)

/** Live game/display state. Null until the host initializes it. */
export function subscribeControl(cb: (c: GameControl | null) => void): () => void {
  return onSnapshot(controlRef(), (snap) => {
    cb(snap.exists() ? (snap.data() as GameControl) : null)
  })
}

/** Admin-only: patch the control doc (merges; stamps updatedAt). */
export async function patchControl(patch: Partial<GameControl>): Promise<void> {
  await setDoc(
    controlRef(),
    { edition: EDITION, updatedAt: serverTimestamp(), ...patch },
    { merge: true },
  )
}

// ---- shares (participant roster for the graph) ----

/** Minimal public row from `shares` — the projector's node set and the Mate cards. */
export interface ShareRow {
  uid: string
  name: string
  ticketNo?: string
  role?: string
  expectations?: string[]
}

export function subscribeShares(cb: (rows: ShareRow[]) => void): () => void {
  return onSnapshot(collection(db, 'shares'), (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data() as Omit<ShareRow, 'uid'>
        return { uid: d.id, ...data }
      }),
    )
  })
}

/** Resolve a uid from a full ticketNo (the hand-typed fallback path). `shares`
 *  is publicly listable, so the client can do this itself. */
export async function uidByTicketNo(ticketNo: string): Promise<string | null> {
  const snap = await getDocs(query(collection(db, 'shares'), where('ticketNo', '==', ticketNo)))
  return snap.empty ? null : snap.docs[0].id
}

// ---- results (final reveal) ----

export interface ResultEntry {
  uid: string
  name: string
  score: number
}

/** Admin-only, run once at close: read every edge + rare, and FREEZE the
 *  standing into `results` so the prize list can't move while it's being read
 *  out. The same bonuses are already live on /live and /game, so this changes
 *  no number — it only pins one. SR (public:true) are excluded from the prize
 *  list per the agreed rule (賑やかし役, not prize-eligible); SSR are ordinary
 *  guests picked at random and stay eligible. */
export async function computeAndWriteResults(topN = 10): Promise<ResultEntry[]> {
  const [connSnap, specials, sharesSnap] = await Promise.all([
    getDocs(collection(db, 'connections')),
    listSpecials(),
    getDocs(collection(db, 'shares')),
  ])
  const edges = connSnap.docs.map((d) => d.data() as Connection)
  const bonus = new Map([...specials].map(([uid, s]) => [uid, s.bonusPoints]))
  const staff = new Set([...specials].filter(([, s]) => s.public).map(([uid]) => uid))
  const names = new Map(sharesSnap.docs.map((d) => [d.id, (d.data() as { name?: string }).name ?? '—']))

  const top = rankFrom(finalScoreFrom(edges, bonus))
    .filter((e) => !staff.has(e.uid))
    .slice(0, topN)
    .map((e) => ({ uid: e.uid, name: names.get(e.uid) ?? '—', score: e.score }))

  await setDoc(doc(db, 'results', EDITION), {
    top,
    edition: EDITION,
    computedAt: serverTimestamp(),
  })
  return top
}

export function subscribeResults(cb: (top: ResultEntry[] | null) => void): () => void {
  return onSnapshot(doc(db, 'results', EDITION), (snap) => {
    cb(snap.exists() ? ((snap.data() as { top: ResultEntry[] }).top ?? []) : null)
  })
}

// ---- public SR list (so /live can glow them without being admin) ----

/** Subscription to the SR uid set. Holds ONLY the public rares — an SSR is
 *  never listed here, which is what keeps the two apart on the graph. */
export function subscribeStaff(cb: (uids: Set<string>) => void): () => void {
  return onSnapshot(doc(db, 'staff', EDITION), (snap) => {
    const uids = snap.exists() ? ((snap.data() as { uids?: string[] }).uids ?? []) : []
    cb(new Set(uids))
  })
}

/** Admin-only: publish the public staff uid list (derived from the public
 *  specials). Kept in sync by /admin/specials whenever specials change. */
export async function publishStaff(uids: string[]): Promise<void> {
  await setDoc(doc(db, 'staff', EDITION), { uids, edition: EDITION })
}
