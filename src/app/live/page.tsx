'use client'
// プロジェクター表示（Meat & Greet・issue #11 / #14）。**閲覧はログイン必須**
// （admin までは不要。参加者も /mypage・/game のリンクから開ける）。
//  - 主役＝ソーシャルグラフ（育つ・SR は発光）／ランキング／結果発表
//  - レイアウトは 1600×900 の固定ステージ。画面幅に合わせて丸ごと縮小フィット
//    （レターボックス）＝プロジェクターでもスマホでも「配置は完全に同じ」。
//  - ランキングはボーナス込みのポイント。点の跳ね方から SSR を推測できるが、
//    それは許容した設計（理由は firestore.rules の specials ブロック）。
//  - フェイルセーフ（L/R・ローカル操作）は admin のときだけ。ランキング表示/非表示は
//    誰でも（自分の画面だけ・モザイクは解除できない）。
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/lib/use-admin'
import { useGameState } from '@/lib/use-game-state'
import { subscribeNewConnections } from '@/lib/connections'
import { finalScoreFrom, rankFrom, type Edge } from '@/lib/game'
import type { Connection } from '@/lib/types'
import ConnectionGraph from '@/components/connection-graph'
import EventLogo from '@/components/event-logo'
import { Loading } from '@/components/load-state'

interface GreetToast {
  id: number
  a: string
  b: string
}

// The whole connection replay plays over this fixed span (host-triggered from
// /control). Length barely affects how it's remembered (peak-end / duration
// neglect) — the completed graph + final ranking are simply held afterwards.
const REPLAY_MS = 32000

// HH:MM of a Firestore Timestamp, for the replay timecode. Guarded because a
// just-written edge can briefly carry a null serverTimestamp.
function hhmm(ts: Connection['createdAt'] | null | undefined): string {
  const d = ts?.toDate?.()
  if (!d) return ''
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

const STAGE_W = 1600
const STAGE_H = 900

// Safari (Mac/iPad) still exposes the Fullscreen API under a webkit prefix, so
// we probe both. iPhone Safari implements NEITHER for non-video elements
// (confirmed missing by Apple as of 2024/12), so support-detection here also
// doubles as "don't show a dead button on iPhone".
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void }
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void
  webkitFullscreenEnabled?: boolean
}

// Fullscreen state read as an external store (no setState-in-effect). Snapshots
// return stable primitives, and the server snapshot is false so static export
// renders a consistent tree.
const noopSubscribe = () => () => {}
function subscribeFs(cb: () => void) {
  document.addEventListener('fullscreenchange', cb)
  document.addEventListener('webkitfullscreenchange', cb)
  return () => {
    document.removeEventListener('fullscreenchange', cb)
    document.removeEventListener('webkitfullscreenchange', cb)
  }
}
function isFsSnapshot() {
  const doc = document as FsDocument
  return !!(document.fullscreenElement || doc.webkitFullscreenElement)
}
function fsSupportedSnapshot() {
  const doc = document as FsDocument
  const el = document.documentElement as FsElement
  return !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled) && !!(el.requestFullscreen || el.webkitRequestFullscreen)
}

