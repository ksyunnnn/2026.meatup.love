@AGENTS.md

# meatup 2026

今年度開催回サイト。**招待管理機能つき**（簡単な認証＋仮想チケット発行。チケットは
現場では使わず“盛り上げ”用）。親ハブ `meatup`（歴代開催回を横断管理）配下の独立リポジトリ。

## スタック
- Next.js 16 (App Router) / React 19 / TypeScript（公式 create-next-app 準拠、Tailwind なし）
- Firebase（Auth: Google / GitHub / メール、Firestore）— client SDK 中心
- ホスティング／静的化（`output:'export'`）は**未確定**（後で決定）

## コマンド
- `npm run dev` — 開発サーバ（Turbopack 既定）
- `npm run build` — 本番ビルド（型チェック込み）
- `npm run lint` / `npm run lint:fix` — ESLint
- `firebase emulators:start` — Auth:9099 / Firestore:8080 / UI:4000（`.firebaserc` は demo プロジェクト）

## 構成
- `src/app/` — ルート（invite / register / ticket / admin）。`useSearchParams` 利用ページは Suspense でラップ
- `src/lib/firebase.ts` — Firebase 初期化＋Emulator 接続
- `src/lib/types.ts` — Attendee / Invite モデル
- `firestore.rules` — セキュリティルール（**DRAFT**）

## 規約
- Firebase／フックを使う画面は `'use client'`。
- Next 16 は破壊的変更あり。コードを書く前に `node_modules/next/dist/docs/` を確認（AGENTS.md 参照）。
- `.env.local` は秘密情報ではないが gitignore。雛形は `.env.local.example`。

## 詳細・未決事項・後回し
仕様と後回し項目（**進行中のロードマップ**）は `docs/SPEC.md` を参照（毎セッションには読み込まない）。
