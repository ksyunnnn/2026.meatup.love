import {
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { EDITION } from './attendees'
import type { Invite } from './types'

/** Unguessable 128-bit token, hex-encoded (32 chars). */
export function generateToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Invite plus its document id (== the token). */
export type InviteWithToken = Invite & { token: string }

/**
 * FR9: how many invite links one confirmed attendee may issue. Soft, UI-enforced
 * — it is NOT a security boundary (attendee-issued invites don't auto-confirm
 * anyone; the host still approves), and Firestore rules can't count documents
 * without Cloud Functions (NFR1 $0). Admins are unlimited.
 */
export const INVITE_QUOTA = 3

/** Issue an invite (host, or a confirmed attendee under FR9). Returns the token.
 *  `job` lets the host pre-assign a job category that prefills the form. */
export async function createInvite(
  issuerUid: string,
  name?: string,
  job?: string,
): Promise<string> {
  const token = generateToken()
  const data: Record<string, unknown> = {
    edition: EDITION,
    issuedBy: issuerUid,
    createdAt: serverTimestamp(),
  }
  if (name) data.name = name
  if (job) data.job = job
  await setDoc(doc(db, 'invites', token), data)
  return token
}

/** All invites for this edition (admin view). */
export async function listInvites(): Promise<InviteWithToken[]> {
  const q = query(collection(db, 'invites'), where('edition', '==', EDITION))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ token: d.id, ...(d.data() as Invite) }))
}

/** Revoke an unused invite by deleting it. Deletion is the revoke: validInvite()
 *  in firestore.rules checks exists(), so a gone doc can no longer be consumed.
 *  Safe only for unused links — no attendee's inviteToken points at them. */
export async function deleteInvite(token: string) {
  await deleteDoc(doc(db, 'invites', token))
}

/** Archive a used invite: hide it from the active list without deleting it, so
 *  the attendee's referral attribution (which reads this doc by token) survives. */
export async function archiveInvite(token: string) {
  await updateDoc(doc(db, 'invites', token), { archivedAt: serverTimestamp() })
}

/** Bring an archived invite back into the active list. */
export async function unarchiveInvite(token: string) {
  await updateDoc(doc(db, 'invites', token), { archivedAt: deleteField() })
}

/** Invites issued by a given user (FR9: an attendee's own invite slots). */
export async function listMyInvites(uid: string): Promise<InviteWithToken[]> {
  const q = query(
    collection(db, 'invites'),
    where('edition', '==', EDITION),
    where('issuedBy', '==', uid),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ token: d.id, ...(d.data() as Invite) }))
}
