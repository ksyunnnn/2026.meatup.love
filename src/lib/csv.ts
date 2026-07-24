// Attendee roster → CSV. This is the ONE place the column mapping lives, kept
// pure (no DOM) so it can be unit-tested; the admin page adds the UTF-8 BOM and
// triggers the download. Rows are ALL attendees (every status), with a `status`
// column, sorted by registration time. Note: email is NOT here — it lives in
// Firebase Auth, not the attendee doc, so the client can't read others' emails;
// the reachable contact is contactMethod/contactValue.
import type { Attendee } from './types'
import { displayRole } from './ticket'
import { EXPECTATIONS } from './profile'

export type AttendeeRow = Attendee & { id?: string }

const EXP_LABEL = new Map<string, string>(EXPECTATIONS.map((e) => [e.key, e.label]))

// A Firestore Timestamp (or anything with toMillis/toDate). Loosely typed so the
// mapping stays testable with plain fakes.
type TsLike = { toDate?: () => Date; toMillis?: () => number } | null | undefined

function fmtTs(ts: TsLike): string {
  const d = ts?.toDate?.()
  if (!d) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const COLUMNS: { header: string; value: (a: AttendeeRow) => string }[] = [
  { header: 'status', value: (a) => a.status },
  { header: '受付番号', value: (a) => a.ticketNo ?? '' },
  { header: '名前', value: (a) => a.name ?? '' },
  { header: '認証名', value: (a) => a.authName ?? '' },
  { header: '支払い', value: (a) => (a.paid ? '済' : '未') },
  { header: '職業', value: (a) => displayRole(a.job, a.jobOther) },
  { header: '性別', value: (a) => a.gender ?? '' },
  { header: '期待', value: (a) => (a.expectations ?? []).map((k) => EXP_LABEL.get(k) ?? k).join(' / ') },
  { header: '連絡手段', value: (a) => a.contactMethod ?? '' },
  { header: '連絡先', value: (a) => a.contactValue ?? '' },
  { header: '子連れ', value: (a) => (a.withKids ? '該当' : '') },
  { header: 'アレルギー', value: (a) => (a.hasAllergy ? 'あり' : '') },
  { header: 'アレルギー備考', value: (a) => a.allergyNote ?? '' },
  { header: '招待経路', value: (a) => (a.addedByAdmin ? '運営が追加' : a.inviteToken ? '招待' : '飛び込み') },
  { header: '招待名', value: (a) => a.invitedAs ?? '' },
  { header: '登録日時', value: (a) => fmtTs(a.createdAt) },
  { header: '承認日時', value: (a) => fmtTs(a.approvedAt) },
  { header: 'キャンセル日時', value: (a) => fmtTs(a.cancelledAt) },
  { header: 'ID', value: (a) => a.id ?? '' },
]

// RFC 4180 field escaping: wrap in quotes and double any inner quote whenever the
// value carries a comma, quote, or newline (free-text notes/names do).
function esc(v: string): string {
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
}

// Roster order: active first, cancelled/rejected sink to the bottom; within a
// status, oldest-first (registration order).
const STATUS_ORDER: Record<string, number> = { approved: 0, pending: 1, rejected: 2, cancelled: 3 }

/** All attendees → a CSV string (header + one row each), grouped by status
 *  (approved→pending→rejected→cancelled) then oldest-first within each. CRLF
 *  line endings so Excel treats it cleanly. */
export function attendeesToCsv(rows: AttendeeRow[]): string {
  const sorted = [...rows].sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    if (s !== 0) return s
    return (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)
  })
  const lines = [COLUMNS.map((c) => c.header).join(',')]
  for (const r of sorted) lines.push(COLUMNS.map((c) => esc(c.value(r))).join(','))
  return lines.join('\r\n')
}
