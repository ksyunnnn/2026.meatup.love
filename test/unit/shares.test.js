import { describe, it, expect, vi, afterEach } from 'vitest'
import { isValidId, escapeHtml, fetchShare } from '../../functions/_lib/shares.js'

describe('isValidId', () => {
  it('accepts real-looking Firebase UIDs', () => {
    expect(isValidId('Wp06eiZOxNrPZG9oKPmfnOoLsPjI')).toBe(true)
    expect(isValidId('abc-DEF_123')).toBe(true)
  })

  it('rejects path-traversal / injection / malformed ids', () => {
    expect(isValidId('')).toBe(false)
    expect(isValidId('..')).toBe(false)
    expect(isValidId('a/b')).toBe(false)
    expect(isValidId('../attendees/x')).toBe(false)
    expect(isValidId('a.b')).toBe(false)
    expect(isValidId('a'.repeat(129))).toBe(false)
    expect(isValidId(null)).toBe(false)
    expect(isValidId(undefined)).toBe(false)
  })
})

describe('escapeHtml', () => {
  it('escapes the HTML-significant characters', () => {
    expect(escapeHtml(`<script>"x"&'y'`)).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;',
    )
  })
})

describe('fetchShare', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns null when the project is not configured', async () => {
    const res = await fetchShare({}, 'uid')
    expect(res).toBeNull()
  })

  it('returns null when the document is missing (non-ok response)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
    const res = await fetchShare({ FIREBASE_PROJECT_ID: 'demo' }, 'uid')
    expect(res).toBeNull()
  })

  it('parses the Firestore REST shape into {name, ticketNo}', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          fields: {
            name: { stringValue: '佐藤' },
            ticketNo: { stringValue: 'MU-2026-W8G8' },
            edition: { stringValue: '2026' },
          },
        }),
      })),
    )
    const res = await fetchShare({ FIREBASE_PROJECT_ID: 'demo' }, 'uid')
    expect(res).toEqual({ name: '佐藤', ticketNo: 'MU-2026-W8G8' })
  })

  it('uses FIRESTORE_BASE_URL override and the shares/{id} path', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ fields: {} }) }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchShare({ FIREBASE_PROJECT_ID: 'demo', FIRESTORE_BASE_URL: 'http://127.0.0.1:8080' }, 'uid42')
    expect(fetchMock).toHaveBeenCalledOnce()
    const calledUrl = fetchMock.mock.calls[0][0]
    expect(calledUrl).toBe(
      'http://127.0.0.1:8080/v1/projects/demo/databases/(default)/documents/shares/uid42',
    )
  })
})
