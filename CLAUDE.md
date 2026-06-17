@AGENTS.md

# meatup 2026

今年度開催回サイト。**招待管理機能つき**（簡単な認証＋仮想チケット発行。チケットは
現場では使わず“盛り上げ”用）。親ハブ `meatup`（歴代開催回を横断管理）配下の独立リポジトリ。

## スタック
- Next.js 16 (App Router) / React 19 / TypeScript（公式 create-next-app 準拠、Tailwind なし）
- `output:'export'`（純静的）。スタイルは CSS Modules＋`globals.css` トークン、見出しは `next/font/local`
- Firebase（Auth: Google / Firestore）— client SDK 中心。認可は `firestore.rules` で強制
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

## ドキュメント
- `docs/STATUS.md` 本番の現状・引き継ぎ / `DEPLOY.md` 再デプロイ・再構築 runbook
- `docs/SPEC.md` 仕様ロードマップ / `DESIGN.md` 意匠・OGP設計（出典付き） / `PRINCIPLES.md` 内部品質原則の固定
- ※ 毎セッションには読み込まない（必要時に参照）
