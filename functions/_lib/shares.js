// Shared helpers for the share / OG edge functions.
// Applies DRY (one copy of id-validation, escaping, and data access) and
// information hiding (callers use fetchShare and never see the Firestore REST
// shape). Files under functions/_lib are not routed (underscore prefix).

// Firebase Auth UIDs are short alphanumeric strings. Reject anything else so a
// crafted id (e.g. `%2F`-encoded slashes) can't escape the `shares/` path in
// the REST URL and read another collection (path traversal / SSRF).
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/
export const isValidId = (id) => typeof id === 'string' && ID_RE.test(id)

// Escape for HTML text and quoted-attribute contexts (name is user-supplied).
export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Fetch the public projection shares/{id} via the Firestore REST API
 * (unauthenticated; allowed by the `shares` security rule).
 * @returns {Promise<{name: string, ticketNo: string, role: string,
 *   expectations: string[]} | null>} null if the server is unconfigured or the
 *   doc is missing.
 */
export async function fetchShare(env, id) {
  const project = env.FIREBASE_PROJECT_ID
  if (!project) return null
  const base = env.FIRESTORE_BASE_URL || 'https://firestore.googleapis.com'
  const url = `${base}/v1/projects/${project}/databases/(default)/documents/shares/${id}`
  const res = await fetch(url)
  if (!res.ok) return null
  const fields = (await res.json()).fields || {}
  const expectations = (fields.expectations?.arrayValue?.values || [])
    .map((v) => v.stringValue)
    .filter(Boolean)
  return {
    name: fields.name?.stringValue || '',
    ticketNo: fields.ticketNo?.stringValue || '',
    role: fields.role?.stringValue || '',
    expectations,
  }
}
