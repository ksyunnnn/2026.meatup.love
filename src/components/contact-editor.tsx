'use client'
// Lets a guest set/replace the reachable contact the host uses to reach them
// (self-update; status & ticketNo untouched, so the rules allow it). Mainly for
// someone who registered via the "add the host's LINE" path but later prefers to
// hand over an SNS handle. Rendered on /mypage; the register completion screen
// links here (/mypage#contact).
import { useState } from 'react'
import { updateMyContact } from '@/lib/attendees'

const METHODS = [
  { value: 'LINE', emoji: '💬' },
  { value: 'Instagram', emoji: '📷' },
  { value: 'Twitter', emoji: '🐦' },
  { value: 'Discord', emoji: '🎮' },
]

const chipCls =
  'flex min-h-12 cursor-pointer select-none items-center justify-center gap-1.5 rounded-[8px] border-2 border-line px-3 font-semibold has-[:checked]:border-meat has-[:checked]:bg-cream has-[:checked]:text-meat'
const inputCls =
  'w-full min-h-12 rounded-[8px] border-2 border-line bg-white px-4 py-3 text-ink focus:border-meat focus:outline-none'

export function ContactEditor({
  uid,
  initialMethod = '',
  initialValue = '',
  onSaved,
}: {
  uid: string
  initialMethod?: string
  initialValue?: string
  onSaved?: () => void
}) {
  const [method, setMethod] = useState(initialMethod)
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!method) {
      setError('連絡手段を選んでね🙏')
      return
    }
    if (!value.trim()) {
      setError('連絡先（ID / ユーザー名）を入れてね🙏')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateMyContact(uid, method, value.trim())
      setSaved(true)
      onSaved?.()
    } catch (err) {
      console.error(err)
      setError('保存できなかった…もう一度ためしてね🙏')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="w-full max-w-[540px] rounded-[14px] border-2 border-line bg-paper p-5 text-center">
      <h2 className="text-[16px] font-extrabold">運営からの連絡手段</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        SNSで連絡してほしい人はここから登録できるよ。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {METHODS.map((opt) => (
          <label key={opt.value} className={chipCls}>
            <input
              type="radio"
              name="myContactMethod"
              value={opt.value}
              checked={method === opt.value}
              onChange={(e) => {
                setMethod(e.target.value)
                setSaved(false)
              }}
              className="accent-meat"
            />
            {opt.emoji} {opt.value}
          </label>
        ))}
      </div>
      {method && (
        <input
          className={inputCls + ' mt-2'}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setSaved(false)
          }}
          maxLength={50}
          placeholder={`${method} のID / ユーザー名`}
        />
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn btn--primary btn--block mx-auto mt-3 max-w-[320px]"
      >
        {saving ? '保存中…' : saved ? '保存したよ ✅' : '連絡先を保存'}
      </button>
      {error && <p className="mt-2 text-[13px] text-meat-dark">{error}</p>}
    </section>
  )
}
