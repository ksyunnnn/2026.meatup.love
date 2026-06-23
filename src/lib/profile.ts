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

// "What are you looking forward to" — multi-select. Single source so the admin
// add/edit forms, the roster display, and the aggregation counts can't drift.
export const EXPECTATIONS = [
  { key: 'meat', emoji: '🍖', label: '肉' },
  { key: 'drink', emoji: '🍺', label: '酒' },
  { key: 'play', emoji: '🎧', label: '遊び' },
  { key: 'connect', emoji: '🤝', label: '繋がり' },
] as const

// Reachable channels offered to the host when recording a guest's contact.
export const CONTACT_METHODS = ['LINE', 'Instagram', 'Twitter', 'Discord'] as const
