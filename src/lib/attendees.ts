import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Attendee, AttendeeStatus } from './types'

export const EDITION = '2026'

// Random short ticket code, e.g. "MU-2026-7Q3K" (no ambiguous 0/O/1/I).
export function generateTicketNo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `MU-${EDITION}-${code}`
}

// A valid, not-yet-consumed invite for this edition (mirrors firestore.rules).
async function isValidInvite(token: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'invites', token))
  if (!snap.exists()) return false
  const data = snap.data()
  return data.edition === EDITION && !('usedBy' in data)
}

export interface CreateAttendeeInput {
  uid: string
  authName: string
  name: string
  job?: string
  gender?: string
  inviteToken?: string
}

export async function createAttendee(input: CreateAttendeeInput) {
  // Invited (valid token) → confirmed immediately; otherwise awaits host confirmation.
  const approved = input.inviteToken ? await isValidInvite(input.inviteToken) : false
  const status: AttendeeStatus = approved ? 'approved' : 'pending'

  const data: Record<string, unknown> = {
    authName: input.authName,
    name: input.name,
    status,
    ticketNo: generateTicketNo(),
    edition: EDITION,
    createdAt: serverTimestamp(),
  }
  if (input.job) data.job = input.job
  if (input.gender) data.gender = input.gender
  if (input.inviteToken) {
    data.inviteToken = input.inviteToken
    data.invitedAs = input.name
  }

  await setDoc(doc(db, 'attendees', input.uid), data)
}

export async function getMyAttendee(uid: string): Promise<Attendee | null> {
  const snap = await getDoc(doc(db, 'attendees', uid))
  return snap.exists() ? (snap.data() as Attendee) : null
}

/** Attendee plus its document id (== auth uid). */
export type AttendeeWithId = Attendee & { id: string }

/**
 * Guests awaiting host confirmation for this edition.
 * Note: the edition + status filter needs a composite index in production
 * Firestore (the emulator runs it without one).
 */
export async function listPendingAttendees(): Promise<AttendeeWithId[]> {
  const q = query(
    collection(db, 'attendees'),
    where('edition', '==', EDITION),
    where('status', '==', 'pending'),
  )
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
