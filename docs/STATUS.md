# 現状と引き継ぎ（2026-06-17 時点）

作業ブランチ: **`style-and-ogp`**。本番(Pages/Firebase)はこのブランチのビルドを wrangler で
直接デプロイした状態が反映済み。ただし **origin 未push・main 未マージ**（マージはデザイン確定後でOK）。CI 緑。

## 本番（稼働中）
- サイト: **https://meatup-2026.pages.dev**（Cloudflare Pages、プロジェクト名 `meatup-2026`）
- バックエンド: Firebase **`meatup-2026`**
  - Firestore: 作成済み（`asia-northeast1`／Native）、`firestore.rules` デプロイ済み（招待枠ルール含む）
  - Auth: **Google ／ メールリンク（パスワードレス）ともに有効**。メールリンクは gcloud + Identity Toolkit
    Admin API で `signIn.email.enabled=true, passwordRequired=false` を設定済み（Console でも可）。
    GitHub は未設定（任意・コードは対応済み）。
  - 認可ドメイン: `localhost` / `*.firebaseapp.com` / `*.web.app` / **`meatup-2026.pages.dev`**
  - 管理者: `admins/rc9hmkk3M6dbpPfL8h6rhb9bi8h1`（オーナー本人）
- OG 関数: `functions/t/[id].js`・`og/[id].js`（`wrangler.toml` の `FIREBASE_PROJECT_ID=meatup-2026` を参照）

## 実装状況（主な機能）
- スタイル: **Tailwind v4 全面採用**（CSS Modules 全廃）。トークンは `globals.css` の `@theme`、
  base/primitives は `@layer`。トップは招待カード風の**固定赤枠**（PC は全幅）。
- 認証: Google / GitHub(コードのみ) / **メールリンク**（送信・戻り完了・別ブラウザ時のメール再入力
  フォールバック・アプリ内ブラウザ案内）。
- 招待: 主催者発行＝自動確定 / **確定者も招待発行可（招待枠＝1人3枚・FR9）**＝紹介ツリー。
  確定者発行のリンクは自動確定せず pending→主催承認（NFR4 維持）。
- 紹介元: 招待リンクの発行者から **自動追跡**（自由記入は廃止）。admin の承認待ち/参加者一覧に
  「招待元（主催者の招待 / ◯◯さんの招待 / 飛び込み）」を表示。
- トップ: 日程(7/25土)・会場(EAT TOKYO JAKUZURE)・カレンダー追加（小リンク）・🐦#meatup2026 ツイート
  チップ・過去サイトリンク(2018/2019summer)・#meatup2019。
- メタ: title `MEATUP2026` / description「お肉、食べようぜ！🍖」/ siteName。**OG 画像は未設定**（デザイン確定後）。

## 再デプロイ手順（現在は手動 / git 未連携）
```
cd sites/2026
npm run build           # .env.local の実 meatup-2026 キーを埋め込む（gitignore・ローカルにのみ存在）
npx wrangler pages deploy out --project-name meatup-2026 --branch main --commit-dirty=true
```
- ルール変更時: `npx firebase deploy --only firestore:rules --project meatup-2026`
- `.env.local`（実キー）はローカルのみ。別マシンで再構築する場合は
  `firebase apps:sdkconfig WEB <appId> --project meatup-2026` で再取得。

## 残タスク
- [ ] **独自ドメイン接続**（ハブ `deploy/` の本丸）：`meatup.love` を Cloudflare 接続 → apex を
      `meatup-2026` に割当／`2018.meatup.love`・`2019-summer.meatup.love` を各サイトに割当／
      **Firebase 認可ドメインに `meatup.love` 追加**／接続後トップの過去サイトリンクを subdomain へ更新。
- [ ] **実機の通し確認**（オーナー手動）：招待発行(/admin) → リンク → サインイン（**メール認証含む**）→
      登録 → チケット → 「シェア」で OGP プレビュー → /admin で確認/承認。
- [ ] **OG 画像**（共有プレビュー画像）をデザイン確定後に作成し `og:image` 設定（現状未設定）。
- [ ] **git push（`origin/style-and-ogp`）＋ `main` マージ**（本番はブランチビルドを直接デプロイ中・origin 未反映）。
- [ ] Cloudflare **git 連携**で push 自動デプロイ化（任意・今は手動 wrangler）。その際 Pages に
      `NEXT_PUBLIC_FIREBASE_*`（ビルド時）と `FIREBASE_PROJECT_ID`（関数）を設定。
- [ ] GitHub 認証プロバイダ（任意・github.com で OAuth App 作成）。
- [ ] トップに **会費・住所** を出すか（未決）／ボタン意匠の深掘り（任意・「招待状」テーマで差別化案あり）。
- [ ] 記事化（`docs/DESIGN.md`・`PRINCIPLES.md` が素材）。

## ドキュメント
- `docs/SPEC.md` 仕様ロードマップ / `DESIGN.md` 意匠・OGP設計（出典付き） /
  `PRINCIPLES.md` 内部品質原則の固定 / `DEPLOY.md` 手順
