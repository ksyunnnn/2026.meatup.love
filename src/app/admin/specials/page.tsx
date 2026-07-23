'use client'
// SR / SSR 設定（Meat & Greet・issue #11 / E）。運営が当日設定。
// 高得点の人。public:true = SR（公表・/live で発光）／
// public:false = SSR（隠し。見た目は通常のまま、つながった相手にだけ分かる）。
// 隠しのほうが上位レアなのは「狙って当てにいけない」ため。
//  - bonusPoints = 通常ユーザーがその人とつながって得る点（個別）
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/lib/use-admin'
import {
  subscribeShares,
  subscribeSpecials,
  setSpecial,
  removeSpecial,
  publishStaff,
  type ShareRow,
} from '@/lib/connections'
import { Loading } from '@/components/load-state'
import type { Special } from '@/lib/types'

export default function SpecialsAdminPage() {
  const { user, admin, checked } = useAdmin()
  const [shares, setShares] = useState<ShareRow[]>([])
  const [specials, setSpecials] = useState<Map<string, Special>>(new Map())
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => subscribeShares(setShares), [])
  useEffect(() => {
    if (!admin) return
    return subscribeSpecials((m) => {
      setSpecials(m)
      setLoaded(true)
    })
  }, [admin])

  // Keep the PUBLIC staff list in sync with the public specials, so /live can
  // glow staff without reading `specials`. Only public:true uids are published;
  // hidden specials are never exposed. Waits for the first load so we don't
  // momentarily clear the list on mount.
  useEffect(() => {
    if (!admin || !loaded) return
    const staffUids = [...specials].filter(([, s]) => s.public).map(([uid]) => uid)
    publishStaff(staffUids).catch(() => {})
  }, [specials, admin, loaded])

  // Sorted by name only. Sorting the configured people to the top would make a
  // row jump away the instant it's set — with immediate save that means the row
  // moves out from under the finger, so the order stays stable instead.
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return [...shares]
      .filter((s) => !term || s.name.toLowerCase().includes(term) || (s.ticketNo ?? '').toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [shares, q])

  if (!checked) return <Loading className="flex min-h-dvh items-center justify-center" />
  if (!user || !admin)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p>運営アカウントでのログインが必要です。</p>
        <Link className="btn btn--primary" href="/invite">
          ログイン
        </Link>
      </main>
    )

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col gap-4 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-[17px] font-extrabold">SR / SSR 設定</h1>
        <Link className="text-[12px] font-bold text-ink-soft hover:underline" href="/admin">
          ← 管理
        </Link>
      </header>
      <p className="rounded-xl bg-cream px-3 py-2.5 text-[12px] leading-relaxed text-ink-soft">
この人に会った人は、1点ではなくその人のボーナス点をもらえます。点は一人ずつ決められます。
        <b className="text-flame">SR（公表）</b>は会場スクリーンで光り、誰が高得点か全員に分かります。
        <b className="text-ink">SSR（隠し）</b>はふつうの参加者と同じ見た目のまま、つながった相手にだけ分かる当たりです。
        <br />
        選ぶとすぐ保存されます。設定中：<b className="text-meat tabular-nums">{specials.size}</b> 人
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="名前・番号で検索"
        className="w-full rounded-xl border border-line px-3 py-2 text-[14px]"
      />

      <div className="flex flex-col divide-y divide-line">
        {rows.map((r) => (
          <SpecialRow
            key={r.uid}
            row={r}
            special={specials.get(r.uid) ?? null}
            busy={busy === r.uid}
            onSet={async (pts, pub) => {
              setBusy(r.uid)
              try {
                await setSpecial(r.uid, pts, pub, r.name)
              } finally {
                setBusy(null)
              }
            }}
            onRemove={async () => {
              setBusy(r.uid)
              try {
                await removeSpecial(r.uid)
              } finally {
                setBusy(null)
              }
            }}
          />
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-[13px] text-ink-soft">該当なし</p>}
      </div>
    </main>
  )
}

const DEFAULT_POINTS = 5

type Mode = 'none' | 'hidden' | 'staff'

// Most of the room is 「なし」, so that selection stays quiet — colour is spent
// only on the few rows that actually carry a bonus, which is what the host is
// scanning for. (HIG: prominence should track importance.)
const MODES: { value: Mode; label: string; selected: string }[] = [
  { value: 'none', label: 'なし', selected: 'bg-line text-ink' },
  { value: 'hidden', label: 'SSR・隠し', selected: 'bg-ink text-white' },
  { value: 'staff', label: 'SR・公表', selected: 'bg-flame text-white' },
]

/**
 * One guest's setting. The three real states (なし / SSR・隠し / SR・公表) are
 * mutually exclusive, so they're one radio group rather than a two-way toggle
 * plus a separate remove button — and every control reads its value straight
 * from the saved doc, so the row can never show something that isn't stored.
 * Changes save on the spot; there is no separate 更新 step to forget.
 */
function SpecialRow({
  row,
  special,
  busy,
  onSet,
  onRemove,
}: {
  row: ShareRow
  special: Special | null
  busy: boolean
  onSet: (points: number, isPublic: boolean) => void
  onRemove: () => void
}) {
  const mode: Mode = !special ? 'none' : special.public ? 'staff' : 'hidden'
  // The saved value is the truth; `draft` only holds a number being typed, and
  // is dropped once it's committed so the field follows the doc again.
  const [draft, setDraft] = useState<number | null>(null)
  const points = draft ?? special?.bonusPoints ?? DEFAULT_POINTS

  const pick = (next: Mode) => {
    if (next === mode) return
    if (next === 'none') {
      setDraft(points) // keep the number on screen so it isn't lost on re-select
      onRemove()
      return
    }
    setDraft(null)
    onSet(points, next === 'staff')
  }

  const commitPoints = () => {
    if (draft === null || mode === 'none' || draft === special?.bonusPoints) return
    setDraft(null)
    onSet(draft, mode === 'staff')
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold">{row.name}</div>
        <div className="text-[10px] text-ink-soft tabular-nums">
          No. {(row.ticketNo ?? '').replace(/^MU-\d+-/, '')}
        </div>
      </div>

      {/* Fixed-width slot, kept even when empty, so the controls line up in
          columns down the list instead of shifting row by row. */}
      <div className="flex w-[152px] justify-end">
        {mode !== 'none' && (
          <label className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold text-ink-soft">
            ボーナス
            <input
              type="number"
              min={1}
              value={points}
              disabled={busy}
              onChange={(e) => setDraft(Math.max(1, Number(e.target.value) || 1))}
              onBlur={commitPoints}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              aria-label={`${row.name} のボーナス点`}
              className="min-h-11 w-16 rounded-lg border border-line bg-paper px-2 text-center text-[15px] font-extrabold tabular-nums text-ink focus:border-meat focus:outline-none"
            />
            P
          </label>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label={`${row.name} の区分`}
        className="flex gap-1 rounded-xl border border-line bg-paper p-1"
      >
        {MODES.map((m) => (
          <button
            key={m.value}
            role="radio"
            aria-checked={mode === m.value}
            disabled={busy}
            onClick={() => pick(m.value)}
            className={
              'min-h-11 rounded-lg px-3 text-[12px] font-bold transition-colors disabled:opacity-50 ' +
              (mode === m.value ? m.selected : 'text-ink-soft hover:text-ink')
            }
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
