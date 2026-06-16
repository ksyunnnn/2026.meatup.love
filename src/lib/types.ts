import type { Timestamp } from 'firebase/firestore'

export type AttendeeStatus = 'pending' | 'approved' | 'rejected'

/** A registered guest. Firestore document id == Firebase Auth uid. */
export interface Attendee {
  authName: string // identity from the auth provider (source of truth for "who")
  name: string // display name; prefilled from invite ?name=, editable by the guest
  job?: string // optional
  gender?: string // optional
  status: AttendeeStatus
  ticketNo?: string // short code, e.g. "MU-2026-7Q3K"; issued at registration
  edition: string // e.g. "2026"
  invitedAs?: string // the name carried by the invite link, kept for the record
  inviteToken?: string // present when the guest arrived via a valid invite link
  createdAt: Timestamp
  approvedAt?: Timestamp
  approvedBy?: string // admin uid that approved
  // FR8 (future): a "connection"/referrer field — see docs/SPEC.md roadmap
}

/** An invite the host issues. Firestore document id == the unguessable token. */
export interface Invite {
  name?: string // prefill name for the greeting/form
  edition: string
  issuedBy: string // uid that created it (admin now; attendee-with-quota later — FR9)
  usedBy?: string // attendee uid that consumed it
  createdAt: Timestamp
}
