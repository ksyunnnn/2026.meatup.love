import { describe, it, expect } from 'vitest'
import { attendeesToCsv, type AttendeeRow } from '../../src/lib/csv'

// Minimal Timestamp fake — attendeesToCsv only needs toMillis (sort) + toDate (format).
const ts = (iso: string) => ({ toMillis: () => new Date(iso).getTime(), toDate: () => new Date(iso) })

function row(over: Partial<AttendeeRow>): AttendeeRow {
  return {
    authName: 'auth',
    name: 'name',
    status: 'approved',
    edition: '2026',
    createdAt: ts('2026-07-01T10:00:00') as unknown as AttendeeRow['createdAt'],
    ...over,
  } as AttendeeRow
}

describe('attendeesToCsv', () => {
  it('emits the header row with a status column first', () => {
    const [header] = attendeesToCsv([]).split('\r\n')
    expect(header.startsWith('status,受付番号,名前,認証名,支払い,')).toBe(true)
    expect(header).toContain('招待経路')
    expect(header).toContain('登録日時')
  })

  it('maps a full row: booleans, expectations labels, invite path, timestamps', () => {
    const csv = attendeesToCsv([
      row({
        id: 'uid1',
        ticketNo: 'MU-2026-7Q3K',
        name: 'さとし',
        paid: true,
        job: 'その他',
        jobOther: '猟師',
        gender: '男',
        expectations: ['meat', 'connect'],
        contactMethod: 'LINE',
        contactValue: 'satoshi_line',
        withKids: true,
        hasAllergy: true,
        allergyNote: 'えび',
        inviteToken: 'tok',
        invitedAs: 'さとしさん',
        approvedAt: ts('2026-07-02T09:30:00') as unknown as AttendeeRow['approvedAt'],
      }),
    ])
    const dataRow = csv.split('\r\n')[1]
    expect(dataRow).toContain('approved,MU-2026-7Q3K,さとし,auth,済,猟師,男,')
    expect(dataRow).toContain('肉 / 繋がり') // expectation KEYS resolved to labels
    expect(dataRow).toContain('LINE,satoshi_line,該当,あり,えび,')
    expect(dataRow).toContain('招待,さとしさん,')
    expect(dataRow).toContain('2026-07-01 10:00') // 登録日時
    expect(dataRow).toContain('2026-07-02 09:30') // 承認日時
    expect(dataRow.endsWith('uid1')).toBe(true) // ID last
  })

  it('escapes commas, quotes and newlines (RFC 4180)', () => {
    const csv = attendeesToCsv([row({ name: 'a,b', allergyNote: 'say "hi"\nnext' })])
    const dataRow = csv.split('\r\n').slice(1).join('\r\n')
    expect(dataRow).toContain('"a,b"')
    expect(dataRow).toContain('"say ""hi""\nnext"')
  })

  it('distinguishes invite path and payment across statuses', () => {
    const csv = attendeesToCsv([
      row({ addedByAdmin: true, paid: false, status: 'approved', createdAt: ts('2026-07-01T08:00:00') as unknown as AttendeeRow['createdAt'] }),
      row({ status: 'pending', paid: false, createdAt: ts('2026-07-01T09:00:00') as unknown as AttendeeRow['createdAt'] }),
    ])
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('運営が追加')
    expect(lines[1]).toContain(',未,') // unpaid
    expect(lines[2]).toContain('飛び込み') // no invite, not admin-added
  })

  it('within a status, sorts oldest-first by createdAt', () => {
    const csv = attendeesToCsv([
      row({ name: 'late', createdAt: ts('2026-07-03T00:00:00') as unknown as AttendeeRow['createdAt'] }),
      row({ name: 'early', createdAt: ts('2026-07-01T00:00:00') as unknown as AttendeeRow['createdAt'] }),
    ])
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('early')
    expect(lines[2]).toContain('late')
  })

  it('groups by status: approved→pending→rejected→cancelled (cancelled last)', () => {
    const csv = attendeesToCsv([
      row({ name: 'C', status: 'cancelled' }),
      row({ name: 'R', status: 'rejected' }),
      row({ name: 'A', status: 'approved' }),
      row({ name: 'P', status: 'pending' }),
    ])
    const names = csv.split('\r\n').slice(1).map((l) => l.split(',')[2])
    expect(names).toEqual(['A', 'P', 'R', 'C'])
  })
})
