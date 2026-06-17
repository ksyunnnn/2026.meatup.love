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
