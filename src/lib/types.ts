import type { Timestamp } from 'firebase/firestore'

export type AttendeeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

/** A registered guest. Firestore document id == Firebase Auth uid. */
export interface Attendee {
  authName: string // identity from the auth provider (source of truth for "who")
  name: string // display name; prefilled from invite ?name=, editable by the guest
  job?: string // one of the fixed job categories (for aggregation)
  jobOther?: string // free text, only when job === 'その他'
  gender?: string // 男 / 女 / その他 — assigned by the host from /admin (not asked at registration)
  expectations?: string[] // what they want from the event: meat / drink / play / connect
  contactMethod?: string // a reachable channel: LINE / Instagram / Twitter / Discord
  contactValue?: string // the id / username for contactMethod
  withKids?: boolean // 子連れの可能性あり（その他共有事項）
  hasAllergy?: boolean // アレルギーあり（その他共有事項）
  allergyNote?: string // free-text allergy details when hasAllergy
  paid?: boolean // host marks this once payment is confirmed (off-app, via PayPay/cash)
  paidAt?: Timestamp
  status: AttendeeStatus
  ticketNo?: string // short code, e.g. "MU-2026-7Q3K"; issued at registration
  edition: string // e.g. "2026"
  addedByAdmin?: boolean // host added this person manually (no account; they
  // contacted the host directly and won't self-register). No shares projection.
  invitedAs?: string // the name carried by the invite link, kept for the record
  inviteToken?: string // present when the guest arrived via a valid invite link
  createdAt: Timestamp
  approvedAt?: Timestamp
  approvedBy?: string // admin uid that approved
  // The host records a guest's cancellation here (off-app: the guest tells the
  // host via the contact channel). cancelledFrom remembers the status to return
  // to if "参加に戻す" is used. Cancelled guests leave the active roster/tallies.
  cancelledAt?: Timestamp
  cancelledFrom?: AttendeeStatus
}

/** An invite the host issues. Firestore document id == the unguessable token. */
export interface Invite {
  name?: string // prefill name for the greeting/form
  job?: string // optional job category the host pre-assigns (prefills the form)
  edition: string
  issuedBy: string // uid that created it (admin now; attendee-with-quota later — FR9)
  usedBy?: string // attendee uid that consumed it
  createdAt: Timestamp
  // Used invites can't be deleted (an attendee's inviteToken still points here
  // for referral attribution), so the host archives them to declutter the list.
  // Unused invites are deleted outright instead (that also revokes the link).
  archivedAt?: Timestamp
}
