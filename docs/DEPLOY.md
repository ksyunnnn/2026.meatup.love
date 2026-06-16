# デプロイ手順（meatup 2026）

> 進行中。初回は「動作確認できる本番」を最小手数で立てるのが目的。
> apex（`meatup.love`）への振り分けはハブの `deploy/` 層の責務で、本書の範囲外。

## 方針（決定済み）

- **ホスティング＝Cloudflare Pages**（静的サイト）。**Firebase は Auth/Firestore 専用**。
- Next は `output:'export'`（純静的）。`out/` を配信。
- **個別チケット OGP は共有ルートのみ Cloudflare Pages Function** で動的生成（初回デプロイ後に実装）。

## A. あなたのコンソール作業（先に必要・コードからは不可）

1. **Firebase プロジェクト作成**（Spark/無料のまま）。プロジェクト ID を控える。
2. **Web アプリ登録** → 設定キー6種（apiKey 等）を控える。
3. **Authentication 有効化**
   - Google：そのまま有効化（OAuth 同意画面の最低限設定）。
   - GitHub：GitHub 側で OAuth App 作成 → Client ID/Secret を Firebase に登録。
     Authorization callback URL は Firebase が示す `https://<project>.firebaseapp.com/__/auth/handler`。
4. **Firestore 作成**（本番モード＝ルールで制御）。ロケーション選択。
5. **認可ドメイン**（Auth > Settings > Authorized domains）に本番ドメイン
   （Cloudflare の `*.pages.dev` および将来の `meatup.love`）を追加。
6. **最初の管理者**：Firestore に `admins/{あなたのuid}` を手動作成（中身は空でよい）。
   uid は一度サインインして Auth > Users で確認。これが無いと `/admin` に入れない。

## B. コード／CLI 側（こちらで用意・実行）

1. `.firebaserc` の `default` を本番プロジェクト ID に差し替え。
2. ルールをデプロイ：`npx firebase deploy --only firestore:rules`。
3. ビルド確認：`npm run build` → `out/` が生成される。
4. **Cloudflare Pages プロジェクト**（git 連携）
   - Build command: `npm run build`
   - Output directory: `out`
   - 環境変数（**ビルド時に必要**：`NEXT_PUBLIC_*` はビルドで埋め込まれる）
     - `NEXT_PUBLIC_FIREBASE_*`（6種・本番値）
     - `NEXT_PUBLIC_USE_EMULATOR=false`

## C. 動作確認（スモークテスト）

1. `/admin` で招待リンク発行 → リンクを開く → Google でサインイン → 登録 → `/ticket` が「確定」。
2. 招待なしで `/register`（飛び込み）→ `pending` → `/admin` で「確認しました！」→ `/ticket` 確定。
3. 同じ招待リンクを2人目で開く → 単回使用で `pending` に落ちる。

## D. 後続（初回確認の後）

- **個別チケット OGP**（必須・SPEC 後回し節参照）：共有ルートを Pages Function 化、`shares/{id}` 投影 or 署名 URL、Satori で画像生成。
- in-app ブラウザの外部ブラウザ導線、メールリンク認証、デザイン／コピー。
