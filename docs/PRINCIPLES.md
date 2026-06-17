# 内部品質の原則（一次出典で「固定」）と本コードでの適用

> 「固定」＝言い換えでなく、**公式ドキュメントの URL ＋ 原文引用**を残し、さらに
> **その原則が本コードのどこで満たされているか（file\:line）**まで対応づける。
> 引用は調査時点（2026-06）の各公式ページから取得した verbatim。

## React/Next/web.dev が明文化する原則

### 1. コンポーネントは単一責務（関心の分離）
- 出典: React「Thinking in React」 https://react.dev/learn/thinking-in-react
- 原文: “…the separation of concerns, that is, a component should ideally only be concerned with one thing.”
- 背後理論: 関心の分離（Dijkstra, 1974）／単一責任原則 SRP（Robert C. Martin）／凝集度（Constantine）
- 本コードの証跡:
  - データ取得は `src/lib/*`（`attendees.ts`/`invites.ts`/`auth.ts`/`use-auth.ts`）、表示は `src/app/*/page.tsx` に分離。
  - 認可は `firestore.rules`、OGP は `functions/` と層で分離（UIは知らない）。

### 2. 合成 > 継承
- 出典: React「Composition vs Inheritance」（※legacy。現 react.dev は children で合成を示すが本文言なし）
  https://legacy.reactjs.org/docs/composition-vs-inheritance.html
- 原文: “React has a powerful composition model, and we recommend using composition instead of inheritance to reuse code between components.”
- 背後理論: GoF「クラス継承よりオブジェクト合成を優先」（Gamma/Helm/Johnson/Vlissides, 1994）
- 本コードの証跡:
  - `children` 合成：`src/app/layout.tsx`、Suspense ラップ `src/app/invite/page.tsx`・`src/app/register/page.tsx`。
  - 継承でなく**共有プリミティブの合成**：`globals.css` の `.btn`/`.card` を各ページが組み合わせ。

### 3. コンポーネント／レンダーは純粋
- 出典: React「Keeping Components Pure」 https://react.dev/learn/keeping-components-pure
- 原文: “React assumes that every component you write is a pure function.”（同ページ “Same inputs, same output.”）
- 背後理論: 純粋関数・参照透過性（関数型の系譜）
- 本コードの証跡:
  - 副作用は描画中でなく effect 内に隔離。購読は `src/lib/use-auth.ts:12-19`（`onAuthStateChanged`）。
  - effect の同期 setState を避け `.then` 内のみ更新：`src/app/ticket/page.tsx:14-25`、`src/app/admin/page.tsx`（`react-hooks/set-state-in-effect` 準拠）。

### 4. 状態は読み取り専用（不変）
- 出典: React「Updating Objects in State」 https://react.dev/learn/updating-objects-in-state
- 原文: “…you should treat any JavaScript object that you put into state as read-only.”
- 背後理論: 不変性（FP）
- 本コードの証跡:
  - 不変更新：`src/app/admin/page.tsx` の `setAttendees(prev => prev.map(...))` / `setInvites` 再生成。新しい配列を作り直接変更しない。

### 5. 信頼できる唯一の情報源（単方向データフロー）
- 出典: React「Sharing State Between Components」 https://react.dev/learn/sharing-state-between-components
- 原文: “For each unique piece of state, you will choose the component that 'owns' it. This principle is also known as having a 'single source of truth'.”
- 背後理論: Flux（Facebook, 2014）→ Redux（Abramov & Clark, 2015）
- 本コードの証跡:
  - 開催回は `EDITION`（`src/lib/attendees.ts`）1か所、状態ラベルは `STATUS_LABEL`（`src/app/admin/page.tsx`）1か所、データ型は `src/lib/types.ts` が正。認証状態は `useAuth` 単一源。

### 6. Rules of Hooks
- 出典: React「Rules of Hooks」 https://react.dev/reference/rules/rules-of-hooks
- 原文: “…always use Hooks at the top level of your React function, before any early returns.”
- 本コードの証跡:
  - 全クライアントページで Hooks をトップレベル呼び出し。`eslint-plugin-react-hooks`（`eslint-config-next`）で機械的に強制（`npm run lint` 緑）。

### 7. サーバー／クライアント境界（サーバー優先・クライアントJS削減）
- 出典: Next.js「Server and Client Components」 https://nextjs.org/docs/app/getting-started/server-and-client-components
- 原文: “`"use client"` is used to declare a boundary between the Server and Client module graphs (trees).” ／ サーバー利用の利点として “Reduce the amount of JavaScript sent to the browser.”
- 背後理論: 関心の分離（Dijkstra）の配置版
- 本コードの証跡:
  - トップは Server Component（`src/app/page.tsx`、`'use client'` なし）。Firebase/フック必要画面のみ `'use client'`（`ticket`/`invite`/`register`/`admin`）。
  - クライアントJS削減＝`output:'export'`（`next.config.ts`）で純静的配信。

### 8. Core Web Vitals（品質の操作的定義）
- 出典: web.dev「Web Vitals」 https://web.dev/articles/vitals
- 原文: 三指標 “Largest Contentful Paint (LCP) … Interaction to Next Paint (INP) … Cumulative Layout Shift (CLS).”（“…INP became a stable Core Web Vital metric in 2024.”）
- 本コードの証跡（CLS/LCP/転送量への配慮）:
  - CLS: `next/font/local` 自己ホスト（`src/app/layout.tsx`）でレイアウトシフト抑制。
  - LCP: 静的書き出し（即時配信）。
  - 転送量: CJK Web フォントを配らずシステム日本語スタック（`globals.css`）。

## 古典原則の適用（今回のリファクタで実践）
- 出典: DRY「Don't Repeat Yourself」— Hunt & Thomas『The Pragmatic Programmer』(1999)／情報隠蔽 — Parnas (1972)
- 本コードの証跡:
  - 共有/OG 関数の重複（id 検証・REST 取得・HTML エスケープ）を `functions/_lib/shares.js` に集約。
    `functions/t/[id].js`・`functions/og/[id].js` は `isValidId`/`fetchShare`/`escapeHtml` を import。
  - `fetchShare` が Firestore REST の形を隠蔽（呼び出し側は `{name, ticketNo}` だけ知る）＝情報隠蔽。

## 既知のギャップ（過剰設計を避けて未実施＝YAGNI）
- `<TicketCard>` 等のUI抽出：現状チケット表示の再利用先が1か所のみのため未抽出（消費者が増えたら抽出）。
  YAGNI（XP, Beck/Jeffries）に従い、必要になってから。
- ~~テストの永続化~~ → **追加済み**：Vitest 単体テスト（`test/unit/`：ticket コード形式・
  `isValidId`/`escapeHtml`/`fetchShare`）と Firestore ルールテスト（`test/rules/`：自己承認不可・
  招待単回使用・shares 公開read/本人write/ticketNo不変・admins 自己read）。CI（`.github/workflows/ci.yml`）
  で lint→build→unit→rules を実行。`npm test` / `npm run test:rules`。
