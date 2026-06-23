import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  runTransaction,
  writeBatch,
  collection,
  query,
  where,
  serverTimestamp,
  deleteField,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Attendee, AttendeeStatus } from './types'
import { EDITION, generateTicketNo, displayRole } from './ticket'

// Re-export so existing importers (invites.ts, admin) keep working.
export { EDITION, generateTicketNo }

export interface CreateAttendeeInput {
  uid: string
  authName: string
  name: string
  job?: string
  jobOther?: string
  expectations?: string[]
  contactMethod?: string
  contactValue?: string
  withKids?: boolean
  hasAllergy?: boolean
  allergyNote?: string
  inviteToken?: string
}

/**
 * Register a guest.
 * A valid, unused invite link is consumed (usedBy = this uid) and the referral
 * is recorded. Auto-confirmation happens ONLY when the host (admin) issued the
 * invite; invites issued by confirmed attendees (FR9) still need host approval,
 * so they start pending — this keeps the approval gate (NFR4). Walk-ins start
 * pending too. Runs in a transaction so a single invite link is consumed once;
 * concurrent uses retry and fall back to pending.
 */
export async function createAttendee(
  input: CreateAttendeeInput,
): Promise<{ ticketNo: string; status: AttendeeStatus }> {
  const ticketNo = generateTicketNo()

  return runTransaction(db, async (tx) => {
    // All reads must precede writes in a Firestore transaction.
    let approved = false
    let inviteToConsume: ReturnType<typeof doc> | null = null

    if (input.inviteToken) {
      const inviteRef = doc(db, 'invites', input.inviteToken)
      const inviteSnap = await tx.get(inviteRef)
      if (inviteSnap.exists()) {
        const inv = inviteSnap.data()
        if (inv.edition === EDITION && !('usedBy' in inv)) {
          inviteToConsume = inviteRef
          // Auto-confirm only for host(admin)-issued invites.
          const issuerAdmin = await tx.get(doc(db, 'admins', String(inv.issuedBy)))
          approved = issuerAdmin.exists()
        }
      }
    }

    if (inviteToConsume) tx.update(inviteToConsume, { usedBy: input.uid })

    const status: AttendeeStatus = approved ? 'approved' : 'pending'
    const data: Record<string, unknown> = {
      authName: input.authName,
      name: input.name,
      status,
      ticketNo,
      edition: EDITION,
      createdAt: serverTimestamp(),
    }
    if (input.job) data.job = input.job
    if (input.jobOther) data.jobOther = input.jobOther
    if (input.expectations && input.expectations.length > 0)
      data.expectations = input.expectations
    // Contact + free-form shared notes. Stored on the attendee only (NOT on the
    // public `shares` projection — these are private, not on the ticket).
    if (input.contactMethod) data.contactMethod = input.contactMethod
    if (input.contactValue) data.contactValue = input.contactValue
    if (input.withKids) data.withKids = true
    if (input.hasAllergy) data.hasAllergy = true
    if (input.allergyNote) data.allergyNote = input.allergyNote
    if (input.inviteToken) {
      data.inviteToken = input.inviteToken
      data.invitedAs = input.name
    }
    if (approved) data.approvedAt = serverTimestamp()

    tx.set(doc(db, 'attendees', input.uid), data)

    // Public, minimal projection for OG image generation (read without auth).
    // Holds only the non-sensitive fields drawn on the shared ticket: the
    // resolved role label and the expectation keys (→ watermark kanji).
    // Gender is intentionally NOT projected (sensitive, not on the ticket).
    const share: Record<string, unknown> = {
      name: input.name,
      ticketNo,
      edition: EDITION,
    }
    const role = displayRole(input.job, input.jobOther)
    if (role) share.role = role
    if (input.expectations && input.expectations.length > 0)
      share.expectations = input.expectations
    tx.set(doc(db, 'shares', input.uid), share)

    // Surface the assigned number + resolved status so the caller (the register
    // completion screen) can render the ticket immediately without a refetch.
    return { ticketNo, status }
  })
}

