// Cloudflare Pages Function: per-ticket share page.
// Emits Open Graph / Twitter meta in server HTML (crawlers don't run JS) so the
// link preview shows the personalized /og/{id} image. Humans are redirected
// into the static app. Shared helpers live in ../_lib/shares.js (DRY).
import { isValidId, escapeHtml, fetchShare } from '../_lib/shares.js'

export const onRequestGet = async ({ params, env, request }) => {
  if (!isValidId(params.id)) return new Response('Not found', { status: 404 })
  const id = params.id
  const origin = new URL(request.url).origin

  const share = await fetchShare(env, id)
  const name = share?.name || 'ゲスト'
  const ticketNo = share?.ticketNo || ''

  const title = `${name} さんの招待券 — meatup 2026`
  const desc = ticketNo ? `TICKET No. ${ticketNo} 🍖` : 'お肉でつながる、あの会。'
  const image = `${origin}/og/${encodeURIComponent(id)}`
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

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=86400',
    },
  })
}
