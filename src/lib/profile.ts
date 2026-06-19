// Shared profile options. Kept out of the page components so the registration
// form and the admin invite form use the SAME job categories — otherwise the
// invite prefill and the aggregation counts could drift apart.
//
// Coarse job buckets (single-select) — kept broad so counts stay meaningful.
export const JOBS = [
  { value: 'エンジニア', emoji: '🧑‍💻' },
  { value: 'クリエイティブ', emoji: '🎨' },
  { value: 'ビジネス', emoji: '📈' },
  { value: '経営・フリーランス', emoji: '🧑‍💼' },
  { value: '学生', emoji: '🎓' },
  { value: 'その他', emoji: '🙂' },
] as const
