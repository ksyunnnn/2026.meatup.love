import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  runTransaction,
  collection,
  query,
  where,
  serverTimestamp,
  deleteField,
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
export async function createAttendee(input: CreateAttendeeInput) {
  const ticketNo = generateTicketNo()

  await runTransaction(db, async (tx) => {
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
  })
}

export async function getMyAttendee(uid: string): Promise<Attendee | null> {
  const snap = await getDoc(doc(db, 'attendees', uid))
  return snap.exists() ? (snap.data() as Attendee) : null
}

/** Attendee plus its document id (== auth uid). */
export type AttendeeWithId = Attendee & { id: string }

/** All guests for this edition (admin view). Pending is derived client-side. */
export async function listAttendees(): Promise<AttendeeWithId[]> {
  const q = query(collection(db, 'attendees'), where('edition', '==', EDITION))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Attendee) }))
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

/** Whether this uid is a host (presence of admins/{uid}). */
export async function isAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'admins', uid))
  return snap.exists()
}
