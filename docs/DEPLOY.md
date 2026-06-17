# デプロイ手順 / Runbook（meatup 2026）

> 本番は構築済み。現在の状態（URL・プロジェクトID・管理者）は **`docs/STATUS.md`** を参照。
> 本書は「再デプロイ」と「ゼロから再構築」の手順。実際に通したコマンドを載せている。
> apex（`meatup.love`）振り分けはハブ `deploy/` 層の責務で本書の範囲外。

## 構成（決定済み）
- ホスティング＝**Cloudflare Pages**（静的 Next `output:'export'` の `out/` を配信）。
- バックエンド＝**Firebase**（Auth: Google / Firestore）。Firebase Hosting は不使用。
- 個別チケット OGP＝**Cloudflare Pages Functions**（`functions/t/[id].js`・`og/[id].js`）。
  `_routes.json` は `functions/` から Cloudflare が自動生成（`/t/*`・`/og/*` のみ関数）。

---

## 1. 通常の再デプロイ（コード変更時）
前提: ローカルに `.env.local`（実 `meatup-2026` キー・gitignore）。`wrangler login` 済み。
```
cd sites/2026
npm run build
npx wrangler pages deploy out --project-name meatup-2026 --branch main --commit-dirty=true
```
- **ルール変更時**: `npx firebase deploy --only firestore:rules --project meatup-2026`
- `.env.local` を失った場合は再取得:
  `npx firebase apps:sdkconfig WEB <appId> --project meatup-2026`（appId は STATUS.md）

> 将来 git 連携（push 自動デプロイ）にする場合は Cloudflare Pages ダッシュボードで
> Build=`npm run build` / Output=`out` を設定し、環境変数に **ビルド時**=`NEXT_PUBLIC_FIREBASE_*`＋
> `NEXT_PUBLIC_USE_EMULATOR=false`、**関数実行時**=`FIREBASE_PROJECT_ID` を入れる。

---

## 2. ゼロから新規プロビジョニング（新開催回 / 別マシン再構築）
前提（対話ログインは各自のターミナルで一度ずつ）:
`firebase login` / `wrangler login` / `gcloud auth login`

```
# 2-1. プロジェクト作成
npx firebase projects:create <project-id> --display-name "meatup 20XX"

# 2-2. Web アプリ登録 → 設定キー取得 → .env.local 生成
npx firebase apps:create web "meatup 20XX web" --project <project-id>
npx firebase apps:sdkconfig WEB <appId> --project <project-id>   # 出力6値を .env.local へ
#   NEXT_PUBLIC_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID /
#   STORAGE_BUCKET / MESSAGING_SENDER_ID / APP_ID  と NEXT_PUBLIC_USE_EMULATOR=false

# 2-3. 必要 API を有効化（gcloud があれば CLI で。無ければコンソール）
gcloud services enable firestore.googleapis.com firebaserules.googleapis.com \
  identitytoolkit.googleapis.com --project <project-id>

# 2-4. Firestore 作成（東京・Native）
gcloud firestore databases create --location=asia-northeast1 --project <project-id>

# 2-5. ルールをデプロイ
npx firebase deploy --only firestore:rules --project <project-id>

# 2-6. Auth（Google）はコンソールで有効化（サポートメールを選ぶだけ）
#   https://console.firebase.google.com/project/<project-id>/authentication/providers
#   GitHub は任意（github.com で OAuth App 作成 → ClientID/Secret 登録）

# 2-7. Cloudflare Pages
npx wrangler pages project create <project-id> --production-branch main
npm run build
npx wrangler pages deploy out --project-name <project-id> --branch main --commit-dirty=true
```

### 2-8. 認可ドメイン追加（CLI・要 gcloud）
`wrangler` が払い出す `*.pages.dev` を Firebase Auth の authorizedDomains に追加:
```
TOKEN=$(gcloud auth print-access-token)
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: <project-id>" \
  -H "Content-Type: application/json" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/<project-id>/config?updateMask=authorizedDomains" \
  -d '{"authorizedDomains":["localhost","<project-id>.firebaseapp.com","<project-id>.web.app","<project-id>.pages.dev"]}'
```

### 2-9. 最初の管理者を登録（CLI・owner 権限でルールをバイパス）
uid は本人が一度サインイン後、コンソール Authentication > Users で確認:
```
TOKEN=$(gcloud auth print-access-token)
ADMIN=<uid>      # ※ zsh では変数名に UID を使わない（予約変数）
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: <project-id>" \
  -H "Content-Type: application/json" \
  "https://firestore.googleapis.com/v1/projects/<project-id>/databases/(default)/documents/admins/$ADMIN" \
  -d '{"fields":{}}'
```

---

## 3. 動作確認（スモークテスト・本番 URL で）
1. `/admin` で招待リンク発行 → 開く → Google サインイン → 登録 → `/ticket` が「確定」。
2. 招待なし `/register`（飛び込み）→ `pending` → `/admin`「確認しました！」→ 確定。
3. 同じ招待リンクを2人目 → 単回使用で `pending` に落ちる。
4. チケット「シェア」→ `/t/{uid}` を Facebook/X のカードデバッガで検証、`/og/{uid}` が名前入り 1200×630 PNG。

### OGP のローカル確認（任意）
- `.dev.vars`（gitignore）に `FIREBASE_PROJECT_ID=demo-meatup`＋`FIRESTORE_BASE_URL=http://127.0.0.1:8080`。
- エミュレータ起動 → `npm run build` → `npx wrangler pages dev --port 8788` →
  `curl localhost:8788/og/<uid>`（PNG）/ `/t/<uid>`（OGメタ）。

---

## 4. ハマりどころ（実際に踏んだもの）
- **ビルドに公開 env が必要**：`NEXT_PUBLIC_FIREBASE_*` が無いと静的プリレンダで
  `auth/invalid-api-key`。CI はダミー値、本番は実値（`.github/workflows/ci.yml` 参照）。
- **admin REST は quota project ヘッダ必須**：`x-goog-user-project: <project-id>` を付けないと 403。
- **エミュレータは JDK 21+**：`firebase-tools` の要件（CI も JDK21）。
- **zsh の `UID` は予約変数**：シェルスクリプトで代入しない（別名 `ADMIN` 等）。
- **gcloud 未導入だと API 有効化がコンソール作業**になる（`brew install --cask google-cloud-sdk`）。
- **対話ログイン（firebase/wrangler login）は非対話シェルで失敗**：各自のターミナルで実行。

---

## 5. 後続
- in-app ブラウザの外部ブラウザ導線、メールリンク認証、コピー調整。
- OGP の磨き込み（マスコット SVG、名前変更時の画像更新戦略）。
- git 連携デプロイ化、`meatup.love` 接続＋apex ルーティング（ハブ `deploy/`）。
