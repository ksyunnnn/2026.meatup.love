// Pure, dependency-free ticket helpers — no Firebase import so they are trivially
// unit-testable (single source of truth for the edition + ticket-code format).

export const EDITION = '2026'

// Unambiguous code alphabet (no 0/O/1/I).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Random short ticket code, e.g. "MU-2026-7Q3K". */
export function generateTicketNo(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return `MU-${EDITION}-${code}`
}

// One kanji per "何が楽しみ？" choice — drawn big & faint as the ticket's
// personalized watermark. Keys match register-client's EXPECTATIONS.
// NOTE: the OG edge function keeps its own copy of this map (separate bundle);
// keep the two in sync.
export const EXPECTATION_CHARS: Record<string, string> = {
  meat: '肉',
  drink: '麦',
  play: '遊',
  connect: '繋',
}

/** Selected expectation keys → their watermark kanji (unknown keys dropped). */
export function expectationChars(keys: readonly string[] | undefined): string[] {
  return (keys ?? []).map((k) => EXPECTATION_CHARS[k]).filter(Boolean)
}

// The job value 'その他' carries a free-text override in jobOther.
const JOB_OTHER = 'その他'

/** Resolve the role label shown on the ticket (free text wins for 'その他'). */
export function displayRole(job?: string, jobOther?: string): string {
  if (!job) return ''
  if (job === JOB_OTHER) return jobOther?.trim() || JOB_OTHER
  return job
}
