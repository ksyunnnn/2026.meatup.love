# 現状と引き継ぎ（2026-06-18 時点）

ブランチ: `main` ＝ `origin`（push 済み）。本番(Pages/Firebase)は最新ビルド反映済み。
デプロイは手動 `wrangler`（git 未連携）。今後も `main` で作業。

## 本番（稼働中）
- **独自ドメイン接続 完了**（Cloudflare ゾーン `meatup.love`・レジストラ＝ムームードメイン）
  - **https://meatup.love** … apex ＝ 2026（`meatup-2026`）
  - **https://2018.meatup.love** … `meatup-2018`
  - **https://2019-summer.meatup.love** … `meatup-2019-summer`
  - DNS は CNAME→`*.pages.dev`（全部 Proxied 🟠）。割当はハブ `deploy/routing.md` が正本。
  - `*.pages.dev`（例 `meatup-2026.pages.dev`）も従来通り生きている。
- バックエンド: Firebase **`meatup-2026`**（Firestore `asia-northeast1`／Native、`firestore.rules` デプロイ済み）
  - Auth: **Google ／ メールリンク（パスワードレス）**。**GitHub は廃止**（UI・lib とも削除）。
  - 認可ドメイン: `localhost` / `*.firebaseapp.com` / `*.web.app` / `meatup-2026.pages.dev` / **`meatup.love`**
  - 管理者: `admins/rc9hmkk3M6dbpPfL8h6rhb9bi8h1`（オーナー本人）
- OG: デフォルト画像 `public/og.png`（`og:image`＝`https://meatup.love/og.png`）＋ 個別チケット OG 関数
  `functions/og/[id].js`・`t/[id].js`（`FIREBASE_PROJECT_ID=meatup-2026`）。デフォルト画像生成は `scripts/og/`。
  個別OGは `shares/{uid}`（`name`/`ticketNo`/`role`/`expectations`）を読んで動的描画（QR=`qrcode-generator`）。

## 実装状況（主な機能）
- スタイル: Tailwind v4。トークンは `globals.css` の `@theme`。
  **赤枠は `main` 自身の border（in-flow・position:fixed を使わない）**＝iOS Safari の動的ツールバー
  問題を回避（`min-h-lvh`＋cream背景）。`src/components/icons.tsx` にブランドアイコン（IG/Twitter/LINE）。
- トップ: **マルチセクション**（Hero → About（軽い導入）→ **Wanted** → Schedule/Content/Data（🚧準備中）→ footer）。
  - マスコット＝oniku（2018/2019共通 SVG、`public/oniku.svg`／`Oniku`）。Hero のは**タップで跳ねる**
    （`BounceOniku`＝animate.css、連打で激化・マウントで落下→jiggle）。
  - Wanted: DJ／スナック・バー／運営手伝い の募集（文言はオーナーが調整予定）。
  - 連絡先: 公開トップは Instagram / Twitter のみ（LINE は出さない＝イタズラ防止）。
- 認証画面（/invite）: Google ＋ メールリンクの2択。既登録者は「もう登録済み」→ /ticket へ誘導。
- 招待/登録: 主催発行＝自動確定 / 確定者発行（FR9・1人3枚）＝pending→主催承認。紹介元は自動追跡。
  - 登録フォーム: 名前／**何が楽しみ？（複数選択 expectations）**／**職業（6カテゴリ単一＋その他自由入力）**／性別。必須。
  - **既登録者の再登録は不可**（ルールが ticketNo 上書きを拒否）→ invite/register で先回りして /ticket へ。
- チケット: **券面＝OG が同一意匠**の横長ボーディングパス（`src/components/ticket-card.tsx` と
  `functions/og/[id].js`）。GUEST／肩書き／名前／日時・会場フッター／半券(oniku＋**QR**＋No.)＋
  「楽しみ」選択を一字にした**透かし**（肉/麦/遊/繋）。状態(確定/受付)は券外表示。詳細は `DESIGN.md §3`。
- チケット: 上記の券＋シェア＋**参加費**（通常5,000/事前4,500・並列表示・記載のみ）。
  事前決済は**オンデマンド**（PayPay の受け取りリンク/QR は失効するため静的に貼らない＝
  「連絡くれたら都度リンク送る」）。連絡＝LINE(主)＋IG/Twitter。確定者は招待発行枠。
- admin: 承認、招待発行、**支払い管理（✓払った トグル＋支払い済みカウント）**、
  「楽しみ」集計＋その他職業の自由入力表示。

## 再デプロイ手順（手動 / git 未連携）
```
cd sites/2026
npm run build           # .env.local の実 meatup-2026 キーを埋め込む（gitignore・ローカルのみ）
npx wrangler pages deploy out --project-name meatup-2026 --branch main --commit-dirty=true
```
- ルール変更時: `npx firebase deploy --only firestore:rules --project meatup-2026`
- ⚠ **チケット刷新の初回は順序厳守**：`shares` に `role`/`expectations` を書くため、**先に firestore:rules を
  デプロイ**してから `out/` を公開する。古いルールのままだと登録時の `shares` 書き込みが拒否され**登録が失敗**する。
  既存登録者の `shares` には新フィールドが無いので、その個別OGは名前＋No.のみのフォールバック（新規からフル表示）。
- ⚠ **ビルド後に必ず再ビルドしてからデプロイ**（編集後に古い `out/` を出さない）。
- カスタムドメイン割当は REST API で可（pages:write）。ただし **DNS 作成は zone:edit が要る**ので
  ダッシュボード操作（今回オーナーが CNAME 3本追加済み）。詳細はハブ `deploy/cloudflare-runbook.md`。

## 残タスク
- [ ] **実機の通し確認**（オーナー手動・要サインイン）：招待発行(/admin) → サインイン（メール含む）→
      登録（楽しみ/職業）→ チケット（参加費表示）→ シェアで OGP → /admin で承認・✓払った。
- [ ] **PayPay 本人確認(KYC)**：2026/6/17 から受け取りに必須。事前集金するなら要対応（オーナー）。
- [ ] **Wanted の文言**・各セクション中身（Schedule/Content/Data は現在 🚧準備中の placeholder）。
- [ ] Cloudflare **git 連携**で push 自動デプロイ化（任意）。Pages に `NEXT_PUBLIC_FIREBASE_*`＋
      `FIREBASE_PROJECT_ID` を設定。
- [ ] `www.meatup.love`→apex リダイレクト（任意）。
- [ ] 記事化（`docs/DESIGN.md`・`PRINCIPLES.md`＋メモ `idtk-auth-config-via-gcloud` が素材）。

## ドキュメント
- `docs/SPEC.md` 仕様 / `DESIGN.md` 意匠・OGP（出典付き） / `PRINCIPLES.md` 内部品質原則 / `DEPLOY.md` 手順
