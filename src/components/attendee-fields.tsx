// The profile field set the host fills in — shared by the /admin "add a guest"
// form and the /admin/edit screen so the two never drift. Renders ONLY the
// inputs; the parent owns the <form>, the submit button, and the write call.
import type { Attendee } from '@/lib/types'
import { JOBS, EXPECTATIONS, CONTACT_METHODS } from '@/lib/profile'

export type AttendeeFormValues = {
  name: string
  job: string
  jobOther: string
  gender: string
  expectations: string[]
  contactMethod: string
  contactValue: string
  paid: boolean
  withKids: boolean
  hasAllergy: boolean
  allergyNote: string
}

export const blankAttendeeForm: AttendeeFormValues = {
  name: '',
  job: '',
  jobOther: '',
  gender: '',
  expectations: [],
  contactMethod: '',
  contactValue: '',
  paid: false,
  withKids: false,
  hasAllergy: false,
  allergyNote: '',
}

/** Prefill the form from an existing attendee (for the edit screen). */
export function attendeeToForm(a: Attendee): AttendeeFormValues {
  return {
    name: a.name ?? '',
    job: a.job ?? '',
    jobOther: a.jobOther ?? '',
    gender: a.gender ?? '',
    expectations: a.expectations ?? [],
    contactMethod: a.contactMethod ?? '',
    contactValue: a.contactValue ?? '',
    paid: !!a.paid,
    withKids: !!a.withKids,
    hasAllergy: !!a.hasAllergy,
    allergyNote: a.allergyNote ?? '',
  }
}

const inputCls =
  'min-h-11 rounded-[8px] border-2 border-line px-3 py-2 focus:border-meat focus:outline-none'
const selectCls =
  'min-h-11 rounded-[8px] border-2 border-line bg-white px-2 py-2 text-[14px] focus:border-meat focus:outline-none'

export function AttendeeFields({
  values,
  onChange,
}: {
  values: AttendeeFormValues
  onChange: (next: AttendeeFormValues) => void
}) {
  const set = <K extends keyof AttendeeFormValues>(k: K, v: AttendeeFormValues[K]) =>
    onChange({ ...values, [k]: v })

  return (
    <>
      <input
        className={inputCls}
        value={values.name}
        onChange={(e) => set('name', e.target.value)}
        placeholder="名前（必須）"
        maxLength={16}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`flex-1 ${selectCls}`}
          value={values.job}
          onChange={(e) => set('job', e.target.value)}
        >
          <option value="">職業（任意）</option>
          {JOBS.map((j) => (
            <option key={j.value} value={j.value}>
              {j.emoji} {j.value}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={values.gender}
          onChange={(e) => set('gender', e.target.value)}
        >
          <option value="">性別（任意）</option>
          <option value="男">男</option>
          <option value="女">女</option>
          <option value="その他">その他</option>
        </select>
      </div>
      {values.job === 'その他' && (
        <input
          className={inputCls}
          value={values.jobOther}
          onChange={(e) => set('jobOther', e.target.value)}
          placeholder="職業（その他・自由入力）"
          maxLength={16}
        />
      )}
      <div className="grid gap-1">
        <span className="text-[12px] text-ink-soft">楽しみ（任意）</span>
        <div className="flex flex-wrap gap-2">
          {EXPECTATIONS.map((x) => {
            const on = values.expectations.includes(x.key)
            return (
              <button
                type="button"
                key={x.key}
                onClick={() =>
                  set(
                    'expectations',
                    on
                      ? values.expectations.filter((k) => k !== x.key)
                      : [...values.expectations, x.key],
                  )
                }
                className={`min-h-10 rounded-pill border-2 px-3 text-[13px] font-semibold ${
                  on ? 'border-meat bg-cream text-meat' : 'border-line text-ink-soft'
                }`}
              >
                {x.emoji} {x.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectCls}
          value={values.contactMethod}
          onChange={(e) => set('contactMethod', e.target.value)}
        >
          <option value="">連絡手段（任意）</option>
          {CONTACT_METHODS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          className={`min-w-0 flex-1 ${inputCls}`}
          value={values.contactValue}
          onChange={(e) => set('contactValue', e.target.value)}
          placeholder="ID / ユーザー名"
          maxLength={50}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-soft">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="h-4 w-4 accent-meat"
            checked={values.paid}
            onChange={(e) => set('paid', e.target.checked)}
          />
          支払い済み
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="h-4 w-4 accent-meat"
            checked={values.withKids}
            onChange={(e) => set('withKids', e.target.checked)}
          />
          🧒 子連れ
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="h-4 w-4 accent-meat"
            checked={values.hasAllergy}
            onChange={(e) => set('hasAllergy', e.target.checked)}
          />
          ⚠️ アレルギー
        </label>
      </div>
      {values.hasAllergy && (
        <input
          className={inputCls}
          value={values.allergyNote}
          onChange={(e) => set('allergyNote', e.target.value)}
          placeholder="アレルギーの内容（任意）"
          maxLength={100}
        />
      )}
    </>
  )
}