export async function getMyAttendee(uid: string): Promise<Attendee | null> {
  const snap = await getDoc(doc(db, 'attendees', uid))
  return snap.exists() ? (snap.data() as Attendee) : null
}

/** Fetch any attendee by id (admin-only read for ids other than your own —
 *  see firestore.rules). Used by the /admin edit screen. */
export async function getAttendee(id: string): Promise<Attendee | null> {
  const snap = await getDoc(doc(db, 'attendees', id))
  return snap.exists() ? (snap.data() as Attendee) : null
}

/**
 * Host edits an existing attendee's profile from /admin (any field — admin is
 * trusted, see rules). Emptied optional fields are cleared with deleteField() so
 * toggling something off actually removes it. status/ticketNo are NOT touched
 * (approve/cancel own status; the number is pinned for shares consistency).
 * paidAt is set only when `touchPaidAt` is true (i.e. payment was just turned
 * on) so re-saving an already-paid guest doesn't overwrite the original time.
 */
export async function updateAttendeeProfile(
  id: string,
  input: AdminAddInput,
  opts?: { touchPaidAt?: boolean },
): Promise<void> {
  const data: Record<string, unknown> = {
    name: input.name,
    job: input.job ?? deleteField(),
    jobOther: input.jobOther ?? deleteField(),
    gender: input.gender ?? deleteField(),
    expectations:
      input.expectations && input.expectations.length > 0 ? input.expectations : deleteField(),
    contactMethod: input.contactMethod ?? deleteField(),
    contactValue: input.contactValue ?? deleteField(),
    withKids: input.withKids ? true : deleteField(),
    hasAllergy: input.hasAllergy ? true : deleteField(),
    allergyNote: input.hasAllergy && input.allergyNote ? input.allergyNote : deleteField(),
  }
  if (input.paid) {
    data.paid = true
    if (opts?.touchPaidAt) data.paidAt = serverTimestamp()
  } else {
    data.paid = deleteField()
    data.paidAt = deleteField()
  }
  await updateDoc(doc(db, 'attendees', id), data)
}

/** Attendee plus its document id (== auth uid). */
export type AttendeeWithId = Attendee & { id: string }

/** All guests for this edition (admin view). Pending is derived client-side. */
export async function listAttendees(): Promise<AttendeeWithId[]> {
  const q = query(collection(db, 'attendees'), where('edition', '==', EDITION))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Attendee) }))
}

/** Guest sets/replaces their own reachable contact (self-update; status &
 *  ticketNo untouched, so firestore.rules allows it). Mainly for someone who
 *  registered via the "add the host's LINE" path but later prefers to hand over
 *  an SNS handle instead. */
export async function updateMyContact(
  uid: string,
  contactMethod: string,
  contactValue: string,
) {
  await updateDoc(doc(db, 'attendees', uid), { contactMethod, contactValue })
}

/** Host marks payment as received (after confirming PayPay/cash off-app). */
export async function setPaid(uid: string, paid: boolean) {
  await updateDoc(doc(db, 'attendees', uid), {
    paid,
    ...(paid ? { paidAt: serverTimestamp() } : {}),
  })
}

/** Host assigns (or clears, with '') a guest's gender. Not asked at registration —
 *  the host sets it from /admin so the public Data aggregation can use it. */
export async function setGender(uid: string, gender: string) {
  await updateDoc(doc(db, 'attendees', uid), {
    gender: gender ? gender : deleteField(),
  })
}

/** Host confirmation: pending → approved (UberEats-style "確認しました"). */
export async function approveAttendee(uid: string, adminUid: string) {
  await updateDoc(doc(db, 'attendees', uid), {
    status: 'approved' as AttendeeStatus,
    approvedAt: serverTimestamp(),
    approvedBy: adminUid,
  })
}

/** Host records a guest's cancellation (heard off-app via the contact channel).
 *  Remembers the prior status so 参加に戻す can restore it. Cancelled guests drop
 *  out of the active roster and tallies. */
export async function cancelAttendee(uid: string, from: AttendeeStatus) {
  await updateDoc(doc(db, 'attendees', uid), {
    status: 'cancelled' as AttendeeStatus,
    cancelledAt: serverTimestamp(),
    cancelledFrom: from,
  })
}

