'use client'

// X (Twitter) share chip. The post body is picked at random *on click* — not at
// render — because the site is statically exported (output:'export'); a build-time
// Math.random() would bake one value into the HTML for everyone. Clicking decides
// the message, so there's also no SSR/hydration mismatch. The intent always carries
// the canonical URL + #meatup2026 (URL resolves once the apex is connected).
import type { MouseEvent } from 'react'
// Taglines live in one shared place so the top page and the ticket share stay
// in sync — adding one there reflects here automatically.
import { SHARE_TAGLINES, pickTagline } from '@/lib/share'

const SITE_URL = 'https://meatup.love'
const HASHTAGS = 'meatup2026'

function intentUrl(text: string) {
  return (
    'https://twitter.com/intent/tweet?text=' +
    encodeURIComponent(text) +
    '&url=' +
    encodeURIComponent(SITE_URL) +
    '&hashtags=' +
    HASHTAGS
  )
}

const chip =
  'inline-flex items-center gap-1.5 rounded-pill border border-meat px-4 py-1.5 text-[14px] text-meat transition-colors hover:bg-meat/5'

export function TweetChip() {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    window.open(intentUrl(pickTagline()), '_blank', 'noopener,noreferrer')
  }

  // href = a deterministic fallback (first message) for no-JS / middle-click / copy;
  // onClick overrides it with a random pick.
  return (
    <a
      href={intentUrl(SHARE_TAGLINES[0])}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      className={chip}
    >
      #meatup2026 でつぶやく 🐦
    </a>
  )
}
