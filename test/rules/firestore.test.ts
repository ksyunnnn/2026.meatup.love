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
  writeBatch,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-meatup',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(async () => {
  await testEnv.cleanup()
})
beforeEach(async () => {
  await testEnv.clearFirestore()
})

const attendee = (status: string) => ({
  edition: '2026',
  createdAt: serverTimestamp(),
  status,
  name: 'A',
  ticketNo: 'MU-2026-AAAA',
})

describe('attendees', () => {
  it('walk-in must start pending; cannot self-create approved without an invite', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(setDoc(doc(u1, 'attendees/u1'), attendee('pending')))

    const u2 = testEnv.authenticatedContext('u2').firestore()
    await assertFails(setDoc(doc(u2, 'attendees/u2'), attendee('approved')))
  })

  it('a guest cannot self-approve via update', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(setDoc(doc(u1, 'attendees/u1'), attendee('pending')))
    await assertFails(updateDoc(doc(u1, 'attendees/u1'), { status: 'approved' }))
  })

  it('only the owner or an admin can read an attendee', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'attendees/u1'), attendee('pending'))
    })
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(getDoc(doc(u1, 'attendees/u1')))
    const other = testEnv.authenticatedContext('other').firestore()
    await assertFails(getDoc(doc(other, 'attendees/u1')))
  })
})

describe('invites (single-use)', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin1'), {})
      await setDoc(doc(ctx.firestore(), 'invites/tok1'), {
        edition: '2026',
        issuedBy: 'admin1',
        createdAt: serverTimestamp(),
      })
    })
  })

  it('admin can issue, non-admin cannot', async () => {
    const admin = testEnv.authenticatedContext('admin1').firestore()
    await assertSucceeds(
      setDoc(doc(admin, 'invites/tok2'), {
        edition: '2026',
        issuedBy: 'admin1',
        createdAt: serverTimestamp(),
      }),
    )
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertFails(
      setDoc(doc(u1, 'invites/tok3'), {
        edition: '2026',
        issuedBy: 'u1',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('a consumer may set usedBy to self exactly once', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(updateDoc(doc(u1, 'invites/tok1'), { usedBy: 'u1' }))

    const u2 = testEnv.authenticatedContext('u2').firestore()
    await assertFails(updateDoc(doc(u2, 'invites/tok1'), { usedBy: 'u2' }))
  })
})

describe('FR8/FR9 (referral tree)', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'admins/admin1'), {})
      // admin-issued and attendee-issued invites for the same edition
      await setDoc(doc(db, 'invites/adminTok'), {
        edition: '2026',
        issuedBy: 'admin1',
        createdAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'invites/attTok'), {
        edition: '2026',
        issuedBy: 'host-attendee',
        createdAt: serverTimestamp(),
      })
      // a confirmed and an unconfirmed attendee (FR9 issuance rights)
      await setDoc(doc(db, 'attendees/appr'), attendee('approved'))
      await setDoc(doc(db, 'attendees/pend'), attendee('pending'))
    })
  })

  it('admin-issued invite auto-confirms when the token is consumed in the same commit', async () => {
    const u = testEnv.authenticatedContext('newA').firestore()
    const batch = writeBatch(u)
    batch.set(doc(u, 'attendees/newA'), { ...attendee('approved'), inviteToken: 'adminTok' })
    batch.update(doc(u, 'invites/adminTok'), { usedBy: 'newA' })
    await assertSucceeds(batch.commit())
  })

  // Regression: the REAL createAttendee() runs a transaction that first READS
  // admins/{issuedBy} (to decide auto-confirm) before writing. The writeBatch
  // test above never exercises that client-side read, so it missed the bug
  // where a non-admin registrant was denied reading the host's admin doc and
  // the whole registration threw. This mirrors src/lib/attendees.ts.
  it('createAttendee tx (reads admins/{issuedBy}, then writes) succeeds for a host invite', async () => {
    const db = testEnv.authenticatedContext('newA').firestore()
    await assertSucceeds(
      runTransaction(db, async (tx) => {
        const inviteRef = doc(db, 'invites/adminTok')
        const inv = (await tx.get(inviteRef)).data()!
        const issuerAdmin = await tx.get(doc(db, 'admins', String(inv.issuedBy)))
        const approved = issuerAdmin.exists()
        tx.update(inviteRef, { usedBy: 'newA' })
        tx.set(doc(db, 'attendees/newA'), {
          ...attendee(approved ? 'approved' : 'pending'),
          inviteToken: 'adminTok',
          invitedAs: 'A',
        })
        tx.set(doc(db, 'shares/newA'), {
          name: 'A',
          ticketNo: 'MU-2026-AAAA',
          edition: '2026',
        })
      }),
    )
  })

  it('approved create is rejected if it does NOT consume the token (no unlimited reuse)', async () => {
    const u = testEnv.authenticatedContext('evilA').firestore()
    await assertFails(
      setDoc(doc(u, 'attendees/evilA'), { ...attendee('approved'), inviteToken: 'adminTok' }),
    )
  })

  it('attendee-issued invite does NOT auto-confirm (approved rejected, pending ok)', async () => {
    const u = testEnv.authenticatedContext('newB').firestore()
    await assertFails(
      setDoc(doc(u, 'attendees/newB'), { ...attendee('approved'), inviteToken: 'attTok' }),
    )
    await assertSucceeds(
      setDoc(doc(u, 'attendees/newB'), { ...attendee('pending'), inviteToken: 'attTok' }),
    )
  })

  it('a confirmed attendee may issue an invite; an unconfirmed one may not', async () => {
    const appr = testEnv.authenticatedContext('appr').firestore()
    await assertSucceeds(
      setDoc(doc(appr, 'invites/fromAppr'), {
        edition: '2026',
        issuedBy: 'appr',
        createdAt: serverTimestamp(),
      }),
    )
    const pend = testEnv.authenticatedContext('pend').firestore()
    await assertFails(
      setDoc(doc(pend, 'invites/fromPend'), {
        edition: '2026',
        issuedBy: 'pend',
        createdAt: serverTimestamp(),
      }),
    )
  })
})

