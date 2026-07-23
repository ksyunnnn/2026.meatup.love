// Emulator round-trip for 参加キャンセル → 参加に戻す (RULES ENFORCED, as admin).
// Proves the exact write sequence cancelAttendee/restoreAttendee perform is
// permitted by the deployed rules AND round-trips the share byte-for-byte.
// Run against a live emulator:  node test/e2e/cancel-restore-roundtrip.mjs
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore'

const EDITION = '2026'
const UID = 'roundtrip_u1'
const ADMIN = 'roundtrip_admin'

// Mirror src/lib/ticket.ts shareProjection (kept tiny; the unit test guards it).
const displayRole = (job, jobOther) =>
  !job ? '' : job === 'その他' ? (jobOther?.trim() || 'その他') : job
function shareProjection(a) {
  const s = { name: a.name, ticketNo: a.ticketNo ?? '', edition: EDITION }
  const role = displayRole(a.job, a.jobOther)
  if (role) s.role = role
  if (a.expectations?.length) s.expectations = a.expectations
  return s
}

const env = await initializeTestEnvironment({
  projectId: 'demo-meatup',
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
  },
})

let failed = false
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) failed = true
}

const attendee = {
  authName: 'えばたあや',
  name: 'えばたあや',
  status: 'approved',
  edition: EDITION,
  ticketNo: 'MU-2026-NZ98',
  job: 'エンジニア',
  expectations: ['drink', 'connect'],
}

// Seed: an approved attendee + its share, and an admin. (rules disabled here —
// this is the "already registered" starting state, not the path under test.)
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, 'attendees', UID), attendee)
  await setDoc(doc(db, 'shares', UID), shareProjection(attendee))
  await setDoc(doc(db, 'admins', ADMIN), {})
})

// withSecurityRulesDisabled doesn't forward the callback's return value, so
// read into an outer variable inside the callback.
const readShare = async () => {
  let out
  await env.withSecurityRulesDisabled(async (ctx) => {
    out = await getDoc(doc(ctx.firestore(), 'shares', UID))
  })
  return out
}
const readAttendee = async () => {
  let out
  await env.withSecurityRulesDisabled(async (ctx) => {
    out = await getDoc(doc(ctx.firestore(), 'attendees', UID))
  })
  return out
}

const before = (await readShare()).data()

// The admin performs cancel, then restore — through ENFORCED rules.
const adb = env.authenticatedContext(ADMIN).firestore()

// cancelAttendee: flip status + delete the share.
await updateDoc(doc(adb, 'attendees', UID), {
  status: 'cancelled',
  cancelledAt: serverTimestamp(),
  cancelledFrom: 'approved',
})
await deleteDoc(doc(adb, 'shares', UID))
const afterCancel = await readShare()
check('cancel removes the share (point disappears)', !afterCancel.exists())

// restoreAttendee: read surviving attendee, rebuild share, flip status back.
const survivor = (await readAttendee()).data()
await updateDoc(doc(adb, 'attendees', UID), {
  status: survivor.cancelledFrom ?? 'pending',
  cancelledAt: deleteField(),
  cancelledFrom: deleteField(),
})
await setDoc(doc(adb, 'shares', UID), shareProjection(survivor))

const restored = (await readShare()).data()
check('restore recreates the share', !!restored)
check(
  'restored share equals the original byte-for-byte',
  JSON.stringify(restored) === JSON.stringify(before),
)

// Cleanup so this leaves no residue in the shared emulator.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await deleteDoc(doc(db, 'attendees', UID))
  await deleteDoc(doc(db, 'shares', UID))
  await deleteDoc(doc(db, 'admins', ADMIN))
})

await env.cleanup()
console.log(failed ? '\nRESULT: FAILED' : '\nRESULT: OK')
process.exit(failed ? 1 : 0)
