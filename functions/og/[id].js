// Cloudflare Pages Function: per-ticket Open Graph image (1200x630 PNG).
// Renders the personalized "meatup 2026" ticket with workers-og (Satori +
// resvg): a horizontal pass whose face mirrors the on-site ticket
// (src/app/ticket/page.tsx) — same wordmark, GUEST badge, role + name, the
// event-info footer, the oniku stub with QR + ticket no., and the expectation
// kanji drawn big & faint as a personalized watermark.
// Data access / id-validation / escaping live in ../_lib/shares.js (DRY).
import { ImageResponse, loadGoogleFont } from 'workers-og'
import { isValidId, escapeHtml, fetchShare } from '../_lib/shares.js'
import { qrDataUrl } from '../_lib/qr.js'

const W = 1200
const H = 630

// Static event info — mirrors src/app/ticket/page.tsx (single venue/date).
const EVENT = {
  date: '2026.07.25 SAT',
  hours: 'OPEN 11:00 - 19:00',
  venue: 'EAT TOKYO JAKUZURE',
  address: '東京都目黒区上目黒5-30-12',
}

// One kanji per expectation key — JS twin of src/lib/ticket.ts EXPECTATION_CHARS.
const EXPECTATION_CHARS = { meat: '肉', drink: '麦', play: '遊', connect: '繋' }
const expectationChars = (keys) =>
  (keys || []).map((k) => EXPECTATION_CHARS[k]).filter(Boolean)

// Brand palette (globals.css @theme).
const C = {
  meat: '#b33d44',
  ink: '#1d1411',
  inkSoft: '#6f615a',
  cream: '#fff7ef',
  paper: '#ffffff',
  line: '#ecdfd4',
}

const PIN_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30" fill="none">` +
  `<path d="M12 1.5c-5 0-9 3.9-9 8.9 0 6.4 9 17.6 9 17.6s9-11.2 9-17.6c0-5-4-8.9-9-8.9z" stroke="${C.meat}" stroke-width="2.2" fill="none"/>` +
  `<circle cx="12" cy="10.2" r="3.2" stroke="${C.meat}" stroke-width="2.2" fill="none"/></svg>`
const svgUrl = (svg) => 'data:image/svg+xml;base64,' + btoa(svg)

