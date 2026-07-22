'use client'
// 司会 remote（Meat & Greet・issue #11 / #15）。スマホでもPC別タブでも開ける。
// control doc を更新するだけ＝プロジェクター(/live)は listen して反映。
//
// Laid out as the running order the host actually follows — 開催 → 順位を伏せる
// → 締める → 結果発表 — with the current step marked, because during the event
// there is no time to work out which control does what.
//
// Every step is reversible, and says so: 締める can be undone with 開催に戻す
// (the score is just recomputed), the reveal can be taken back down, and the
// ranking toggle was always two-way. The confirm on 締める guards the tap; being
// able to go back is what actually makes it safe.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/lib/use-admin'
import { subscribeControl, patchControl, computeAndWriteResults } from '@/lib/connections'
import { Loading } from '@/components/load-state'
import type { GameControl } from '@/lib/types'

export default function ControlPage() {
  const { user, admin, checked } = useAdmin()
  const [control, setControl] = useState<GameControl | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)

  useEffect(() => subscribeControl(setControl), [])

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label)
    setMsg('')
    try {
      await fn()
      setMsg('反映しました ✓')
    } catch {
      setMsg('失敗しました。もう一度')
    } finally {
      setBusy(null)
      setTimeout(() => setMsg(''), 2500)
    }
  }

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

  const game = control?.game ?? 'open'
  const ranking = control?.ranking ?? 'shown'
  const reveal = control?.reveal ?? 0
  const open = game === 'open'
  const revealing = reveal > 0
  // Where the host is right now. Only one step is "いま", so the screen answers
  // "what do I press next?" without reading every row.
  const current = open ? (ranking === 'mosaic' ? 2 : 1) : 4

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col gap-3 px-4 py-7">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[15px] font-extrabold">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: open ? '#2fbf71' : '#b9a99e' }}
          />
          Meat &amp; Greet 進行
        </span>
        <Link
          className="text-[12px] font-bold text-ink-soft hover:underline"
          href="/live"
          target="_blank"
        >
          会場スクリーン ↗
        </Link>
      </header>

      <Step n={1} title={open ? '開催中' : '終了'} state={open ? (current === 1 ? 'now' : 'done') : 'done'}>
        <p className={subCls}>
          {open
            ? '参加者どうしがQRを見せ合って繋がれます。'
            : 'スキャンは止まっています。もう一度つなげたいときは開催に戻せます。'}
        </p>
        {!open && (
          <button
            className={quietBtn}
            disabled={busy !== null}
            onClick={() => run('open', () => patchControl({ game: 'open' }))}
          >
            {busy === 'open' ? '戻しています…' : '開催に戻す'}
          </button>
        )}
      </Step>

      <Step n={2} title="順位の見せ方" state={current === 2 ? 'now' : 'idle'}>
        <p className={subCls}>発表前に伏せると、スクリーンの順位がモザイクになります（グラフは出たまま）。</p>
        <Seg
          value={ranking}
          options={[
            ['shown', '見せる'],
            ['mosaic', '伏せる'],
          ]}
          busy={busy === 'ranking'}
          onPick={(v) => run('ranking', () => patchControl({ ranking: v as 'shown' | 'mosaic' }))}
        />
      </Step>

      <Step n={3} title="ゲームを締める" state={open ? 'idle' : 'done'}>
        {open ? (
          confirmClose ? (
            <div className="flex flex-col gap-2 rounded-xl bg-cream p-3">
              <p className="text-[12.5px] leading-relaxed text-ink">
                締めるとスキャンが止まり、順位が確定します。
                <br />
                <b>あとで「開催に戻す」で再開できます。</b>
              </p>
              <div className="flex gap-2">
                <button className={quietBtn} onClick={() => setConfirmClose(false)}>
                  やめる
                </button>
                <button
                  className="min-h-11 flex-1 rounded-xl px-4 text-[13.5px] font-extrabold text-white disabled:opacity-50"
                  style={{ background: '#b33d44' }}
                  disabled={busy !== null}
                  onClick={() =>
                    run('close', async () => {
                      await patchControl({ game: 'closed' })
                      await computeAndWriteResults()
                      setConfirmClose(false)
                    })
                  }
                >
                  {busy === 'close' ? '集計中…' : '締める'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={subCls}>スキャンを止めて、順位を確定します。</p>
              <button className={quietBtn} onClick={() => setConfirmClose(true)}>
                ゲームを締める
              </button>
            </>
          )
        ) : (
          <p className={subCls}>締めました。順位は確定しています。</p>
        )}
      </Step>

      <Step n={4} title="結果発表" state={open ? 'idle' : current === 4 ? 'now' : 'idle'}>
        <p className={subCls}>
          {open
            ? '「締める」で順位を確定してから発表できます。'
            : revealing
              ? 'スクリーンに表彰台が出ています。もう一度押すと演出をやり直せます。'
              : 'スクリーンに表彰台を出します。'}
        </p>
        <div className="flex gap-2">
          <button
            className="min-h-11 flex-1 rounded-xl px-4 text-[13.5px] font-extrabold text-white disabled:opacity-40"
            style={{ background: '#ff6500' }}
            disabled={busy !== null || open}
            onClick={() => run('reveal', () => patchControl({ reveal: reveal + 1 }))}
          >
            {revealing ? '▶ もう一度' : '▶ 結果を出す'}
          </button>
          {revealing && (
            <button
              className={quietBtn}
              disabled={busy !== null}
              onClick={() => run('hide', () => patchControl({ reveal: 0 }))}
            >
              {busy === 'hide' ? '閉じています…' : '発表を閉じる'}
            </button>
          )}
        </div>
      </Step>

      {!control && (
        <button
          className={quietBtn}
          onClick={() => run('init', () => patchControl({ game: 'open', ranking: 'shown', reveal: 0 }))}
        >
          ゲームを初期化する
        </button>
      )}

      <p className="min-h-[20px] text-center text-[13px] font-bold text-ink-soft" aria-live="polite">
        {msg}
      </p>

      <p className="mt-auto rounded-xl bg-cream px-3 py-3 text-[11.5px] leading-relaxed text-ink-soft">
        🛟 電波が届かないときは、会場PCの画面で <b>L</b>（順位の表示）と <b>R</b>（結果の再生）を直接押せます。
        その2つはその画面だけの操作なので、ここより優先されます。締めるのは集計が要るので、この画面から行ってください。
      </p>
    </main>
  )
}

