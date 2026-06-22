// Cloudflare Pages Function: per-ticket share page.
// Emits Open Graph / Twitter meta in server HTML (crawlers don't run JS) so the
// link preview shows the personalized /og/{id} image. Humans are redirected
// into the static app. Shared helpers live in ../_lib/shares.js (DRY).
import { isValidId, escapeHtml, fetchShare } from '../_lib/shares.js'

export const onRequestGet = async ({ params, env, request, waitUntil }) => {
  if (!isValidId(params.id)) return new Response('Not found', { status: 404 })
  const id = params.id
  const origin = new URL(request.url).origin

  const share = await fetchShare(env, id)
  const name = share?.name || 'ゲスト'
  const ticketNo = share?.ticketNo || ''

  const title = `${name} さんの招待券 — meatup 2026`
  const desc = ticketNo ? `TICKET No. ${ticketNo} 🍖` : 'お肉でつながる、あの会。'
  // Version the OG image by ticketNo so a re-issued ticket (same uid, new
  // ticketNo — e.g. after an admin reset/re-register) busts the 1-year immutable
  // cache at both the edge and the scraper (X/LINE). Hashed-asset pattern.
  const image = ticketNo
    ? `${origin}/og/${encodeURIComponent(id)}?v=${encodeURIComponent(ticketNo)}`
    : `${origin}/og/${encodeURIComponent(id)}`
  const pageUrl = `${origin}/t/${encodeURIComponent(id)}`

  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(pageUrl)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<meta http-equiv="refresh" content="0; url=/ticket/">
</head>
<body style="font-family:system-ui;padding:24px">
<p>チケットページへ移動します… <a href="/ticket/">開かない場合はこちら</a></p>
</body>
</html>`

  // Warm the OG image cache out-of-band. Rendering /og is CPU-heavy and
  // intermittently trips the Worker CPU limit (error 1102) on a cold render;
  // once it succeeds, /og caches the PNG (caches.default) and every later fetch
  // is a cheap hit. Crawlers fetch this image right after parsing this HTML, so
  // retrying the render in the background here sharply raises the odds the very
  // first scrape lands on a warm cache instead of a 1102. Best-effort: a hit
  // returns immediately and ends the loop; failures just retry up to the cap.
  if (ticketNo) {
    const warm = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          const r = await fetch(image)
          // `x-og: render` marks a genuine render (the fallback card is also
          // image/png, so content-type alone can't tell them apart; the old
          // content-length gate also broke on bodies without that header).
          const rendered = r.ok && r.headers.get('x-og') === 'render'
          // Drain the body either way so the subrequest connection is released.
          await r.arrayBuffer().catch(() => {})
          if (rendered) return // a real PNG — now cached at the edge
        } catch {
          /* transient — retry */
        }
      }
    }
    waitUntil(warm())
  }

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=86400',
    },
  })
}
