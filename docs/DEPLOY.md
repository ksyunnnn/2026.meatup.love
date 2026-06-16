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
   - `functions/`（OGP 共有/画像）は自動でデプロイされ、Cloudflare が `_routes.json` を
     自動生成（`/t/*`・`/og/*` のみ関数、他は無料の静的配信）。
   - 環境変数
     - **ビルド時に必要**（`NEXT_PUBLIC_*` はビルドで埋め込まれる）
       - `NEXT_PUBLIC_FIREBASE_*`（6種・本番値）
       - `NEXT_PUBLIC_USE_EMULATOR=false`
     - **関数の実行時に必要**（OGP がデータ取得に使う）
       - `FIREBASE_PROJECT_ID`（本番プロジェクト ID）

## C. 動作確認（スモークテスト）

1. `/admin` で招待リンク発行 → リンクを開く → Google でサインイン → 登録 → `/ticket` が「確定」。
2. 招待なしで `/register`（飛び込み）→ `pending` → `/admin` で「確認しました！」→ `/ticket` 確定。
3. 同じ招待リンクを2人目で開く → 単回使用で `pending` に落ちる。
4. チケットの「シェア」→ `/t/{uid}` のプレビュー（Facebook/X のカードデバッガで検証）。
   `/og/{uid}` が名前入り 1200×630 PNG を返すこと。

### OGP のローカル確認（任意・参考）
- `.dev.vars`（gitignore 済）に `FIREBASE_PROJECT_ID=demo-meatup` と
  `FIRESTORE_BASE_URL=http://127.0.0.1:8080` を置く。
- エミュレータ起動 → `npm run build` → `npx wrangler pages dev --port 8788`。
- `curl localhost:8788/og/<uid>` で PNG、`/t/<uid>` で OG メタを確認。

## D. 後続（初回確認の後）

- in-app ブラウザの外部ブラウザ導線、メールリンク認証、コピー調整。
- OGP の磨き込み（マスコット SVG、レイアウト調整、名前変更時の画像更新戦略）。