export default function LivePage() {
  const { user, admin, checked } = useAdmin() // 閲覧はログインだけ必須（admin不要）。直操作の可否は admin
  const { edges, shares, control, ranking, results, staff, specials, ready } = useGameState()
  const [ovRanking, setOvRanking] = useState<'shown' | 'mosaic' | null>(null)
  const [showRanking, setShowRanking] = useState(true)
  const [barVisible, setBarVisible] = useState(true) // [TAP-TOGGLE trial] 画面タップで操作バーを出し入れ
  // Local failsafe override of the shared reveal, tagged with the reveal number
  // it was made against. `n` re-keys the animation when R is pressed repeatedly.
  const [ov, setOv] = useState<{ rev: number; on: boolean; n: number } | null>(null)
  const [scale, setScale] = useState(1)
  // Fullscreen: `supported` gates the button (false on iPhone / at build time so
  // static export never touches `document`); `isFs` keeps the label in sync even
  // when the user exits via Esc / the system gesture.
  const fsSupported = useSyncExternalStore(noopSubscribe, fsSupportedSnapshot, () => false)
  const isFs = useSyncExternalStore(subscribeFs, isFsSnapshot, () => false)

  // つながり速報: a fresh toast per NEW edge (existing edges on load never fire).
  const [toasts, setToasts] = useState<GreetToast[]>([])
  const toastIdRef = useRef(0)
  // Latest name map, read inside the (long-lived) subscription callback so it
  // always resolves against current shares without re-subscribing.
  const nameOfRef = useRef(new Map<string, string>())
  useEffect(() => {
    nameOfRef.current = new Map(shares.map((s) => [s.uid, s.name]))
  }, [shares])

  // つながりリプレイ: host bumps control.replay → the graph rebuilds from empty in
  // createdAt order and the ranking re-scores each step. `replayShown` = how many
  // edges are revealed (null = not replaying). Edges sorted in a ref so the loop
  // reads them without re-subscribing.
  const sorted = useMemo(
    () => [...edges].sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)),
    [edges],
  )
  const sortedRef = useRef(sorted) // for the rAF loop (effect reads refs, render reads `sorted`)
  useEffect(() => {
    sortedRef.current = sorted
  }, [sorted])
  const replayNonce = control?.replay ?? 0
  const [replayShown, setReplayShown] = useState<number | null>(null)
  useEffect(() => {
    if (replayNonce <= 0) return
    const total = sortedRef.current.length
    if (total === 0) return
    // rAF loop — setState only in the callback (not the effect body), so this
    // stays clear of react-hooks/set-state-in-effect.
    let raf = 0
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / REPLAY_MS)
      setReplayShown(Math.max(1, Math.round(p * total)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [replayNonce, ready])

  // If the host reopens the game after a replay ("開催に戻す"), drop the finished
  // replay so /live returns to true live mode and new connections show again —
  // every /control step is reversible. This is React's "adjust state during
  // render" pattern (not an effect), so it doesn't trip set-state-in-effect and
  // it applies before paint (no frozen frame). Guarded, so it can't loop.
  if (control?.game === 'open' && replayShown !== null) {
    setReplayShown(null)
  }

  // Scale the fixed stage to fit the viewport (letterbox) — identical layout
  // everywhere. Kept in React state (not an imperative ref) so it's applied
  // whenever the stage renders — including after the auth gate resolves.
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H))
    fit()
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    return () => {
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
    }
  }, [])

  // Subscribe once. setState lives in the snapshot/timeout callbacks (not the
  // effect body), so it doesn't trip react-hooks/set-state-in-effect. Each toast
  // auto-dismisses after ~4.2s; the stack collapses to 3 + "+N".
  useEffect(() => {
    return subscribeNewConnections((edge) => {
      const id = ++toastIdRef.current
      const a = nameOfRef.current.get(edge.a) ?? '—'
      const b = nameOfRef.current.get(edge.b) ?? '—'
      setToasts((ts) => [...ts, { id, a, b }])
      setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4200)
    })
  }, [])

  const toggleFs = useCallback(() => {
    const doc = document as FsDocument
    const el = document.documentElement as FsElement
    // Swallow rejections: a denied request (e.g. no user gesture) must not
    // surface as an unhandled rejection in the projector's console.
    if (!(document.fullscreenElement || doc.webkitFullscreenElement)) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen()
    }
  }, [])

  // Shared reveal, driven by control.reveal: 0 = not showing, any higher number
  // = showing, and a bump to a new number replays the animation. Because 0 is a
  // real state rather than just a starting value, the host can take the reveal
  // back down from /control — the projector isn't stuck on it until someone
  // walks over to the venue PC and presses Escape.
  //
  // The local failsafe override remembers WHICH reveal it was made against, so
  // the moment the host changes theirs it stops applying on its own. That keeps
  // this whole thing derived — no effect syncing state to state.
  const reveal = control?.reveal ?? 0
  const localOv = ov && ov.rev === reveal ? ov : null
  const resultsOn = localOv ? localOv.on : reveal > 0
  const replayKey = `${reveal}-${localOv?.n ?? 0}`
  const bumpLocalReveal = useCallback(
    () => setOv((o) => ({ rev: reveal, on: true, n: (o && o.rev === reveal ? o.n : 0) + 1 })),
    [reveal],
  )

  // keyboard failsafe — admin only, purely LOCAL (never written to Firestore)
  useEffect(() => {
    if (!admin) return
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'l') setOvRanking((v) => ((v ?? control?.ranking) === 'mosaic' ? 'shown' : 'mosaic'))
      else if (k === 'r') {
        bumpLocalReveal()
      } else if (k === 'escape') setOv({ rev: reveal, on: false, n: 0 })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [admin, control?.ranking, reveal, bumpLocalReveal])

  // 認証ゲート：閲覧にはログインが必要（admin までは不要）
  if (!checked) return <Loading className="flex min-h-dvh items-center justify-center" />
  if (!user)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[15px]">この画面を見るにはログインが必要です。</p>
        <Link className="btn btn--primary" href="/invite">
          ログイン
        </Link>
      </main>
    )

  const rankingMode = ovRanking ?? (control?.ranking === 'mosaic' ? 'mosaic' : 'shown')
  const nameOf = new Map(shares.map((s) => [s.uid, s.name]))
  const podium = results ?? []

  // Replay-aware views: during a replay everything reflects only the edges
  // revealed so far, so the graph, the ranking and the counter all rewind and
  // rebuild in step. Held on the finished state once complete.
  const replayTotal = sorted.length
  const replayActive = replayShown !== null
  const replaying = replayActive && (replayShown as number) < replayTotal // still building
  const shownEdges = replayActive ? sorted.slice(0, replayShown as number) : edges
  const bonus = new Map([...specials].map(([uid, s]) => [uid, s.bonusPoints]))
  const activeRanking = replayActive ? rankFrom(finalScoreFrom(shownEdges as Edge[], bonus)) : ranking
  const top3 = new Set(activeRanking.slice(0, 3).map((r) => r.uid))
  const total = replayActive ? (replayShown as number) : edges.length
  const replayTime =
    replayActive && (replayShown as number) > 0
      ? hhmm(sorted[(replayShown as number) - 1]?.createdAt)
      : ''

  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={{ background: '#0f0a0b' }}
      onClick={() => setBarVisible((v) => !v)} // [TAP-TOGGLE trial] 画面タップでバー切替
    >
      {/* fixed-size projector stage, scaled to fit (letterbox) — same on all devices */}
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transformOrigin: 'center',
          transform: `translate(-50%,-50%) scale(${scale})`,
          background: 'radial-gradient(120% 130% at 30% 15%, #241619, #171012)',
        }}
      >
        <div className="absolute inset-0">
          {/* Remount for a replay so the graph starts empty and rebuilds; back to
              the live instance ('live') otherwise. */}
          <ConnectionGraph
            key={replayActive ? `replay-${replayNonce}` : 'live'}
            nodes={shares.map((s) => ({ uid: s.uid, name: s.name }))}
            edges={shownEdges}
            staff={staff}
            top3={top3}
          />
        </div>

        {/* 左上＝イベントのブランドロゴ（会場常設・撮影背景で何のイベントか伝える）。
            チケット/OGP の意匠を踏襲。ゲーム名は右上スコアボードへ移設した。 */}
        <EventLogo variant="A" />

        {/* 右上＝スコアボード。ゲーム名「Meat & Greet」はその見出し（アイブロウ）
            として統合し、ランキングを隠していても常時表示する。 */}
        <div className="absolute right-6 top-6 flex w-[380px] flex-col items-end gap-3">
          <div className="flex items-center gap-2.5 text-[20px] font-extrabold text-[#f6e6d8]">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#ff6500', boxShadow: '0 0 14px #ff6500' }} />
            Meat &amp; Greet
          </div>

          {showRanking && (
            <div
              className="w-full rounded-2xl p-4"
              style={{ background: 'rgba(20,12,13,.62)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,220,190,.1)' }}
            >
              {/* Bonus-inclusive points — the same number each guest sees on their
                  own phone, so this board IS the standing rather than a proxy for
                  it. A hidden SSR can therefore be inferred from a big jump; that
                  is accepted (see the `specials` block in firestore.rules). */}
              <h3 className="mb-3 text-[18px] font-extrabold" style={{ color: '#ffd9b0' }}>
                🏆 ポイントランキング
              </h3>
              <div className="relative">
                <div style={rankingMode === 'mosaic' ? { filter: 'blur(9px)', opacity: 0.85 } : undefined}>
                  <RankingBoard list={activeRanking} nameOf={nameOf} />
                </div>
                {rankingMode === 'mosaic' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[34px]">🙈</span>
                    <small className="mt-1 text-[15px] font-bold" style={{ color: '#ffd9b0' }}>順位は伏せ中</small>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* つながり速報 — Sonner-style stack, bottom-left, sitting above the
            counter. Newest at the bottom (front); older ones scale/fade behind,
            with the rest collapsed into a "+N件" badge. Hidden during a replay. */}
        {!replayActive && toasts.length > 0 && (
          <div className="absolute left-7" style={{ bottom: 84, width: 360, zIndex: 15 }}>
            {toasts.length > 3 && (
              <div className="absolute left-1 text-[15px] font-extrabold" style={{ bottom: 108, color: '#b49b8c' }}>
                +{toasts.length - 3} 件
              </div>
            )}
            {toasts.slice(-3).map((t, i, arr) => {
              const rev = arr.length - 1 - i // 0 = newest (front)
              return (
                <div
                  key={t.id}
                  className="absolute inset-x-0"
                  style={{
                    bottom: 0,
                    zIndex: 100 - rev,
                    transform: `translateY(${-rev * 16}px) scale(${1 - rev * 0.05})`,
                    opacity: 1 - rev * 0.14,
                    transition: 'transform .4s cubic-bezier(.2,1,.3,1), opacity .4s',
                  }}
                >
                  <div
                    className="flex flex-col gap-0.5 rounded-2xl px-5 py-3.5"
                    style={{
                      background: 'rgba(28,18,17,.95)',
                      border: '1px solid rgba(255,138,61,.34)',
                      boxShadow: '0 16px 36px -14px rgba(0,0,0,.75)',
                      animation: 'toastin .42s cubic-bezier(.2,1,.3,1) both',
                    }}
                  >
                    <span className="text-[13px] font-black tracking-[0.14em]" style={{ color: '#ff6500' }}>
                      JUST MEAT!
                    </span>
                    <span className="text-[22px] font-extrabold" style={{ color: '#f6e6d8' }}>
                      {t.a} <span className="mx-0.5">🤝</span> {t.b}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="absolute bottom-6 left-7 text-[17px]" style={{ color: '#e9d6c6' }}>
          累計つながり <b className="text-[22px] text-white tabular-nums">{total}</b> 本 ・ 参加{' '}
          <b className="text-[22px] text-white tabular-nums">{shares.length}</b> 人
        </div>

        {/* REPLAY indicator + the real time of the connection currently lighting
            up. Only while the replay is still building; it clears on completion,
            leaving the finished graph + final ranking held. */}
        {replaying && (
          <div className="absolute bottom-6 right-7 text-right">
            <div className="flex items-center justify-end gap-2 text-[13px] font-black tracking-[0.16em]" style={{ color: '#f4a047' }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#ff3b3b', boxShadow: '0 0 10px #ff3b3b', animation: 'recblink 1s steps(2,end) infinite' }} />
              REPLAY
            </div>
            <div className="text-[34px] font-extrabold tabular-nums leading-none" style={{ color: '#f6e6d8' }}>
              {replayTime}
            </div>
          </div>
        )}

        {resultsOn && (
          <div
            key={replayKey}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2"
            style={{ background: 'radial-gradient(120% 120% at 50% 0%, #2a181b, #140c0d)' }}
            data-testid="results"
          >
            <h2 className="mb-5 text-[40px] font-extrabold tracking-wider" style={{ color: '#ffd9b0' }}>
              🍖 結果発表 🍖
            </h2>
            {podium.length === 0 ? (
              // Two different empty states: nothing computed yet, versus computed
              // but nobody connected. Saying "締めると出ます" after it's been
              // closed would just be wrong.
              <p className="text-[22px]" style={{ color: '#e9d6c6' }}>
                {control?.game === 'closed' ? 'まだ誰もつながっていません' : 'ゲームを締めると結果が出ます'}
              </p>
            ) : (
              <div className="flex items-end gap-7">
                {[podium[1], podium[0], podium[2]].map((e, idx) => {
                  const place = idx === 0 ? 2 : idx === 1 ? 1 : 3
                  const h = place === 1 ? 190 : place === 2 ? 140 : 104
                  const medal = place === 1 ? '👑' : place === 2 ? '🥈' : '🥉'
                  return (
                    <div key={place} className="flex flex-col items-center gap-2">
                      <div className="text-[40px]">{medal}</div>
                      <div className="text-[26px] font-extrabold text-white">{e?.name ?? '—'}</div>
                      <div className="text-[22px] font-extrabold tabular-nums" style={{ color: '#f4a047' }}>
                        {e ? `${e.score}P` : ''}
                      </div>
                      <div
                        style={{
                          width: 150,
                          height: h,
                          borderRadius: '12px 12px 0 0',
                          background: place === 1 ? 'linear-gradient(180deg,#ffd569,#ff6500)' : 'linear-gradient(180deg,#f4a047,#dc7c34)',
                          boxShadow: '0 0 40px -8px #f4a047',
                          transformOrigin: 'bottom',
                          animation: 'growbar .7s cubic-bezier(.2,1,.3,1) both',
                          animationDelay: `${place * 0.15}s`,
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* fixed controls — real tap size, live in the letterbox margin on mobile */}
      {/* [TAP-TOGGLE trial] stopPropagation: ボタン操作ではバーを切り替えない／barVisibleでフェード */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          'absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-2 transition-opacity duration-300 ' +
          (barVisible ? 'opacity-100' : 'pointer-events-none opacity-0')
        }
      >
        {fsSupported && <CtlBtn label={isFs ? '全画面を解除' : '全画面'} onClick={toggleFs} />}
        <CtlBtn label={showRanking ? '順位を隠す' : '順位を出す'} onClick={() => setShowRanking((v) => !v)} />
        {admin && (
          <>
            <CtlBtn k="L" label={`ランキング:${rankingMode === 'mosaic' ? '隠' : '表'}`} onClick={() => setOvRanking(rankingMode === 'mosaic' ? 'shown' : 'mosaic')} />
            <CtlBtn k="R" label={resultsOn ? '結果:再生' : '結果発表'} onClick={bumpLocalReveal} />
          </>
        )}
      </div>

      <style>{`@keyframes growbar{from{transform:scaleY(0)}to{transform:scaleY(1)}}@keyframes toastin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes recblink{50%{opacity:.2}}`}</style>
    </main>
  )
}

// Ranking rows keyed by uid and positioned by rank via translateY, so a rank
// change slides the row instead of snapping — the standing visibly reshuffles
// as connections land (live) and as the replay rebuilds the evening.
const RANK_ROW_H = 30 // px, in the fixed 1600×900 stage space
function RankingBoard({ list, nameOf }: { list: { uid: string; score: number }[]; nameOf: Map<string, string> }) {
  const top = list.slice(0, 8)
  if (top.length === 0) return <p className="text-[17px]" style={{ color: '#c9b3a5' }}>まだつながりがありません</p>
  return (
    <div className="relative" style={{ height: top.length * RANK_ROW_H }}>
      {top.map((r, i) => (
        <div
          key={r.uid}
          className="absolute inset-x-0 grid grid-cols-[26px_1fr_auto] items-center gap-3 text-[19px]"
          style={{
            top: 0,
            height: RANK_ROW_H,
            transform: `translateY(${i * RANK_ROW_H}px)`,
            transition: 'transform .5s cubic-bezier(.2,1,.3,1)',
            color: '#f3e7db',
          }}
        >
          <span className="text-center text-[15px] font-bold" style={{ color: i === 0 ? '#f4a047' : '#c99' }}>
            {i + 1}
          </span>
          <span className="truncate">{nameOf.get(r.uid) ?? '—'}</span>
          <span className="font-extrabold tabular-nums" style={{ color: i === 0 ? '#f4a047' : '#fff' }}>
            {r.score}
          </span>
        </div>
      ))}
    </div>
  )
}

function CtlBtn({ label, onClick, k }: { label: string; onClick: () => void; k?: string }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-3 py-2 text-[12px] font-bold text-white/90"
      style={{ background: 'rgba(20,12,13,.78)', border: '1px solid rgba(255,220,190,.2)' }}
    >
      {k && <span className="mr-1 rounded bg-black/50 px-1 font-mono text-[10px]">{k}</span>}
      {label}
    </button>
  )
}
