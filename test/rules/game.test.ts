import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'

// Rules-layer tests for the 会場交流ポイントゲーム「繋がりレース」(issue #11):
// connection dedup, edge-participant integrity, hidden-special secrecy, and the
// admin-only control/results surfaces.

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-meatup-game',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(async () => {
  await testEnv.cleanup()
})
beforeEach(async () => {
  await testEnv.clearFirestore()
})

// Same rule the app uses (lib/game.connectionId): two uids sorted + joined.
const cid = (x: string, y: string) => (x < y ? [x, y] : [y, x]).join('__')
const edge = (x: string, y: string, by: string) => {
  const [a, b] = x < y ? [x, y] : [y, x]
  return { a, b, by, edition: '2026', createdAt: serverTimestamp() }
}

describe('connections (edge dedup + participant integrity)', () => {
  it('a participant may create their own edge', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(setDoc(doc(u1, `connections/${cid('u1', 'u2')}`), edge('u1', 'u2', 'u1')))
  })

  it('the SAME pair cannot be created twice — dedup (repeat = update, denied)', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(setDoc(doc(u1, `connections/${cid('u1', 'u2')}`), edge('u1', 'u2', 'u1')))
    // u2 tries to re-create the same pair (or u1 again): lands as an update → denied.
    const u2 = testEnv.authenticatedContext('u2').firestore()
    await assertFails(setDoc(doc(u2, `connections/${cid('u1', 'u2')}`), edge('u1', 'u2', 'u2')))
  })

  it('the doc id must equal a__b (sorted)', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    // wrong id: b__a instead of a__b
    await assertFails(setDoc(doc(u1, 'connections/u2__u1'), edge('u1', 'u2', 'u1')))
  })

  it('you cannot create an edge you are not part of', async () => {
    const evil = testEnv.authenticatedContext('evil').firestore()
    await assertFails(
      setDoc(doc(evil, `connections/${cid('u1', 'u2')}`), edge('u1', 'u2', 'evil')),
    )
  })

  it('`by` must be the caller', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    // u1 is a participant but records the edge as u2 → denied
    await assertFails(setDoc(doc(u1, `connections/${cid('u1', 'u2')}`), edge('u1', 'u2', 'u2')))
  })

  it('is world-readable (the projector draws the graph unauthenticated)', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(setDoc(doc(u1, `connections/${cid('u1', 'u2')}`), edge('u1', 'u2', 'u1')))
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, `connections/${cid('u1', 'u2')}`)))
    await assertSucceeds(getDocs(collection(anon, 'connections')))
  })

  it('only an admin may delete an edge', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin1'), {})
      await setDoc(doc(ctx.firestore(), `connections/${cid('u1', 'u2')}`), edge('u1', 'u2', 'u1'))
    })
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertFails(deleteDoc(doc(u1, `connections/${cid('u1', 'u2')}`)))
    const admin = testEnv.authenticatedContext('admin1').firestore()
    await assertSucceeds(deleteDoc(doc(admin, `connections/${cid('u1', 'u2')}`)))
  })
})

describe('specials (hidden-special secrecy)', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin1'), {})
      await setDoc(doc(ctx.firestore(), 'specials/staffA'), {
        bonusPoints: 5,
        public: false,
        edition: '2026',
      })
    })
  })

  it('a signed-in user may get() a single special (resolve a partner they met)', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(getDoc(doc(u1, 'specials/staffA')))
  })

  it('an unauthenticated user cannot read a special', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'specials/staffA')))
  })

  // A signed-in guest CAN enumerate the rares, hidden ones included. That is
  // deliberate: /live ranks by bonus-inclusive points and there is no server to
  // compute on, so every viewer's browser needs the bonus table. Signing in is
  // still required — an anonymous visitor gets nothing.
  it('any signed-in user may list specials; an anonymous one may not', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(getDocs(collection(u1, 'specials')))
    const admin = testEnv.authenticatedContext('admin1').firestore()
    await assertSucceeds(getDocs(collection(admin, 'specials')))
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDocs(collection(anon, 'specials')))
  })

  it('only an admin may set a special (bonusPoints/public)', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertFails(
      setDoc(doc(u1, 'specials/u1'), { bonusPoints: 999, public: false, edition: '2026' }),
    )
    const admin = testEnv.authenticatedContext('admin1').firestore()
    await assertSucceeds(
      setDoc(doc(admin, 'specials/u9'), { bonusPoints: 3, public: true, edition: '2026' }),
    )
  })
})

describe('control + results (host-only, world-readable)', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin1'), {})
    })
  })

  it('control is world-readable but admin-only write', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'control/2026')))
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertFails(
      setDoc(doc(u1, 'control/2026'), { game: 'open', ranking: 'shown', reveal: 0, edition: '2026' }),
    )
    const admin = testEnv.authenticatedContext('admin1').firestore()
    await assertSucceeds(
      setDoc(doc(admin, 'control/2026'), {
        game: 'open',
        ranking: 'shown',
        reveal: 0,
        edition: '2026',
        updatedAt: serverTimestamp(),
      }),
    )
    // host closes the game / bumps reveal
    await assertSucceeds(updateDoc(doc(admin, 'control/2026'), { game: 'closed', reveal: 1 }))
  })

  it('staff (public list for /live) is world-readable but admin-only write', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'staff/2026'))) // /live reads it without login
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertFails(setDoc(doc(u1, 'staff/2026'), { uids: ['x'], edition: '2026' }))
    const admin = testEnv.authenticatedContext('admin1').firestore()
    await assertSucceeds(setDoc(doc(admin, 'staff/2026'), { uids: ['uS'], edition: '2026' }))
  })

  it('results is world-readable but admin-only write', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertFails(setDoc(doc(u1, 'results/2026'), { top: [], edition: '2026' }))
    const admin = testEnv.authenticatedContext('admin1').firestore()
    await assertSucceeds(
      setDoc(doc(admin, 'results/2026'), {
        top: [{ uid: 'u1', name: 'A', score: 12 }],
        edition: '2026',
      }),
    )
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'results/2026')))
  })
})
