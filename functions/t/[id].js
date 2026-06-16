// Cloudflare Pages Function: per-ticket share page.
// Emits Open Graph / Twitter meta in server HTML (crawlers don't run JS) so the
// link preview shows the personalized /og/{id} image. Humans are redirected
// into the static app. Data comes from the public shares/{id} projection.

// Firebase Auth UIDs are short alphanumeric strings. Reject anything else so a
// crafted id can't escape the `shares/` path in the REST URL.
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/

function firestoreBase(env) {
  return env.FIRESTORE_BASE_URL || 'https://firestore.googleapis.com'
}

// Escape for use inside double-quoted HTML attributes (name is user-supplied).
function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export const onRequestGet = async ({ params, env, request }) => {
  const id = params.id
  if (!ID_RE.test(id)) return new Response('Not found', { status: 404 })
  const project = env.FIREBASE_PROJECT_ID
  const origin = new URL(request.url).origin

  let name = 'ゲスト'
  let ticketNo = ''
  if (project) {
    const url = `${firestoreBase(env)}/v1/projects/${project}/databases/(default)/documents/shares/${id}`
    const res = await fetch(url)
    if (res.ok) {
      const fields = (await res.json()).fields || {}
      name = fields.name?.stringValue || name
      ticketNo = fields.ticketNo?.stringValue || ''
    }
  }

  const title = `${name} さんの招待券 — meatup 2026`
  const desc = ticketNo ? `TICKET No. ${ticketNo} 🍖` : 'お肉でつながる、あの会。'
  const image = `${origin}/og/${encodeURIComponent(id)}`
  const pageUrl = `${origin}/t/${encodeURIComponent(id)}`

  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
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
