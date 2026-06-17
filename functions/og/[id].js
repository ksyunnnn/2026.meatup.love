// Cloudflare Pages Function: per-ticket Open Graph image (1200x630 PNG).
// Renders a personalized ticket image with workers-og (Satori + resvg).
// Data access / id-validation / escaping live in ../_lib/shares.js (DRY).
import { ImageResponse, loadGoogleFont } from 'workers-og'
import { isValidId, escapeHtml, fetchShare } from '../_lib/shares.js'

const W = 1200
const H = 630

export const onRequestGet = async ({ params, env }) => {
  if (!isValidId(params.id)) return new Response('Not found', { status: 404 })
  if (!env.FIREBASE_PROJECT_ID) return new Response('Server not configured', { status: 500 })

  const share = await fetchShare(env, params.id)
  if (!share) return new Response('Not found', { status: 404 })
  const name = share.name || 'ゲスト'
  const ticketNo = share.ticketNo

  const html = `
    <div style="display:flex;width:100%;height:100%;background:#b33d44;padding:56px;font-family:'Noto Sans JP'">
      <div style="display:flex;flex-direction:column;width:100%;height:100%;background:#ffffff;border-radius:36px;padding:72px;justify-content:space-between">
        <div style="display:flex;font-size:48px;font-weight:700;color:#b33d44">meatup 2026</div>
        <div style="display:flex;flex-direction:column">
          <div style="display:flex;font-size:96px;font-weight:700;color:#1d1411">${escapeHtml(name)} さん</div>
          <div style="display:flex;font-size:40px;color:#6f615a;margin-top:18px">TICKET No. ${escapeHtml(ticketNo)}</div>
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
