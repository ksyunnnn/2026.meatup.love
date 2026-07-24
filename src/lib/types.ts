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

// ---- 会場交流ポイントゲーム「繋がりレース」(see issue #11) ----

/** One undirected edge in the connection game. Document id == connectionId(a,b)
 *  (the two uids sorted + joined), so a pair is a single doc and can't repeat. */
export interface Connection {
  a: string // the lexicographically smaller of the two uids
  b: string // the larger uid
  by: string // uid of the participant who scanned (created) the edge
  edition: string
  createdAt: Timestamp
}

/** Marks a guest who awards bonus points when a normal guest connects to them.
 *  Document id == the guest's uid. Set by the host from /admin. */
export interface Special {
  bonusPoints: number // points the normal scanner earns from this connection
  public: boolean // true = staff (glows on the projector); false = hidden special
  name?: string // optional label for the host's admin list (never shown publicly)
  edition: string
}

/** Live game + projector display state. Document id == edition. Host-controlled
 *  from /control; the projector and phones read it. */
export interface GameControl {
  game: 'open' | 'closed' // closed freezes scanning and the ranking
  ranking: 'shown' | 'mosaic' // mosaic hides the standings while the graph grows
  reveal: number // bump this to (re)play the results animation on the projector
  replay?: number // bump this to (re)play the connection-forming replay (VTR)
  edition: string
  updatedAt: Timestamp
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
