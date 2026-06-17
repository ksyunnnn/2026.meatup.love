// The shareable ticket face. Mirrors the OG image (functions/og/[id].js) so the
// on-screen ticket and the link-preview image are the SAME design. Everything
// is sized in container-query width units (cqw) against a 1080px-wide design,
// so the whole pass scales cleanly to any width while keeping its proportions.
import { qrDataUrl } from '@/lib/qr'

// px (in the 1080-wide design) → cqw
const q = (px: number) => `${(px / 10.8).toFixed(3)}cqw`

const C = {
  meat: '#b33d44',
  ink: '#1d1411',
  inkSoft: '#6f615a',
  cream: '#fff7ef',
  paper: '#ffffff',
  line: '#ecdfd4',
}

export interface TicketCardProps {
  name: string
  role?: string
  /** Expectation kanji drawn as the faint watermark. */
  chars?: string[]
  ticketNo: string
  shareUrl: string
}

// Static event info — mirrors functions/og/[id].js EVENT.
const EVENT = {
  date: '2026.07.25 SAT',
  hours: 'OPEN 11:00 - 19:00',
  venue: 'EAT TOKYO JAKUZURE',
  address: '東京都目黒区上目黒5-30-12',
}

export default function TicketCard({
  name,
  role,
  chars = [],
  ticketNo,
  shareUrl,
}: TicketCardProps) {
  const qr = qrDataUrl(shareUrl, { light: C.cream })

  return (
    <div
      style={{
        containerType: 'inline-size',
        width: '100%',
        maxWidth: 540,
      }}
      aria-label={`${name} さんの meatup 2026 チケット`}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          aspectRatio: '1080 / 500',
          background: C.paper,
          border: `${q(3)} solid ${C.ink}`,
          borderRadius: q(36),
          boxShadow: `0 ${q(24)} ${q(60)} rgba(126,0,29,0.18)`,
          overflow: 'hidden',
        }}
      >
        {/* MAIN */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'space-between',
            padding: `${q(56)} ${q(60)} ${q(40)}`,
            overflow: 'hidden',
          }}
        >
          {/* personalized watermark */}
          {chars.length > 0 && (
            <div
              style={{
                position: 'absolute',
                right: q(-20),
                bottom: q(-70),
                display: 'flex',
                gap: q(8),
                opacity: 0.07,
              }}
            >
              {chars.map((c, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: q(300),
                    fontWeight: 800,
                    color: C.meat,
                    lineHeight: 0.8,
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* top: wordmark + GUEST */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                fontFamily: 'var(--font-display)',
                fontSize: q(60),
                lineHeight: 0.9,
                color: C.ink,
              }}
            >
              meat<span style={{ color: C.meat }}>up</span>
              <span
                style={{
                  fontSize: q(22),
                  background: C.meat,
                  color: C.cream,
                  borderRadius: q(999),
                  padding: `${q(2)} ${q(16)}`,
                  marginLeft: q(14),
                }}
              >
                2026
              </span>
            </div>
            <div
              style={{
                border: `${q(2)} solid ${C.meat}`,
                color: C.meat,
                borderRadius: q(999),
                padding: `${q(8)} ${q(22)}`,
                fontSize: q(17),
                fontWeight: 800,
                letterSpacing: q(6),
              }}
            >
              GUEST
            </div>
          </div>

          {/* holder */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {role && (
              <div
                style={{
                  fontSize: q(21),
                  letterSpacing: q(6),
                  color: C.inkSoft,
                  marginBottom: q(12),
                }}
              >
                {role}
              </div>
            )}
            <div style={{ fontSize: q(72), fontWeight: 800, color: C.ink, lineHeight: 1 }}>
              {name}
            </div>
          </div>

          {/* event-info footer */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: q(23),
                  letterSpacing: q(2),
                  color: C.ink,
                  lineHeight: 1.1,
                }}
              >
                {EVENT.date}
              </div>
              <div style={{ fontSize: q(16), color: C.inkSoft, marginTop: q(6) }}>
                {EVENT.hours}
              </div>
            </div>
            <div
              style={{
                width: q(2),
                alignSelf: 'stretch',
                background: C.line,
                margin: `0 ${q(48)}`,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <svg
                width={q(24)}
                height={q(30)}
                viewBox="0 0 24 30"
                fill="none"
                style={{ marginTop: q(1), flex: 'none' }}
              >
                <path
                  d="M12 1.5c-5 0-9 3.9-9 8.9 0 6.4 9 17.6 9 17.6s9-11.2 9-17.6c0-5-4-8.9-9-8.9z"
                  stroke={C.meat}
                  strokeWidth="2.2"
                  fill="none"
                />
                <circle cx="12" cy="10.2" r="3.2" stroke={C.meat} strokeWidth="2.2" fill="none" />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: q(11) }}>
                <div style={{ fontSize: q(23), fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>
                  {EVENT.venue}
                </div>
                <div style={{ fontSize: q(16), color: C.inkSoft, marginTop: q(6) }}>
                  {EVENT.address}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* perforation notches */}
        <div
          style={{
            position: 'absolute',
            left: q(735),
            top: q(-3),
            width: q(30),
            height: q(30),
            borderRadius: q(999),
            background: C.cream,
            border: `${q(3)} solid ${C.ink}`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: q(735),
            bottom: q(-3),
            width: q(30),
            height: q(30),
            borderRadius: q(999),
            background: C.cream,
            border: `${q(3)} solid ${C.ink}`,
            transform: 'translate(-50%, 50%)',
          }}
        />

        {/* STUB */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: q(330),
            background: C.cream,
            borderLeft: `${q(3)} dashed ${C.line}`,
            padding: `${q(40)} ${q(28)}`,
          }}
        >
          {/* oniku — the shared brand mark */}
          <img src="/oniku.svg" alt="" style={{ width: q(92), height: q(92) }} />
          {/* QR encodes the share URL so a scanned ticket lands on the event.
              Rendered via <img> (not raw SVG) so the fixed-size QR scales to the
              cqw box via its viewBox — same approach as the OG image. */}
          <img src={qr} alt="" style={{ width: q(168), height: q(168) }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                fontSize: q(15),
                letterSpacing: q(2),
                color: C.inkSoft,
                marginBottom: q(6),
              }}
            >
              TICKET No.
            </div>
            <div
              style={{ fontSize: q(24), fontWeight: 800, color: C.meat, letterSpacing: q(1) }}
            >
              {ticketNo}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
