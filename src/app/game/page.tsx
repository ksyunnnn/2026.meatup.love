'use client'
// 参加者スマホ画面（繋がりレース・issue #11 / #13）
//  - 自分のQR（既存チケットQR /t/{uid} を流用）を相手に見せる
//  - 相手のQRをスキャン、またはチケット下4桁を手入力 → 繋がり成立（両者+1P）
//  - SSR（ボーナス点をくれる人）を引くと専用演出。誰が SSR かは引くまで分からない
//  - 自分の点数（ボーナス込み・最終集計と同じ計算）と名刺帳
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useMyAttendee } from '@/lib/use-my-attendee'
import { useGameState } from '@/lib/use-game-state'
import { qrDataUrl } from '@/lib/qr'
import { finalScoreFrom, ticketNoFromCode, uidFromQrText } from '@/lib/game'
import { createConnection, getSpecial, uidByTicketNo, type ShareRow } from '@/lib/connections'
import { Loading, RetryNotice } from '@/components/load-state'
import QrScanner from '@/components/qr-scanner'
import type { Special } from '@/lib/types'

const wrapCls =
  'flex min-h-dvh flex-col items-center gap-4 px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]'

const EXP_EMOJI: Record<string, string> = { meat: '🍖', drink: '🍺', play: '🎧', connect: '🤝' }

type Gain = { points: number; name: string; special: boolean }