export const onRequestGet = async ({ params, env, request }) => {
  if (!isValidId(params.id)) return new Response('Not found', { status: 404 })
  if (!env.FIREBASE_PROJECT_ID)
    return new Response('Server not configured', { status: 500 })

  const share = await fetchShare(env, params.id)
  if (!share) return new Response('Not found', { status: 404 })

  const name = share.name || 'ゲスト'
  const ticketNo = share.ticketNo || ''
  const role = share.role || ''
  const chars = expectationChars(share.expectations)

  const origin = new URL(request.url).origin
  const shareUrl = `${origin}/t/${encodeURIComponent(params.id)}`
  const qrUrl = qrDataUrl(shareUrl, { light: C.cream })

  // oniku: the shared 2018/2019 brand mark, served as a static asset.
  let onikuUrl = ''
  try {
    const res = await fetch(`${origin}/oniku.svg`)
    if (res.ok) onikuUrl = svgUrl(await res.text())
  } catch {
    /* mark is decorative — render without it if the fetch fails */
  }

  const watermark = chars.length
    ? `<div style="display:flex;position:absolute;right:-20px;bottom:-70px;opacity:0.07">${chars
        .map(
          (c) =>
            `<span style="font-size:300px;font-weight:700;color:${C.meat};line-height:0.8">${c}</span>`,
        )
        .join('')}</div>`
    : ''

  const eyebrow = role
    ? `<div style="display:flex;font-size:21px;letter-spacing:6px;color:${C.inkSoft};margin-bottom:12px">${escapeHtml(role)}</div>`
    : ''

  const html = `
    <div style="display:flex;width:${W}px;height:${H}px;background:${C.cream};align-items:center;justify-content:center;font-family:'Noto Sans JP'">
      <div style="position:relative;display:flex;width:1080px;height:500px;background:${C.paper};border:3px solid ${C.ink};border-radius:36px;box-shadow:0 24px 60px rgba(126,0,29,0.18);overflow:hidden">

        <div style="position:relative;display:flex;flex-direction:column;flex:1;justify-content:space-between;padding:56px 60px 40px;overflow:hidden">
          ${watermark}

          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;font-family:'Righteous';font-size:60px;color:${C.ink}">
              <span>meat</span><span style="color:${C.meat}">up</span>
              <span style="display:flex;font-size:22px;background:${C.meat};color:${C.cream};border-radius:999px;padding:2px 16px;margin-left:14px">2026</span>
            </div>
            <div style="display:flex;border:2px solid ${C.meat};color:${C.meat};border-radius:999px;padding:8px 22px;font-size:17px;font-weight:700;letter-spacing:6px">GUEST</div>
          </div>

          <div style="display:flex;flex-direction:column;flex:1;justify-content:center">
            ${eyebrow}
            <div style="display:flex;font-size:72px;font-weight:700;color:${C.ink}">${escapeHtml(name)}</div>
          </div>

          <div style="display:flex;align-items:flex-start">
            <div style="display:flex;flex-direction:column">
              <div style="display:flex;font-family:'Righteous';font-size:23px;letter-spacing:2px;color:${C.ink}">${EVENT.date}</div>
              <div style="display:flex;font-size:16px;color:${C.inkSoft};margin-top:6px">${EVENT.hours}</div>
            </div>
            <div style="display:flex;width:2px;align-self:stretch;background:${C.line};margin:0 48px"></div>
            <div style="display:flex;align-items:flex-start">
              <img src="${svgUrl(PIN_SVG)}" width="24" height="30" style="margin-top:1px" />
              <div style="display:flex;flex-direction:column;margin-left:11px">
                <div style="display:flex;font-size:23px;font-weight:700;color:${C.ink}">${EVENT.venue}</div>
                <div style="display:flex;font-size:16px;color:${C.inkSoft};margin-top:6px">${EVENT.address}</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;position:absolute;left:735px;top:-3px;width:30px;height:30px;border-radius:999px;background:${C.cream};border:3px solid ${C.ink};transform:translate(-50%,-50%)"></div>
        <div style="display:flex;position:absolute;left:735px;bottom:-3px;width:30px;height:30px;border-radius:999px;background:${C.cream};border:3px solid ${C.ink};transform:translate(-50%,50%)"></div>

        <div style="display:flex;flex-direction:column;align-items:center;justify-content:space-between;width:330px;background:${C.cream};border-left:3px dashed ${C.line};padding:40px 28px">
          ${onikuUrl ? `<img src="${onikuUrl}" width="92" height="92" />` : '<div style="display:flex;height:92px"></div>'}
          <img src="${qrUrl}" width="168" height="168" />
          <div style="display:flex;flex-direction:column;align-items:center">
            <div style="display:flex;font-size:15px;letter-spacing:2px;color:${C.inkSoft};margin-bottom:6px">TICKET No.</div>
            <div style="display:flex;font-size:24px;font-weight:700;color:${C.meat};letter-spacing:1px">${escapeHtml(ticketNo)}</div>
          </div>
        </div>
      </div>
    </div>`

  // Subset each font to exactly the glyphs we draw (keeps the request small).
  const jpText =
    name + role + ticketNo + chars.join('') + EVENT.venue + EVENT.address +
    'meatup 2026 ゲスト GUEST TICKET No. 肉麦遊繋 ' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.:'
  const dispText = 'meatup2026 SATOPENCLOSE0123456789.:- '

  const [jp400, jp700, righteous] = await Promise.all([
    loadGoogleFont({ family: 'Noto Sans JP', weight: 400, text: jpText }),
    loadGoogleFont({ family: 'Noto Sans JP', weight: 700, text: jpText }),
    loadGoogleFont({ family: 'Righteous', weight: 400, text: dispText }),
  ])

  const img = new ImageResponse(html, {
    width: W,
    height: H,
    fonts: [
      { name: 'Noto Sans JP', data: jp400, weight: 400, style: 'normal' },
      { name: 'Noto Sans JP', data: jp700, weight: 700, style: 'normal' },
      { name: 'Righteous', data: righteous, weight: 400, style: 'normal' },
    ],
  })

  // Replace (don't append) cache-control — ImageResponse sets its own default.
  // Name/role/number are fixed at issue time → cache hard at the edge & browser.
  const headers = new Headers(img.headers)
  headers.set('cache-control', 'public, immutable, no-transform, max-age=31536000')
  return new Response(img.body, { status: img.status, headers })
}
