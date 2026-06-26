// Single source of truth for the playful share taglines. Used by BOTH the top
// page's TweetChip and the ticket share (completion screen + /ticket). Add a
// line here and it shows up everywhere that shares — nothing else to touch.
export const SHARE_TAGLINES = ['お肉を食べにいきます🍖', 'オレ、ニク、クウ🦍']

// Pick at call time (a click), never at render: the site is statically exported
// (output:'export'), so a render-time random would bake one value into the HTML
// for everyone and cause a hydration mismatch. Choosing on click sidesteps both.
export function pickTagline(): string {
  return SHARE_TAGLINES[Math.floor(Math.random() * SHARE_TAGLINES.length)]
}

const PARTICIPATION = 'Meatup2026に参加します🍖 #meatup2026'

// The personalized ticket page (/t/{uid}); itself a meatup.love link whose OGP
// renders the ticket card. Tag with ?t=ticketNo so a re-issued ticket yields a
// NEW url that X/LINE haven't cached → fresh card.
export function ticketShareUrl(origin: string, uid: string, ticketNo?: string): string {
  return ticketNo
    ? `${origin}/t/${uid}?t=${encodeURIComponent(ticketNo)}`
    : `${origin}/t/${uid}`
}

// The rendered ticket OGP image itself (1200×630 PNG from the /og/{uid} Pages
// Function) — the same artwork crawlers show as the card. We fetch THIS and
// share it as a file so the ticket can be added to a story as an image. ?v=
// matches the og:image url /t/{uid} emits, so we hit the same cached render.
// The QR baked into the image carries the share link, so the url survives even
// on share targets that drop accompanying text.
export function ticketOgImageUrl(origin: string, uid: string, ticketNo?: string): string {
  return ticketNo
    ? `${origin}/og/${encodeURIComponent(uid)}?v=${encodeURIComponent(ticketNo)}`
    : `${origin}/og/${encodeURIComponent(uid)}`
}

// The 9:16 (1080×1920) variant of the same image — the landscape OGP would sit
// letterboxed in the middle of an Instagram story, so we share this instead: the
// same card centered on a full cream canvas. ?o=story switches the Pages
// Function to the portrait render; ?v keeps the per-ticket cache-bust.
export function ticketStoryImageUrl(origin: string, uid: string, ticketNo?: string): string {
  return `${ticketOgImageUrl(origin, uid, ticketNo)}${ticketNo ? '&' : '?'}o=story`
}

// {tagline}\n\n{participation}\n{url}. ONE url only — a second (homepage) link
// would make X/Twitter card that one and drop the personalized ticket preview.
export function buildTicketShareText(tagline: string, url: string): string {
  return `${tagline}\n\n${PARTICIPATION}\n${url}`
}
