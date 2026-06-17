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
} from 'firebase/firestore'
import { db } from './firebase'
import type { Attendee, AttendeeStatus } from './types'
import { EDITION, generateTicketNo } from './ticket'

// Re-export so existing importers (invites.ts, admin) keep working.
export { EDITION, generateTicketNo }

export interface CreateAttendeeInput {
  uid: string
  authName: string
  name: string
  job?: string
  gender?: string
  inviteToken?: string
}

/**
 * Register a guest.
 * Invited (valid, unused token) → confirmed immediately AND the invite is
 * consumed (usedBy = this uid); otherwise → pending (host confirms later).
 * Runs in a transaction so a single invite link auto-confirms exactly one
 * person: concurrent uses of the same token retry and fall back to pending.
 */
export async function createAttendee(input: CreateAttendeeInput) {
  const ticketNo = generateTicketNo()

  await runTransaction(db, async (tx) => {
    let approved = false

    if (input.inviteToken) {
      const inviteRef = doc(db, 'invites', input.inviteToken)
      const inviteSnap = await tx.get(inviteRef)
      if (inviteSnap.exists()) {
        const inv = inviteSnap.data()
        if (inv.edition === EDITION && !('usedBy' in inv)) {
          approved = true
          tx.update(inviteRef, { usedBy: input.uid })
        }
      }
    }

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
    if (input.gender) data.gender = input.gender
    if (input.inviteToken) {
      data.inviteToken = input.inviteToken
      data.invitedAs = input.name
    }
    if (approved) data.approvedAt = serverTimestamp()

    tx.set(doc(db, 'attendees', input.uid), data)

    // Public, minimal projection for OG image generation (read without auth).
    // Holds only non-sensitive fields already printed on the shared ticket.
    tx.set(doc(db, 'shares', input.uid), {
      name: input.name,
      ticketNo,
      edition: EDITION,
    })
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
