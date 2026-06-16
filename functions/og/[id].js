// Cloudflare Pages Function: per-ticket Open Graph image (1200x630 PNG).
// Reads the public projection shares/{id} via the Firestore REST API
// (unauthenticated; allowed by the `shares` security rule) and renders a
// personalized ticket image with workers-og (Satori + resvg, Workers-ready).
import { ImageResponse, loadGoogleFont } from 'workers-og'

const W = 1200
const H = 630

// Firebase Auth UIDs are short alphanumeric strings. Reject anything else so a
// crafted id (e.g. `%2F`-encoded slashes) can't escape the `shares/` path and
// read another collection via the REST URL.
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/

function firestoreBase(env) {
  // Override to the emulator for local testing via .dev.vars.
  return env.FIRESTORE_BASE_URL || 'https://firestore.googleapis.com'
}

// Escape text inserted into the Satori HTML (a stray < or " breaks the render).
function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export const onRequestGet = async ({ params, env }) => {
  const id = params.id
  if (!ID_RE.test(id)) return new Response('Not found', { status: 404 })
  const project = env.FIREBASE_PROJECT_ID
  if (!project) return new Response('Server not configured', { status: 500 })

  const url = `${firestoreBase(env)}/v1/projects/${project}/databases/(default)/documents/shares/${id}`
  const res = await fetch(url)
  if (!res.ok) return new Response('Not found', { status: 404 })

  const fields = (await res.json()).fields || {}
  const name = fields.name?.stringValue || 'ゲスト'
  const ticketNo = fields.ticketNo?.stringValue || ''

  const html = `
    <div style="display:flex;width:100%;height:100%;background:#b33d44;padding:56px;font-family:'Noto Sans JP'">
      <div style="display:flex;flex-direction:column;width:100%;height:100%;background:#ffffff;border-radius:36px;padding:72px;justify-content:space-between">
        <div style="display:flex;font-size:48px;font-weight:700;color:#b33d44">meatup 2026</div>
        <div style="display:flex;flex-direction:column">
          <div style="display:flex;font-size:96px;font-weight:700;color:#1d1411">${esc(name)} さん</div>
          <div style="display:flex;font-size:40px;color:#6f615a;margin-top:18px">TICKET No. ${esc(ticketNo)}</div>
        </div>
        <div style="display:flex;font-size:34px;font-weight:700;color:#dc7c34">お肉でつながる、あの会。</div>
      </div>
    </div>`

  // Subset the font to exactly the glyphs we draw (keeps the request tiny).
  const glyphs =
    name +
    ticketNo +
    'meatup 2026 さん TICKET No. お肉でつながる、あの会。' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
  const fontData = await loadGoogleFont({ family: 'Noto Sans JP', weight: 700, text: glyphs })

  const img = new ImageResponse(html, {
    width: W,
    height: H,
    fonts: [{ name: 'Noto Sans JP', data: fontData, weight: 700, style: 'normal' }],
  })

  // Replace (don't append) cache-control — ImageResponse sets its own default.
  // Name/number are fixed at issue time → cache hard at the edge & browser.
  const headers = new Headers(img.headers)
  headers.set('cache-control', 'public, immutable, no-transform, max-age=31536000')
  return new Response(img.body, { status: img.status, headers })
}
