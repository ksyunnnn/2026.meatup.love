// The exchange face — the ticket, turned upright. Same parts as
// `ticket-card.tsx` (wordmark, GUEST pill, name, perforation, cream stub) but
// re-proportioned for a phone held out to another person, so the QR gets a
// whole half of the card instead of a corner of the stub. The landscape ticket
// at phone width renders its QR around 55px, which is not reliably scannable
// across a table; here it is ~200px.
//
// Sized in cqw against a 360-wide design, so design numbers read as rendered
// px on a typical phone and the card still scales to any container.
import { qrDataUrl } from '@/lib/qr'
import { EVENT } from '@/lib/event'
import type { Rarity } from '@/lib/game'

const q = (px: number) => `${(px / 3.6).toFixed(3)}cqw`

const C = {
  meat: '#b33d44',
  ink: '#1d1411',
  inkSoft: '#6f615a',
  cream: '#fff7ef',
  paper: '#ffffff',
  line: '#ecdfd4',
}

export interface ExchangeTicketProps {
  name: string
  role?: string
  chars?: string[]
  ticketNo: string
  shareUrl: string
  /** Show the date/venue footer. Off at the venue: everyone is already there. */
  showEventInfo?: boolean
  /**
   * Rarity stamp for the corner — the same mark the 名刺帳 cards use. Pass it
   * ONLY for public specials (SR): this face is the one the other person reads,
   * so stamping a hidden SSR would give the secret away before they scan.
   */
  rarity?: Rarity
}

export default function ExchangeTicket({
  name,
  role,
  chars = [],
  ticketNo,
  shareUrl,
  showEventInfo = false,
  rarity,
}: ExchangeTicketProps) {
  const qr = qrDataUrl(shareUrl, { light: C.cream })
  const code = ticketNo.replace(/^MU-\d+-/, '')
  const prefix = ticketNo.slice(0, ticketNo.length - code.length)

  return (
    <div
      style={{ containerType: 'inline-size', position: 'relative', width: '100%', maxWidth: 420 }}
      aria-label={`${name} さんの交換用チケット`}
    >
      {/* The corner stamp lives outside the card so the card's overflow:hidden
          (which clips the watermark) doesn't clip its overhang. */}
      {rarity && (
        <span
          aria-hidden
          className="ssr-stamp"
          style={{
            position: 'absolute',
            right: q(-3),
            top: q(-11),
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: q(24),
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {rarity}
        </span>
      )}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          background: C.paper,
          border: `${q(1)} solid ${C.ink}`,
          borderRadius: q(14),
          boxShadow: `0 ${q(8)} ${q(20)} rgba(126,0,29,0.18)`,
          overflow: 'hidden',
        }}
      >
        {/* MAIN — who you are */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: q(14),
            padding: `${q(18)} ${q(20)} ${q(20)}`,
            overflow: 'hidden',
          }}
        >
          {chars.length > 0 && (
            <div
              style={{
                position: 'absolute',
                right: q(-10),
                bottom: q(-34),
                display: 'flex',
                gap: q(3),
                opacity: 0.07,
              }}
            >
              {chars.map((c, i) => (
                <span
                  key={i}
                  style={{ fontSize: q(110), fontWeight: 800, color: C.meat, lineHeight: 0.8 }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                fontFamily: 'var(--font-display)',
                fontSize: q(21),
                lineHeight: 0.9,
                color: C.ink,
              }}
            >
              meat<span style={{ color: C.meat }}>up</span>
              <span
                style={{
                  fontSize: q(8),
                  background: C.meat,
                  color: C.cream,
                  borderRadius: q(999),
                  padding: `${q(1)} ${q(6)}`,
                  marginLeft: q(5),
                }}
              >
                2026
              </span>
            </div>
            {/* GUEST stays on a stamped ticket: the pill states the ticket class,
                the stamp states rarity — different facts, both true. */}
            <div
              style={{
                border: `${q(1)} solid ${C.meat}`,
                color: C.meat,
                borderRadius: q(999),
                padding: `${q(3)} ${q(8)}`,
                fontSize: q(7.5),
                fontWeight: 800,
                letterSpacing: q(2.5),
              }}
            >
              GUEST
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {role && (
              <div
                style={{
                  fontSize: q(9.5),
                  letterSpacing: q(2.5),
                  color: C.inkSoft,
                  marginBottom: q(5),
                }}
              >
                {role}
              </div>
            )}
            <div style={{ fontSize: q(30), fontWeight: 800, color: C.ink, lineHeight: 1.05 }}>
              {name}
            </div>
          </div>

          {showEventInfo && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: q(2) }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: q(11),
                    color: C.ink,
                    lineHeight: 1.1,
                  }}
                >
                  {EVENT.date}
                </div>
                <div style={{ fontSize: q(8), color: C.inkSoft, marginTop: q(3) }}>
                  {EVENT.hours}
                </div>
              </div>
              <div
                style={{
                  width: q(1),
                  alignSelf: 'stretch',
                  background: C.line,
                  margin: `0 ${q(16)}`,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: q(11), fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>
                  {EVENT.venue}
                </div>
                <div style={{ fontSize: q(8), color: C.inkSoft, marginTop: q(3) }}>
                  {EVENT.address}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STUB — what they scan */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: q(14),
            background: C.cream,
            borderTop: `${q(1)} dashed ${C.line}`,
            padding: `${q(20)} ${q(20)} ${q(18)}`,
          }}
        >
          {/* perforation notches sit on the seam */}
          <div
            style={{
              position: 'absolute',
              left: q(-1),
              top: 0,
              width: q(12),
              height: q(12),
              borderRadius: q(999),
              background: C.cream,
              border: `${q(1)} solid ${C.ink}`,
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: q(-1),
              top: 0,
              width: q(12),
              height: q(12),
              borderRadius: q(999),
              background: C.cream,
              border: `${q(1)} solid ${C.ink}`,
              transform: 'translate(50%, -50%)',
            }}
          />

          {/* eslint-disable-next-line @next/next/no-img-element -- static export + images.unoptimized; mirrors ticket-card.tsx */}
          <img src="/oniku.svg" alt="" style={{ width: q(28), height: q(28) }} />
          {/* eslint-disable-next-line @next/next/no-img-element -- runtime data: URL, not optimizable */}
          <img src={qr} alt="" style={{ width: q(196), height: q(196) }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                fontSize: q(7.5),
                letterSpacing: q(2),
                color: C.inkSoft,
                marginBottom: q(3),
              }}
            >
              TICKET No.
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', color: C.meat }}>
              <span style={{ fontSize: q(13), fontWeight: 700, opacity: 0.55 }}>{prefix}</span>
              <span style={{ fontSize: q(22), fontWeight: 800, letterSpacing: q(2) }}>{code}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
