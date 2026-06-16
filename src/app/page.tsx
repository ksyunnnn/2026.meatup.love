import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.8 }}>
      <h1>meatup 2026</h1>
      <p>scaffold（骨組み）— 画面遷移の確認用。スタイルは後続サイクルで。</p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link href="/invite?name=佐藤">/invite?name=佐藤（招待リンク例）</Link>
        <Link href="/register">/register</Link>
        <Link href="/ticket">/ticket</Link>
        <Link href="/admin">/admin</Link>
      </nav>
    </main>
  )
}
