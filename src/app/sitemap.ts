import type { MetadataRoute } from 'next'

// Required for `output: 'export'` — emit a static sitemap.xml at build time.
export const dynamic = 'force-static'

// Only the public landing belongs in the sitemap — the rest are auth-gated or
// per-invite/per-ticket and shouldn't be indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://meatup.love',
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
