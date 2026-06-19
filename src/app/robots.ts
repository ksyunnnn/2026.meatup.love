import type { MetadataRoute } from 'next'

// Required for `output: 'export'` — emit a static robots.txt at build time.
export const dynamic = 'force-static'

// Public event → let everyone (incl. AI crawlers like GPTBot / ClaudeBot) read
// the landing so the event is discoverable. Keep auth-gated / personal routes
// out of the index (they only render a sign-in / loading shell anyway).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/mypage/', '/register/', '/ticket/'],
      },
    ],
    sitemap: 'https://meatup.love/sitemap.xml',
    host: 'https://meatup.love',
  }
}
