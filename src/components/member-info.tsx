// Member-only logistics shown below the ticket on /ticket (the post-login home).
// Split into single-purpose sections so each card's heading matches its content:
//   - FeeSection     … money only (price + payment timing)
//   - ContactSection … the one place to reach the host: payment requests,
//                       cancellations/changes, general contact
// These live behind auth on purpose: fee + LINE aren't on the public top page
// (LINE is members-only to deter pranks). Presentational only (no hooks) so they
// can be previewed in isolation.
import { CONTACTS, FEE } from '@/lib/contacts'
import { LineIcon, InstagramIcon, TwitterIcon } from '@/components/icons'

const sectionCls =
  'w-full max-w-[540px] rounded-[14px] border-2 border-line bg-paper p-5 text-center'

// `paid` is host-set off-app (PayPay/cash). Show only a quiet, neutral status so a
// confirmed guest can tell they haven't pre-paid yet — no nudging/incentives (reads
// as pandering), no "you paid!" badge (reads as odd). Cash-on-the-day stays valid,
// so unpaid is never an error/red state.
export function FeeSection({
  approved,
  paid,
}: {
  approved?: boolean
  paid?: boolean
}) {
  return (
    <section className={sectionCls}>
      <h2 className="text-[16px] font-extrabold">参加費</h2>
      <div className="mt-3 flex items-start justify-center gap-8">
        <div>
          <p className="text-[12px] text-ink-soft">通常 / 当日</p>
          <p className="text-[24px] font-extrabold text-meat">
            {FEE.regular.toLocaleString()}円
          </p>
        </div>
        <div>
          <p className="text-[12px] text-ink-soft">事前決済</p>
          <p className="text-[24px] font-extrabold text-meat">
            {FEE.early.toLocaleString()}円
          </p>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-ink-soft">
        事前決済（PayPay）は2週間前まで。希望は下の「連絡」から伝えてね🙏／当日は現金もOK。
      </p>
      {approved && !paid && (
        <p className="mt-3 text-[12px] text-ink-soft">事前決済：未</p>
      )}
    </section>
  )
}

export function ContactSection() {
  return (
    <section className={sectionCls}>
      <h2 className="text-[16px] font-extrabold">連絡・困ったとき</h2>
      <p className="mt-3 text-[13px] text-ink-soft">
        事前決済の相談、予定が変わってのキャンセル・変更、そのほか何でも、ここから連絡してね。
      </p>
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
