@AGENTS.md

# meatup 2026

今年度開催回サイト。**招待管理機能つき**（簡単な認証＋仮想チケット発行。チケットは
現場では使わず“盛り上げ”用）。親ハブ `meatup`（歴代開催回を横断管理）配下の独立リポジトリ。

## スタック
- Next.js 16 (App Router) / React 19 / TypeScript（公式 create-next-app 準拠）
- `output:'export'`（純静的）。スタイル＝**Tailwind v4（ゼロランタイム）**。ブランドトークンは
  `globals.css` の `@theme`（真実の源）、ベース/プリミティブは `@layer base`/`@layer components`
  に配置（unlayered だとユーティリティに勝ってしまうため必須）。見出しは `next/font/local`
- Firebase（Auth: **Google / GitHub / メールリンク（パスワードレス）** / Firestore）— client SDK 中心。
  認可は `firestore.rules` で強制
- ホスティング＝**Cloudflare Pages**（本番稼働中）。個別チケット OGP は **Cloudflare Pages Functions**（`functions/`）

## コマンド
- `npm run dev` — 開発サーバ（Turbopack 既定）
- `npm run build` — 本番ビルド（静的書き出し・型チェック込み）
- `npm run lint` / `npm run lint:fix` — ESLint
- `npm test` — Vitest 単体 / `npm run test:rules` — Firestore ルールテスト（emulator）
- `firebase emulators:start` — Auth:9099 / Firestore:8080 / UI:4000（`.firebaserc` の default は demo）
- 再デプロイ手順は `docs/DEPLOY.md`、本番の現状は `docs/STATUS.md`

## 構成
- `src/app/` — ルート（invite / register / ticket / admin）。`useSearchParams` 利用ページは Suspense でラップ
- `src/lib/` — `firebase.ts`（初期化＋Emulator）/ `types.ts`（モデル）/ `ticket.ts`（純粋ロジック）/ `attendees.ts` / `invites.ts`
- `functions/` — Cloudflare Pages Functions（`t/[id]`＝OGメタ, `og/[id]`＝画像, `_lib/shares.js`＝共有）
- `firestore.rules` — セキュリティルール / `test/` — 単体・ルールテスト

## 規約
- Firebase／フックを使う画面は `'use client'`。
- Next 16 は破壊的変更あり。コードを書く前に `node_modules/next/dist/docs/` を確認（AGENTS.md 参照）。
- `.env.local` は秘密情報ではないが gitignore。雛形は `.env.local.example`。

## デザイン判断の軸（UI/IA で迷ったら）
根拠が無いとブレるので固定。基準＝**Apple HIG**（転用）＋**WCAG**。**効く判断はその場でHIG該当節を実取得して裏取り**（記憶の逐語は不可）。正本・出典は `docs/DESIGN.md §0`。
1. 重要度＝目立ち（強調は最重要1つ／塗り・色ボタンは1画面1〜2個）。
2. 正直なアフォーダンス（見た目＝実挙動。やらない事をやるように見せない・遷移は示す）。
3. 破壊的操作＝赤＋確認、主役にしない（本アプリのキャンセルは破壊的でない＝連絡導線に集約）。
4. ラベルは具体動詞・予測可能（単独「キャンセル」は避ける＝HIGでは"操作の取消"と衝突）。
5. 意味でグループ化・見出し＝中身（1画面が2役なら区切る。例: /ticket＝券＋会員ホーム）。
6. 状態で出し分け（pending/approved で「最重要＝最も目立つ」が変わる）。

## ドキュメント
- `docs/STATUS.md` 本番の現状・引き継ぎ / `DEPLOY.md` 再デプロイ・再構築 runbook
- `docs/SPEC.md` 仕様ロードマップ / `DESIGN.md` 意匠・OGP設計（出典付き） / `PRINCIPLES.md` 内部品質原則の固定
- ※ 毎セッションには読み込まない（必要時に参照）