export default function GamePage() {
  const { user, loading, attendee, loaded, error } = useMyAttendee()
  const { edges, shares, control } = useGameState()
  const [mode, setMode] = useState<'qr' | 'scan'>('qr')
  const [gain, setGain] = useState<Gain | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [specialsSeen, setSpecialsSeen] = useState<Record<string, Special | null>>({})
  const recent = useRef<Map<string, number>>(new Map())

  const myUid = user?.uid ?? ''
  const closed = control?.game === 'closed'

  // uids I've already connected with (from the live edge set).
  const myPartnerUids = useMemo(() => {
    const s = new Set<string>()
    for (const e of edges) {
      if (e.a === myUid) s.add(e.b)
      else if (e.b === myUid) s.add(e.a)
    }
    return s
  }, [edges, myUid])

  // Resolve specials for my partners (single-doc gets are allowed) so the 名刺帳
  // keeps its SSR marks across reloads. Only fetches uids not yet known.
  useEffect(() => {
    const unknown = [...myPartnerUids].filter((u) => !(u in specialsSeen))
    if (unknown.length === 0) return
    let active = true
    Promise.all(unknown.map(async (u) => [u, await getSpecial(u)] as const)).then((pairs) => {
      if (!active) return
      setSpecialsSeen((m) => {
        const n = { ...m }
        for (const [u, s] of pairs) n[u] = s
        return n
      })
    })
    return () => {
      active = false
    }
  }, [myPartnerUids, specialsSeen])

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2200)
  }

  const connect = useCallback(
    async (otherUid: string) => {
      if (!myUid || busy || closed) return
      // debounce the same target (the camera fires every frame)
      const now = performance.now()
      if (now - (recent.current.get(otherUid) ?? 0) < 4000) return
      recent.current.set(otherUid, now)
      setBusy(true)
      try {
        const res = await createConnection(myUid, otherUid)
        if (res === 'self') {
          flash('自分とは繋がれません')
        } else if (res === 'exists') {
          flash('もう繋がっています ✓')
        } else {
          const sp = await getSpecial(otherUid)
          setSpecialsSeen((m) => ({ ...m, [otherUid]: sp }))
          const name = shares.find((s) => s.uid === otherUid)?.name ?? 'ゲスト'
          // Same rule as the final tally (lib/game.finalScoreFrom): what you earn
          // depends only on who you met, so this never needs my own status.
          setGain({ points: sp ? sp.bonusPoints : 1, name, special: !!sp })
          setTimeout(() => setGain(null), 2400)
        }
      } catch {
        flash('うまくいきませんでした。もう一度')
      } finally {
        setBusy(false)
      }
    },
    [myUid, busy, closed, shares],
  )

  const onScan = useCallback(
    (text: string) => {
      const uid = uidFromQrText(text)
      if (uid) void connect(uid)
    },
    [connect],
  )

  const submitCode = async () => {
    const full = ticketNoFromCode(code)
    if (!full) return flash('4桁のコードを入れてください')
    const uid = await uidByTicketNo(full)
    if (!uid) return flash('その番号の人が見つかりません')
    setCode('')
    void connect(uid)
  }

  if (error && !loaded) return <RetryNotice className={wrapCls} />
  if (loading || (user && !loaded)) return <Loading className={wrapCls} />
  if (!user)
    return (
      <main className={wrapCls + ' justify-center'}>
        <p>サインインが必要です。</p>
        <Link className="btn btn--primary" href="/invite">
          招待ページへ
        </Link>
      </main>
    )
  if (!attendee)
    return (
      <main className={wrapCls + ' justify-center'}>
        <p>まだ参加登録がありません。</p>
        <Link className="btn btn--primary" href="/register">
          参加する
        </Link>
      </main>
    )

  const shareUrl = `${window.location.origin}/t/${myUid}`
  const myCode = (attendee.ticketNo ?? '').replace(/^MU-\d+-/, '') // 下4桁（口頭で伝える用）
  // My own points, with special bonuses applied — run through the SAME function
  // the host uses at the close, so this number and the final one can't disagree.
  // Showing it here leaks nothing: only my own partners are involved, and the
  // SSR overlay already told me about each of them. The projector's public
  // ranking stays connection-count only, which is what keeps hidden SSRs
  // hidden there.
  const myEdges = edges.filter((e) => e.a === myUid || e.b === myUid)
  const bonusMap = new Map<string, number>()
  for (const [uid, sp] of Object.entries(specialsSeen)) {
    if (sp) bonusMap.set(uid, sp.bonusPoints)
  }
  const myScore = finalScoreFrom(myEdges, bonusMap).get(myUid) ?? 0
  const partners = shares.filter((s) => myPartnerUids.has(s.uid))

  return (
    <main className={wrapCls} data-testid="game">
      <header className="flex w-full max-w-[440px] items-center justify-between">
        <Link className="text-[13px] font-bold text-ink-soft hover:underline" href="/mypage">
          ← マイページ
        </Link>
        <span className="text-[13px] font-bold text-meat">Meat &amp; Greet 🍖</span>
      </header>

      <div className="flex w-full max-w-[440px] items-end justify-between rounded-2xl border border-line bg-paper px-4 py-3">
        <div>
          <span className="text-[11px] font-bold text-ink-soft">いまのポイント</span>
          <div className="text-[32px] font-extrabold leading-none text-meat tabular-nums">
            <span data-testid="my-score">{myScore}</span>
            <span className="text-[15px]">P</span>
          </div>
        </div>
        <b className="text-[20px] leading-none text-ink tabular-nums">
          {myPartnerUids.size}
          <span className="text-[12px] font-bold text-ink-soft">人と交換</span>
        </b>
      </div>

      {closed ? (
        <div className="w-full max-w-[440px] rounded-2xl bg-cream px-4 py-6 text-center" data-testid="game-closed">
          <p className="text-[17px] font-extrabold">ゲームは終了しました 🎉</p>
          <p className="mt-1 text-[13px] text-ink-soft">結果はスクリーンで発表！</p>
        </div>
      ) : (
        <>
          <div className="flex w-full max-w-[440px] gap-1 rounded-full bg-line p-1">
            <button
              className={
                'flex-1 rounded-full py-2 text-[13px] font-bold ' +
                (mode === 'qr' ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft')
              }
              onClick={() => setMode('qr')}
            >
              自分のQR
            </button>
            <button
              className={
                'flex-1 rounded-full py-2 text-[13px] font-bold ' +
                (mode === 'scan' ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft')
              }
              onClick={() => setMode('scan')}
            >
              スキャン
            </button>
          </div>

          {mode === 'qr' ? (
            <div className="flex w-full max-w-[440px] flex-col items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- inline QR data-URI; next/image needs a loader (static export) and adds nothing here */}
              <img
                src={qrDataUrl(shareUrl, { light: '#ffffff' })}
                alt="あなたのQR"
                className="h-[190px] w-[190px]"
              />
              <p className="text-center text-[15px] font-extrabold">「交換しませんか？」</p>
              <p className="text-center text-[12px] text-ink-soft">相手に読んでもらうと、ふたりに +1</p>
              {myCode && (
                <div className="mt-1 flex w-full flex-col items-center gap-1 rounded-xl bg-cream px-5 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
                    あなたの番号
                  </span>
                  <span
                    className="font-mono text-[30px] font-extrabold leading-none text-meat"
                    style={{ letterSpacing: '0.32em', paddingLeft: '0.32em' }}
                    data-testid="my-code"
                  >
                    {myCode}
                  </span>
                  <span className="text-[11px] text-ink-soft">スキャンできない相手にはこの4文字を伝えて</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex w-full max-w-[440px] flex-col items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-5">
              <QrScanner active={mode === 'scan' && !closed} onResult={onScan} />
              <p className="text-[12px] text-ink-soft">相手のQR（画面 or 名札）を写す</p>
              <div className="mt-1 flex w-full items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  inputMode="text"
                  autoCapitalize="characters"
                  placeholder="番号 下4桁"
                  aria-label="チケット番号の下4桁"
                  data-testid="code-input"
                  className="w-full rounded-xl border border-line px-3 py-2 text-center text-[16px] font-bold tracking-[0.3em] tabular-nums"
                />
                <button
                  className="btn btn--primary shrink-0 px-4 py-2 text-[14px]"
                  onClick={submitCode}
                  disabled={busy}
                  data-testid="code-submit"
                >
                  つなぐ
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="w-full max-w-[440px]">
        <p className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[11px] font-bold uppercase tracking-widest text-meat">
          名刺帳 ・ {partners.length}人と交換
          <span className="normal-case tracking-normal text-ink-soft">
            SSR＝多く点をくれる人
          </span>
        </p>
        {partners.length === 0 ? (
          <p className="rounded-xl bg-cream px-3 py-4 text-center text-[13px] text-ink-soft">
            まだ交換していません。となりの人と繋がろう！
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2" data-testid="meishi">
            {partners.map((p) => (
              <Card key={p.uid} row={p} special={specialsSeen[p.uid] ?? null} />
            ))}
          </div>
        )}
      </div>

      {/* 会場スクリーン(/live)への覗き見リンク。ゲームに入った人だけが見つけられる控えめな配置 */}
      <Link
        href="/live"
        className="inline-flex items-center gap-1 text-[13px] font-bold text-ink-soft underline-offset-2 hover:text-meat hover:underline"
      >
        会場スクリーンを見る ↗
      </Link>

      {notice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-white shadow-lg">
          {notice}
        </div>
      )}

      {gain && <GainOverlay gain={gain} />}
    </main>
  )
}

function GainOverlay({ gain }: { gain: Gain }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2"
      style={{
        background: gain.special
          ? 'radial-gradient(120% 100% at 50% 40%, rgba(255,101,0,.22), rgba(255,247,239,.97))'
          : 'radial-gradient(120% 100% at 50% 40%, rgba(179,61,68,.14), rgba(255,247,239,.97))',
      }}
      aria-live="assertive"
      data-testid="gain"
    >
      {gain.special && (
        <span className="rounded-pill bg-flame px-4 py-1 text-[22px] font-extrabold tracking-[0.12em] text-white">
          SSR
        </span>
      )}
      <span className="oniku-bounce text-[40px]">🍖</span>
      <span className={'text-[32px] font-extrabold ' + (gain.special ? 'text-flame' : 'text-meat')}>
        +{gain.points}
        <span className="text-[16px]">P</span>
      </span>
      <span className="text-[14px] font-bold text-ink">{gain.name} と繋がった</span>
    </div>
  )
}

function Card({ row, special }: { row: ShareRow; special: Special | null }) {
  const isSp = !!special
  return (
    <div
      className={
        'relative rounded-xl border border-line bg-paper px-2.5 py-2 ' +
        (isSp ? 'bg-gradient-to-b from-white to-[#fff2e6]' : '')
      }
    >
      {/* Rarity stamp, gacha-card style: top-right, breaking the card's own edge
          so it reads as stamped ON the card rather than printed in it. */}
      {special && (
        <span
          aria-hidden
          className="ssr-stamp pointer-events-none absolute -right-0.5 -top-1 z-10 text-[14px] font-black leading-none"
        >
          SSR
        </span>
      )}
      <div className={'text-[12.5px] font-extrabold leading-tight ' + (isSp ? 'pr-6' : '')}>
        {row.name}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5 text-[10px] tabular-nums text-ink-soft">
        {row.ticketNo && <span>No. {row.ticketNo.replace(/^MU-\d+-/, '')}</span>}
        {special && (
          <span className="font-extrabold text-flame">
            <span className="sr-only">SSR ボーナス </span>+{special.bonusPoints}P
          </span>
        )}
      </div>
      <div className="mt-1 text-[12px]">
        {(row.expectations ?? []).map((e) => EXP_EMOJI[e] ?? '').join(' ')}
      </div>
    </div>
  )
}
