# 記事構成（事実のみ）— meatup 2026 チケット管理サイト / Claude Code

> 構成と素材の箇条書き。情緒・評価・文体は含めない（執筆時に付与）。
> 出典: 実装 `meatup/sites/2026`、本作業ログ。

## frontmatter（案）
- title: "イベント開催するのでチケット管理サイトを作った。Claude Codeだいすき"
- emoji: 🎫
- type: tech
- topics: nextjs / firebase / cloudflare / claudecode / 個人開発
- published: true

---

## 1. 背景
- イベント「meatup」2026夏を開催（2018・2019 に続く回・約6年ぶり）。
- 招待制で参加者を管理する必要：確定/未確定・事前決済の有無・連絡手段。
- 歴代回サイトは `meatup.love` のサブドメインで稼働中（2018 / 2019-summer）。今回は apex に 2026 を配置。

## 2. 作ったもの
- 招待制チケット管理サイト。公開: https://meatup.love
- 画面: `/invite`(サインイン) / `/register`(登録) / `/mypage`(ログイン後ホーム) / `/ticket`(チケット表示・共有) / `/admin`(管理)
- 機能: Google・メールリンク認証 / 招待リンク発行 / 承認フロー / 仮想チケット(QR・チケットNo.) / 個別チケットのOGP画像 / 参加費・連絡導線 / 会場紹介
- 管理(admin): 承認 / 招待発行 / 支払い管理 / 集計

## 3. 構成（スタック）
- Next.js 16 App Router / `output: 'export'`（完全静的）
- React 19 / TypeScript
- Tailwind v4（ゼロランタイム、`globals.css` の `@theme` がトークンの真実の源）
- Firebase: Auth(Google / メールリンク=パスワードレス) + Firestore（認可は `firestore.rules`）
- Cloudflare Pages（ホスティング） + Cloudflare Pages Functions（個別チケットOG画像をエッジ生成: `workers-og`/Satori、QRは `qrcode-generator`）
- `next/font/local`（見出しフォントを self-host）
- ハブ構成: `meatup.love` に 2018 / 2019-summer / 2026 を集約。`deploy/` にルーティング(routing.md)・接続ランブック(cloudflare-runbook.md)

## 4. Claude Code に任せた範囲（CLI完結）
- 任せた工程: 設計検討 / 実装 / デバッグ / セキュリティレビュー / SEO・OGP / デプロイ / ドキュメント
- 実際に叩いたコマンド:
  - 開発サーバ: `npm run dev`
  - 型チェック: `npx tsc --noEmit -p tsconfig.json`
  - Lint: `npm run lint`
  - 本番ビルド（静的書き出し）: `npm run build`
  - デプロイ(Cloudflare Pages): `npx wrangler pages deploy out --project-name meatup-2026 --branch main --commit-dirty=true`
  - Firestore ルール反映: `npx firebase deploy --only firestore:rules --project meatup-2026`
  - ルールテスト: `npm run test:rules`（= `firebase emulators:exec --only firestore "vitest run test/rules"`）
  - 画像最適化(macOS標準): `sips -Z 1500 -s format jpeg -s formatOptions 72 <入力> --out <出力>`
  - OGメタ確認(クローラー視点): `curl -A "Twitterbot/1.0" https://meatup.love/t/<id>`
  - git: `git checkout -b <branch>` / `git commit` / `git merge --ff-only <branch>` / `git push origin main`
- 複数サイト(歴代回)のデプロイ層も同様に: project 別の `wrangler pages deploy` / `firebase deploy --only firestore:rules` / `deploy/` のルーティング・ランブック整備
- CLI/API 外＝人間が実施: Cloudflare DNS 作成(zone:edit・ダッシュボード) / 課金(Blaze 化) / OAuth 同意画面 / 本番 Firestore の実データ操作