describe('shares (public OG projection)', () => {
  it('is world-readable', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'shares/u1'), {
        name: 'A',
        ticketNo: 'MU-2026-AAAA',
        edition: '2026',
      })
    })
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(anon, 'shares/u1')))
  })

  it('only the owner can create their share; others cannot', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(
      setDoc(doc(u1, 'shares/u1'), { name: 'A', ticketNo: 'X', edition: '2026' }),
    )
    const evil = testEnv.authenticatedContext('evil').firestore()
    await assertFails(
      setDoc(doc(evil, 'shares/u1'), { name: 'B', ticketNo: 'Y', edition: '2026' }),
    )
  })

  it('ticketNo is immutable on update (name may change)', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(
      setDoc(doc(u1, 'shares/u1'), { name: 'A', ticketNo: 'X', edition: '2026' }),
    )
    await assertSucceeds(updateDoc(doc(u1, 'shares/u1'), { name: 'A2' }))
    await assertFails(updateDoc(doc(u1, 'shares/u1'), { ticketNo: 'Z' }))
  })

  it('allows role + expectations (the ticket-art fields)', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(
      setDoc(doc(u1, 'shares/u1'), {
        name: 'A',
        ticketNo: 'X',
        edition: '2026',
        role: 'エンジニア',
        expectations: ['meat', 'drink'],
      }),
    )
  })

  it('rejects fields outside the allow-list (e.g. gender)', async () => {
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertFails(
      setDoc(doc(u1, 'shares/u1'), {
        name: 'A',
        ticketNo: 'X',
        edition: '2026',
        gender: '男',
      }),
    )
  })
})

describe('admins', () => {
  // Single-doc reads are open to any signed-in user — registration via an
  // invite must check admins/{issuedBy} (the host, not the registrant).
  it('any signed-in user may get a single admin doc (own or other)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin1'), {})
    })
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertSucceeds(getDoc(doc(u1, 'admins/u1'))) // own (missing) → allowed
    await assertSucceeds(getDoc(doc(u1, 'admins/admin1'))) // the host's → allowed (get)
  })

  it('an unauthenticated user cannot read an admin doc', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'admins/admin1')))
  })

  // Enumeration stays admin-only so the full roster can't be listed.
  it('listing the admins collection is admin-only', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins/admin1'), {})
    })
    const u1 = testEnv.authenticatedContext('u1').firestore()
    await assertFails(getDocs(collection(u1, 'admins')))
    const admin = testEnv.authenticatedContext('admin1').firestore()
    await assertSucceeds(getDocs(collection(admin, 'admins')))
  })
})