const subCls = 'text-[12.5px] leading-relaxed text-ink-soft'
const quietBtn =
  'min-h-11 rounded-xl border-2 border-line bg-paper px-4 text-[13px] font-bold text-ink hover:border-meat hover:text-meat disabled:opacity-50'

/** One step of the running order, tagged with where the host is. */
function Step({
  n,
  title,
  state,
  children,
}: {
  n: number
  title: string
  state: 'now' | 'done' | 'idle'
  children: React.ReactNode
}) {
  return (
    <section
      className={
        'flex flex-col gap-2 rounded-2xl border-2 p-4 ' +
        (state === 'now' ? 'border-meat bg-paper' : 'border-line bg-paper')
      }
    >
      <h2 className="flex items-center gap-2 text-[14.5px] font-extrabold">
        <span
          className={
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ' +
            (state === 'now' ? 'bg-meat text-white' : 'bg-line text-ink-soft')
          }
        >
          {n}
        </span>
        {title}
        {state === 'now' && (
          <span className="ml-auto rounded-pill bg-meat px-2 py-0.5 text-[10px] font-bold text-white">
            いま
          </span>
        )}
        {state === 'done' && <span className="ml-auto text-[10px] font-bold text-ink-soft">済み</span>}
      </h2>
      {children}
    </section>
  )
}

function Seg({
  value,
  options,
  onPick,
  busy,
}: {
  value: string
  options: [string, string][]
  onPick: (v: string) => void
  busy: boolean
}) {
  return (
    <div role="radiogroup" className="flex gap-1 rounded-xl border border-line bg-paper p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          disabled={busy}
          onClick={() => onPick(v)}
          className={
            'min-h-11 flex-1 rounded-lg text-[13px] font-bold transition-colors disabled:opacity-50 ' +
            (value === v ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink')
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}