## 5. ハマったとこ（事実）
- メールリンク送信 上限: Spark(無料)=**5通/日**（`auth/quota-exceeded`）→ Blaze=25,000/日
- static export: `app/robots.ts` / `app/sitemap.ts` に `export const dynamic = 'force-static'` が必須（無いとビルド失敗）
- static export: `next/image` は `next.config` の `images: { unoptimized: true }`（最適化APIが無い→画像は事前縮小して `public/`）
- 認証: `onAuthStateChanged` の購読が初回コールバックのみ反映する実装 → 後発のサインイン(メールリンク完了)/ログアウト/アカウント切替がリロードまで反映されない（毎回反映に修正）
- OGキャッシュ: `/og/{uid}` を `immutable, max-age=31536000` でキャッシュ → 同一uidで再発行すると旧画像が残る。`og:image` を `/og/{uid}?v={ticketNo}`、共有URLを `/t/{uid}?t={ticketNo}` で版管理（エッジ＋スクレイパ両層を無効化）
- 共有テキストにURLを2つ入れる → X が先頭URL(トップ)をカード化し個別チケットOGが出ない → URLは1本に
- iOS Safari Web Share: `text` と `url` を併用すると `text` 優先で `url` が落ちる（共有シートのコピーでURL消失）→ URLを `text` に内包し単一フィールドで渡す
- SNSアプリ内ブラウザ: Google OAuth 拒否(`disallowed_useragent`)・メールリンクが別ブラウザに着地 → UA検出して外部ブラウザ案内（強制起動の確実手は無い）
- iOS Safari 動的ツールバー: `min-h-lvh` + in-flow の border で回避
- セキュリティ(Firestore rules): 招待トークンの使い切りをクライアントの transaction だけに依存 → SDKを介さない直接書き込みで1トークンから無制限に自己承認可 → ルールで `getAfter()` を使い「承認付き作成＝同一コミットで `invites/{token}.usedBy == 自分`」に束縛して封鎖
- 認可設計: PII(連絡先/性別/アレルギー)は世界公開の投影 `shares/{uid}` に出さず `attendees/{uid}`(本人/admin のみ)に分離
- Instagram ストーリー共有（詳細と出典は `docs/SHARE.md`）:
  - 公式 Sharing to Stories は**ネイティブ専用**（iOS=`UIPasteboard`＋`instagram-stories://` / Android=`ADD_TO_STORY` Intent）。Web公式SDKは無い。stickerImage指定はブラウザの権限モデル上不可
  - **URLの自動添付は公式不可**（API にリンクキー無し / リンクステッカーはアプリ内手動）→ **OGP画像内にQRを焼き込み**URLを担保
  - Web完結の手段は **Web Share API（`navigator.share({ files })`）**。iOSの癖2点: ①`share()` は transient activation 必須＝画像はタップ前に先読みして `File` 化（`await fetch` 後に呼ぶと `NotAllowedError`）②`text`+`url` 併用で `url` が落ちる
  - 画像ファイル共有だと X/LINE がカード化されない → **1入口→2択メニュー**で「リンクで共有(URL=カード)」と「画像で共有(ストーリー)」を出し分け
  - モバイルの共有UIは**ボトムシート**(親指ゾーン)・PCは**ポップオーバー**を `@media (pointer: coarse)` で出し分け（Apple HIG=アクションシート / Material=モーダルボトムシート / 親指ゾーンは下40%で精度96% vs 上部61%）

## 6. SEO / AI 向け対応（事実）
- `app/robots.ts`（全許可・AIクローラー含む / 認証ページ除外 / sitemap参照）
- `app/sitemap.ts`（公開トップのみ）
- トップに schema.org `Event` の JSON-LD（日時・会場・主催）
- `public/llms.txt`（最小・AIエージェント向け要約）
- 注記(2026時点): llms.txt は主要プロバイダ未対応で効果限定的 / 構造化データ(JSON-LD)が実効

## 7. 結果（事実）
- 一般公開済み（https://meatup.love）。本番＝`main`＝`origin` 一致。
- Firestore ルールテスト 15/15 パス。
- デプロイは手動 `wrangler`（git未連携）/ git は main 直運用（fast-forward マージ）。

## 8. 参考リンク
- デモ: https://meatup.love / 過去回: https://2018.meatup.love, https://2019-summer.meatup.love
- iOS Web Share の癖: https://adactio.com/journal/15972 , https://developer.apple.com/forums/thread/724641
- Firebase Auth 上限: https://firebase.google.com/docs/auth/limits
- llms.txt 現状: https://presenc.ai/research/state-of-llms-txt-2026
- Instagram ストーリー共有（出典まとめは `docs/SHARE.md §6`）:
  - Sharing to Stories(公式): https://developers.facebook.com/docs/instagram-platform/sharing-to-stories/
  - リンクステッカー全開放: https://about.instagram.com/blog/announcements/expanding-sharing-links-in-stories-to-everyone
  - Web Share API: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share , https://web.dev/web-share/
  - 代替(Snapchat Web SDK): https://developers.snap.com/snap-kit/creative-kit/web
- モバイルUX(メニュー vs ボトムシート / 親指ゾーン):
  - Apple HIG Action sheets: https://developer.apple.com/design/human-interface-guidelines/action-sheets
  - Material 3 Bottom sheets: https://m3.material.io/components/bottom-sheets/guidelines
  - Thumb Zone (Smashing): https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/
</content>
