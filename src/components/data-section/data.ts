// ── Data セクション試作用の集計データ ──────────────────────────────────────
// 本番 Firestore(meatup-2026) の approved 21人を集計した「実数」を、表現の比較
// だけに使う固定値として置いたもの（数値のみ＝PIIなし）。本実装では gender/勢い
// は admin が書く公開 stats、job/期待は公開 shares から算出する想定（別途決定）。
// ここはあくまで“見た目を選ぶ”ための素材。

export const TOTAL = 21

export interface Slice {
  key: string
  label: string
  n: number
  emoji?: string
}

/** 男女比（admin が割当 → 集計値だけ公開する想定の項目） */
export const GENDER: Slice[] = [
  { key: 'male', label: '男', n: 12 },
  { key: 'female', label: '女', n: 9 },
]

// 絵文字・ラベルはフォーム正本 src/lib/profile.ts に合わせる（ドリフト防止）。

/** 職業分布（公開 shares.role から算出できる項目）。多い順。 */
export const JOBS: Slice[] = [
  { key: 'engineer', label: 'エンジニア', n: 9, emoji: '🧑‍💻' },
  { key: 'creative', label: 'クリエイティブ', n: 4, emoji: '🎨' },
  { key: 'other', label: 'その他', n: 4, emoji: '🙂' },
  { key: 'business', label: 'ビジネス', n: 3, emoji: '📈' },
  { key: 'owner', label: '経営・フリーランス', n: 1, emoji: '🧑‍💼' },
]

/** 期待タグ（公開 shares.expectations から算出）。複数選択なので合計は人数を超える。 */
export const EXPECTATIONS: Slice[] = [
  { key: 'meat', label: '肉', n: 18, emoji: '🍖' },
  { key: 'connect', label: '繋がり', n: 12, emoji: '🤝' },
  { key: 'drink', label: '酒', n: 10, emoji: '🍺' },
  { key: 'play', label: '遊び', n: 8, emoji: '🎧' },
]

/**
 * 期待タグの表示色（全ウィジェット共通の真実の源＝色がドリフトしないよう一元化）。
 * 遊びだけ寒色のブルーグレー＝音楽っぽさ＆暖色2つ(酒/肉)との差別化。
 */
export const EXP_COLORS: Record<string, string> = {
  meat: 'var(--color-meat)', // 赤
  connect: 'var(--color-gold)', // ゴールド
  drink: 'var(--color-grill)', // オレンジ茶
  play: '#717e8b', // スレートグレー（青より少しグレー寄り・音楽っぽく）
}

/** 登録の伸び（createdAt の日次件数）。累計で「埋まっていく」勢いを出す。 */
export const MOMENTUM: { date: string; n: number }[] = [
  { date: '6/19', n: 8 },
  { date: '6/20', n: 1 },
  { date: '6/21', n: 3 },
  { date: '6/22', n: 4 },
  { date: '6/23', n: 5 },
]

/** 累計（[8, 9, 12, 16, 21]）。スパークラインや「焼け具合」に使う。 */
export const CUMULATIVE = MOMENTUM.reduce<number[]>((acc, d) => {
  acc.push((acc[acc.length - 1] ?? 0) + d.n)
  return acc
}, [])

/** 男女比の構成（男12/女9 → 男が約57%） */
export const maleRatio = GENDER[0].n / TOTAL

/**
 * 職業ワードクラウド用。固定カテゴリ＋「その他」の自由入力(jobOther)を1語ずつ展開。
 * 自由入力が“見える化”されるのがワードクラウドの旨味。w=出現重み。
 */
export const JOB_WORDS: { word: string; w: number }[] = [
  { word: 'エンジニア', w: 9 },
  { word: 'クリエイティブ', w: 4 },
  { word: 'ビジネス', w: 3 },
  { word: '経営・フリーランス', w: 1 },
  { word: '学生', w: 1 },
  { word: 'IT、ファッション', w: 1 },
  { word: '複業！ソフトウェアと不動産', w: 1 },
  { word: '転職活動中', w: 1 },
  { word: 'ハイパーメディアクリエイター', w: 1 },
]
