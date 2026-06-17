# 現状と引き継ぎ（2026-06-17 時点）

作業ブランチ: **`style-and-ogp`**（main 未マージ）。CI 緑。

## 本番（稼働中）
- サイト: **https://meatup-2026.pages.dev**（Cloudflare Pages、プロジェクト名 `meatup-2026`）
- バックエンド: Firebase **`meatup-2026`**
  - Firestore: 作成済み（`asia-northeast1`／Native）、`firestore.rules` デプロイ済み
  - Auth: **Google 有効**（GitHub は未設定＝任意で後日）。**メールリンク（パスワードレス）はコード実装済み
    だが Console での有効化が必要**＝下記「残タスク」参照
  - 認可ドメイン: `localhost` / `*.firebaseapp.com` / `*.web.app` / **`meatup-2026.pages.dev`**
  - 管理者: `admins/rc9hmkk3M6dbpPfL8h6rhb9bi8h1`（オーナー本人）
- OG 関数: `functions/t/[id].js`・`og/[id].js`（`wrangler.toml` の `FIREBASE_PROJECT_ID=meatup-2026` を参照）

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
- [ ] **実機の通し確認**（オーナー手動）：招待発行(/admin) → リンクを開く → Google → 登録 →
      チケット → 「シェア」で OGP プレビュー → /admin で確認/承認
- [ ] GitHub 認証プロバイダ（任意・github.com で OAuth App 作成が必要）
- [ ] **メールリンク（パスワードレス）を有効化**：Firebase Console → Authentication → Sign-in method で
      「メール / パスワード」を有効化し、**「メールリンク（パスワードなしでログイン）」を ON**。
      認可ドメインは既存（`localhost` / `*.pages.dev` / 後日 `meatup.love`）でカバー。
      コードは実装済み（`src/lib/auth.ts` の `sendEmailSignInLink`/`completeEmailLinkSignIn`、招待画面のUI）。
      ※ リンクは「送信したブラウザ」と別で開いても、完了画面でメール再入力すれば成立する設計。
      アプリ内ブラウザは検知して「外部ブラウザで開く」を案内（強制はOS仕様上不可）。
- [ ] Cloudflare を **git 連携**にして push 自動デプロイ化（今は手動 wrangler）。その際は
      Pages ダッシュボードで `NEXT_PUBLIC_FIREBASE_*`（ビルド時）と `FIREBASE_PROJECT_ID`（関数）を設定
- [ ] 独自ドメイン `meatup.love` 接続＋apex ルーティング（ハブ `deploy/` の責務）
- [ ] `style-and-ogp` を main にマージ（デザイン方向性 OK なら）
- [ ] 記事化（`docs/DESIGN.md`・`PRINCIPLES.md` が素材）

## ドキュメント
- `docs/SPEC.md` 仕様ロードマップ / `DESIGN.md` 意匠・OGP設計（出典付き） /
  `PRINCIPLES.md` 内部品質原則の固定 / `DEPLOY.md` 手順
