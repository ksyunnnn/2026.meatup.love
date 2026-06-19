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

// --- Reliability layer -------------------------------------------------------
// Rendering this PNG (Satori layout + resvg raster) is CPU-heavy. On Cloudflare
// it intermittently trips `error 1102` (Worker CPU limit) and, since Pages
// Function responses aren't edge-cached by default, EVERY scrape re-ran the
// heavy path → cards showed up only ~1-in-10. Two guards fix that:
//   1) caches.default — once a ticket renders successfully, every later scrape
//      (other crawlers, other colos, X/LINE refreshes) serves the cached PNG
//      with zero CPU. The image is immutable per ?v=ticketNo, so this is safe.
//   2) genericCard() — on any *catchable* failure (missing doc, font fetch,
//      render throw) fall back to the static /og.png so a card ALWAYS appears.
//      (Note: a hard 1102 kills the isolate and can't be caught here; the cache
//      + lighter render below are what reduce its odds — see DEPLOY/STATUS.)

const IMG_CC = 'public, immutable, no-transform, max-age=31536000'
// Short TTL for the fallback so the edge re-tries the personalized render soon.
const FALLBACK_CC = 'public, max-age=300'

// Tiny, stable string hash (FNV-1a) for cache keys — no crypto needed.
const strHash = (s) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

// Generic event card — keeps a preview alive when the personalized render fails.
async function genericCard(origin) {
  try {
    const res = await fetch(`${origin}/og.png`)
    if (res.ok) {
      return new Response(res.body, {
        status: 200,
        headers: { 'content-type': 'image/png', 'cache-control': FALLBACK_CC },
      })
    }
  } catch {
    /* fall through */
  }
  return new Response('Not found', { status: 404 })
}

// loadGoogleFont, but the subset bytes are cached at the edge. Font subsetting
// is part of the per-request CPU cost; caching it makes the repeated render
// attempts (one per scrape until the first success is cached) markedly lighter.
async function loadFontCached(cache, waitUntil, family, weight, text) {
  const key = new Request(
    `https://font-cache.meatup.love/${encodeURIComponent(family)}/${weight}/${strHash(text)}`,
  )
  try {
    const hit = await cache.match(key)
    if (hit) return await hit.arrayBuffer()
  } catch {
    /* cache miss / unavailable — fetch fresh */
  }
  const data = await loadGoogleFont({ family, weight, text })
  try {
    waitUntil(
      cache.put(
        key,
        new Response(data, {
          headers: { 'content-type': 'font/ttf', 'cache-control': IMG_CC },
        }),
      ),
    )
  } catch {
    /* caching is best-effort */
  }
  return data
}

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

export const onRequestGet = async ({ params, env, request, waitUntil }) => {
  if (!isValidId(params.id)) return new Response('Not found', { status: 404 })

  const origin = new URL(request.url).origin
  const cache = caches.default
  // Cache key includes the ?v=ticketNo so a re-issued ticket renders fresh.
  const cacheKey = new Request(request.url, { method: 'GET' })

  const hit = await cache.match(cacheKey)
  if (hit) return hit

  if (!env.FIREBASE_PROJECT_ID) return genericCard(origin)

  try {
    return await render(params, env, origin, cache, waitUntil, cacheKey)
  } catch {
    // Any catchable failure (Firestore, font fetch, render throw) → still a card.
    return genericCard(origin)
  }
}

const render = async (params, env, origin, cache, waitUntil, cacheKey) => {
  const share = await fetchShare(env, params.id)
  if (!share) return genericCard(origin)

  const name = share.name || 'ゲスト'
  const ticketNo = share.ticketNo || ''
  const role = share.role || ''
  const chars = expectationChars(share.expectations)

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
      <div style="position:relative;display:flex;width:1080px;height:500px;background:${C.paper};border:3px solid ${C.ink};border-radius:36px;box-shadow:0 8px 16px rgba(126,0,29,0.15);overflow:hidden">

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
    loadFontCached(cache, waitUntil, 'Noto Sans JP', 400, jpText),
    loadFontCached(cache, waitUntil, 'Noto Sans JP', 700, jpText),
    loadFontCached(cache, waitUntil, 'Righteous', 400, dispText),
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

  // Buffer once so we can both return AND store the same bytes. Name/role/number
  // are fixed at issue time → cache hard at the edge & browser (immutable per
  // ?v=ticketNo). The edge copy is what spares later scrapes the heavy render.
  const png = await img.arrayBuffer()
  const headers = new Headers(img.headers)
  headers.set('cache-control', IMG_CC)
  const res = new Response(png, { status: 200, headers })
  waitUntil(cache.put(cacheKey, res.clone()))
  return res
}
