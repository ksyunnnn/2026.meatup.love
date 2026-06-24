'use client'

// Data セクションの公開集計。PII を含まない「数字だけ」を public な stats/{edition}
// に1ドキュメントで持つ。手動追加(manual_*)も含む全 approved から admin が計算して
// 書き込み、トップは匿名でこれ1件を読むだけ（shares だと手動分が欠けるため stats に集約）。
import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { EDITION, displayRole } from './ticket'
import type { AttendeeWithId } from './attendees'

export interface StatsShape {
  total: number
  gender: { male: number; female: number; other: number }
  jobWords: { word: string; w: number }[]
  expectations: { key: string; n: number }[]
}

const EXP_KEYS = ['meat', 'connect', 'drink', 'play'] as const

/** approved 全件（手動含む）から公開用の数字を計算（純粋関数・PIIなし）。 */
export function computeStats(attendees: AttendeeWithId[]): StatsShape {
  const ap = attendees.filter((a) => a.status === 'approved')
  const gender = { male: 0, female: 0, other: 0 }
  const jobCount = new Map<string, number>()
  const exp: Record<string, number> = { meat: 0, connect: 0, drink: 0, play: 0 }
  for (const a of ap) {
    if (a.gender === '男') gender.male++
    else if (a.gender === '女') gender.female++
    else if (a.gender) gender.other++
    const role = displayRole(a.job, a.jobOther)
    if (role) jobCount.set(role, (jobCount.get(role) ?? 0) + 1)
    for (const e of a.expectations ?? []) if (e in exp) exp[e]++
  }
  return {
    total: ap.length,
    gender,
    jobWords: [...jobCount.entries()]
      .map(([word, w]) => ({ word, w }))
      .sort((a, b) => b.w - a.w),
    expectations: EXP_KEYS.map((key) => ({ key, n: exp[key] })),
  }
}

/** admin が呼ぶ：今の roster から集計して公開 stats を更新（rules で isAdmin 強制）。 */
export async function writeStats(attendees: AttendeeWithId[]): Promise<void> {
  const s = computeStats(attendees)
  await setDoc(doc(db, 'stats', EDITION), { ...s, updatedAt: serverTimestamp() })
}

/** トップ用：公開 stats を購読。未作成/読めない時は null（呼び出し側がスナップショットへフォールバック）。 */
export function useStats(): StatsShape | null {
  const [stats, setStats] = useState<StatsShape | null>(null)
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'stats', EDITION),
      (snap) => {
        if (!snap.exists()) return
        const d = snap.data() as Partial<StatsShape>
        setStats({
          total: d.total ?? 0,
          gender: d.gender ?? { male: 0, female: 0, other: 0 },
          jobWords: d.jobWords ?? [],
          expectations: d.expectations ?? [],
        })
      },
      () => {
        /* permission-denied / offline → keep null = fallback */
      },
    )
    return () => unsub()
  }, [])
  return stats
}
