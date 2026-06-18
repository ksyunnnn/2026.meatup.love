// Single source of the event's when/where. Shown on the ticket face and the
// functional home (/mypage). The OG edge function keeps its own copy (separate
// bundle) — keep them in sync.
export const EVENT = {
  date: '2026.07.25 SAT',
  hours: 'OPEN 11:00 - 19:00',
  venue: 'EAT TOKYO JAKUZURE',
  address: '東京都目黒区上目黒5-30-12',
} as const