/** Undo a cancellation: restore the status the guest had before cancelling
 *  (falls back to pending if unknown). */
export async function restoreAttendee(uid: string, to: AttendeeStatus) {
  await updateDoc(doc(db, 'attendees', uid), {
    status: to,
    cancelledAt: deleteField(),
    cancelledFrom: deleteField(),
  })
}

/** Fields the host fills in when adding someone manually. */
export interface AdminAddInput {
  name: string
  job?: string
  jobOther?: string
  gender?: string
  expectations?: string[]
  contactMethod?: string
  contactValue?: string
  paid?: boolean
  withKids?: boolean
  hasAllergy?: boolean
  allergyNote?: string
}

/**
 * Host adds a guest who contacted them directly and won't self-register. There
 * is no Firebase account, so the doc id is a synthetic `manual_*` (never a real
 * auth uid — no signed-in user can read/own it). Added straight as approved (the
 * host vouches). No `shares` projection is written: that public/OG card only
 * powers the SNS "I'm attending" share, which an offline guest won't do, and
 * writing it would need an extra admin-create rule on the public collection.
 * Requires `allow create: if isAdmin()` on attendees (see firestore.rules).
 */
export async function addAttendeeByAdmin(
  adminUid: string,
  input: AdminAddInput,
): Promise<AttendeeWithId> {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const id = `manual_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
  const ticketNo = generateTicketNo()

  const data: Record<string, unknown> = {
    authName: input.name, // no auth identity to mirror; reuse the display name
    name: input.name,
    status: 'approved' as AttendeeStatus,
    ticketNo,
    edition: EDITION,
    addedByAdmin: true,
    createdAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    approvedBy: adminUid,
  }
  if (input.job) data.job = input.job
  if (input.jobOther) data.jobOther = input.jobOther
  if (input.gender) data.gender = input.gender
  if (input.expectations && input.expectations.length > 0) data.expectations = input.expectations
  if (input.contactMethod) data.contactMethod = input.contactMethod
  if (input.contactValue) data.contactValue = input.contactValue
  if (input.paid) {
    data.paid = true
    data.paidAt = serverTimestamp()
  }
  if (input.withKids) data.withKids = true
  if (input.hasAllergy) data.hasAllergy = true
  if (input.allergyNote) data.allergyNote = input.allergyNote

  await setDoc(doc(db, 'attendees', id), data)

  // Local copy for the optimistic UI: serverTimestamp() resolves on the server,
  // so stand in Timestamp.now() for immediate render/sort (reload reconciles).
  const now = Timestamp.now()
  return {
    id,
    ...(data as unknown as Attendee),
    createdAt: now,
    approvedAt: now,
    ...(input.paid ? { paidAt: now } : {}),
  }
}

/**
 * Merge a manual placeholder (`addedByAdmin`, id `manual_*`) into the guest's own
 * account record (doc id == their auth uid). The ACCOUNT record SURVIVES — it is
 * what the guest owns and what backs `shares/{uid}` and /mypage — and the
 * placeholder is deleted, atomically (one batch). `fields` is the admin-resolved
 * profile set to write onto the survivor; use `deleteField()` to clear one.
 *
 * `ticketNo`/`status` are intentionally NOT merged: the public `shares/{uid}` is
 * owner-written (an admin can't touch it), and its `ticketNo` must keep matching
 * the attendee record — so the number stays the survivor's. Both writes are
 * admin-permitted (see firestore.rules: attendees update + delete if isAdmin()),
 * so this needs no rules or schema change.
 */
export async function mergeManualIntoAccount(
  survivorUid: string,
  placeholderId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const batch = writeBatch(db)
  if (Object.keys(fields).length > 0) {
    batch.update(doc(db, 'attendees', survivorUid), fields)
  }
  batch.delete(doc(db, 'attendees', placeholderId))
  await batch.commit()
}

/** Whether this uid is a host (presence of admins/{uid}). */
export async function isAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'admins', uid))
  return snap.exists()
}
