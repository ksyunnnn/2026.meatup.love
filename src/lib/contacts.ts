// Organizer contact + payment links, in one place.
// Instagram / X are public-facing (shown on the top page). LINE is only
// surfaced in gated / important spots (the ticket's payment section) so the
// public landing page doesn't invite prank DMs.
export const CONTACTS = {
  instagram: 'https://www.instagram.com/synsksk/',
  twitter: 'https://twitter.com/ksyunnnn',
  line: 'http://line.me/ti/p/_8HKTiOcWE',
}

// NOTE: no static PayPay link/QR — personal-account receive links expire
// (受け取りリンク=4日, マイコード=一定期間). Advance payment is handled on
// request: the guest contacts the host, who sends a fresh link each time.

// Participation fee (display only — not enforced; the host settles amounts).
export const FEE = { regular: 5000, early: 4500, earlyDeadline: '7/11' }
