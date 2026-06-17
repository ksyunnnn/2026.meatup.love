// Organizer contact + payment links, in one place.
// Instagram / X are public-facing (shown on the top page). LINE is only
// surfaced in gated / important spots (the ticket's payment section) so the
// public landing page doesn't invite prank DMs.
export const CONTACTS = {
  instagram: 'https://www.instagram.com/synsksk/',
  twitter: 'https://twitter.com/ksyunnnn',
  line: 'http://line.me/ti/p/_8HKTiOcWE',
}

// Advance-payment PayPay link. PayPay's https link opens the app on phones
// (universal link). Leave empty until it's handed over — the button stays
// hidden while this is blank.
export const PAYPAY_URL = ''

// Participation fee (display only — not enforced; the host settles amounts).
export const FEE = { regular: 5000, early: 4500, earlyDeadline: '7/11' }
