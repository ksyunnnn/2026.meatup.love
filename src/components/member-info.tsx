// Member-only logistics shown below the ticket on /ticket (the post-login home).
// Split into single-purpose sections so each card's heading matches its content:
//   - FeeSection     … price + payment timing, with a casual "ping me for the
//                       PayPay link" — kept loose on purpose
//   - ContactSection … the host contact channel (LINE primary). Guests are
//                       friends who contact by default, so use-cases aren't listed.
// These live behind auth on purpose: fee + LINE aren't on the public top page
// (LINE is members-only to deter pranks). Presentational only (no hooks) so they
// can be previewed in isolation.
import { CONTACTS, FEE } from '@/lib/contacts'
import { LineIcon, InstagramIcon, TwitterIcon } from '@/components/icons'

const sectionCls =
  'w-full max-w-[540px] rounded-[14px] border-2 border-line bg-paper p-5 text-center'

// `paid` is host-set off-app (PayPay/cash). The status line stays quiet/neutral
// ("事前決済：未") so a confirmed guest can tell they haven't pre-paid. A light,
// casual nudge toward pre-pay in the prose is intentional (kept un-pandering); what
// we avoid is a "you paid!" badge (reads as odd) and treating unpaid as an error —
// cash-on-the-day stays valid, so unpaid is never a red state.
export function FeeSection({
  approved,
  paid,
}: {
  approved?: boolean
  paid?: boolean
}) {
  return (
    <section className={sectionCls}>
      <h2 className="text-[16px] font-extrabold">肉と酒と遊び費</h2>
      <div className="mt-3 flex items-end justify-center gap-8">
        <div>
          <p className="text-[12px] text-ink-soft">当日</p>
          <p className="mb-1 text-[20px] font-extrabold text-meat">
            {FEE.regular.toLocaleString()}円
          </p>
        </div>
        <div>
          <p className="text-[12px] text-ink-soft">事前決済</p>
          <p className="text-[28px] font-extrabold text-meat">
            {FEE.early.toLocaleString()}円
          </p>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-ink-soft">
        事前決済（PayPay）は2週間前まで。事前が助かるぜ？？当日は現金もOK。
      </p>
      <p className="mt-3 text-[13px] text-ink-soft">事前決済はPaypayリンク送るから連絡して〜</p>
      {approved && !paid && (
        <p className="mt-3 text-[12px] text-ink-soft">事前決済：未</p>
      )}
    </section>
  )
}

export function ContactSection() {
  return (
    <section className={sectionCls}>
      <h2 className="text-[16px] font-extrabold">連絡先</h2>
      <a
        href={CONTACTS.line}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn--block mx-auto mt-3 max-w-[320px] inline-flex items-center justify-center gap-2"
      >
        <LineIcon className="h-[18px] w-[18px]" />
        LINEで連絡する
      </a>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-1 text-[12px] text-ink-soft">
        他でもOK →
        <a
          href={CONTACTS.instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram で連絡"
          className="inline-flex h-11 w-11 items-center justify-center text-[#E4405F] transition-colors hover:text-meat"
        >
          <InstagramIcon className="h-[22px] w-[22px]" />
        </a>
        <a
          href={CONTACTS.twitter}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Twitter で連絡"
          className="inline-flex h-11 w-11 items-center justify-center text-[#1DA1F2] transition-colors hover:text-meat"
        >
          <TwitterIcon className="h-[22px] w-[22px]" />
        </a>
      </p>
    </section>
  )
}
