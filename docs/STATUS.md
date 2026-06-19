# 現状と引き継ぎ（2026-06-19 時点）

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
  - **認証メール改善（2026-06-19）**：ロケール=ja（日本語化）／公開名「MEATUP2026 運営 🍖」（%APP_NAME%）／
    **カスタム送信ドメイン `meatup.love`**（差出人 `noreply@meatup.love`・SPF/DKIM を Cloudflare DNS に設定済み）。
    ハマりどころとコマンドはメモ `idtk-auth-config-via-gcloud`（公開名は Console 専用・`customDomainState` API は当てにならない）。
    **メールリンク本文は編集不可**（完全自由化はカスタムSMTP＋自前送信が必要）。
  - 管理者: `admins/rc9hmkk3M6dbpPfL8h6rhb9bi8h1`（オーナー本人）
- OG: デフォルト画像 `public/og.png`（`og:image`＝`https://meatup.love/og.png`）＋ 個別チケット OG 関数
  `functions/og/[id].js`・`t/[id].js`（`FIREBASE_PROJECT_ID=meatup-2026`）。デフォルト画像生成は `scripts/og/`。
  個別OGは `shares/{uid}`（`name`/`ticketNo`/`role`/`expectations`）を読んで動的描画（QR=`qrcode-generator`）。
  - **OGカード信頼性修正（2026-06-19）**：SNS（X/LINE）でカードが「出たり出なかったり」する不具合を修正。
    真因＝`og/[id]` の PNG 生成（Satori＋resvg）が **Cloudflare の CPU 制限を超過（`error 1102`）** し、
    かつ Pages Functions のレスポンスは既定で `cf-cache-status: DYNAMIC`＝**`Cache-Control` を付けてもエッジ未キャッシュ**
    だったため、クローラーが踏むたび毎回重い再生成が走り**約9割失敗**（成功した1回をキャッシュした端末だけ表示）。
    対策（プラン非依存・現アーキ維持）：①`og/[id]` で **`caches.default`** に成功PNGをキャッシュ（一度成功すれば
    その `?v=ticketNo` URLは以後ずっとヒット＝再生成ゼロ）。②**失敗時は `og.png` にフォールバック**して「カードは必ず出る」を担保
    （※`error 1102` は isolate 強制終了のため関数内 try/catch では捕捉不可。フォントfetch失敗等の捕捉可能な失敗のみ救済）。
    ③`box-shadow` の blur を 60→16px に縮小＋フォントのサブセットを `caches.default` にキャッシュして生成CPUを削減。
    ④**`t/[id]` で `waitUntil` バックグラウンド温め**（`/og` をリトライ付きで先に成功させ cache 投入。クローラーは `/t`→`/og`
    の順かつ同一コロを通るので初回ヒット率が上がる）。実測：実チケットURLは 9–10/10 で安定（修正前 1/10）。
    ⚠ 残課題＝**初回コールド時の `1102`（CPU超過）は構造的には残る**。完全な解消は「発行時に事前生成して静的配信(R2/Storage)」
    か **Workers Paid で `limits.cpu_ms` 引き上げ**（`limits` は Pages でも有効だが Standard 課金が前提）が必要。

## 実装状況（主な機能）
- スタイル: Tailwind v4。トークンは `globals.css` の `@theme`。
  **赤枠は `main` 自身の border（in-flow・position:fixed を使わない）**＝iOS Safari の動的ツールバー
  問題を回避（`min-h-lvh`＋cream背景）。`src/components/icons.tsx` にブランドアイコン（IG/Twitter/LINE）。
- トップ（2026-06-19 改）: **マルチセクション**（Hero → About → **Wanted** → Schedule/Content/Data（🚧準備中）→
  **How to Join**（番号ステップ）→ footer → **末尾に Hero recap**）。Hero は共通コンポーネント化（トップ=全画面/h1、
  末尾=コンパクト recap・**SPはフル/PCはマスコット〜日時を省きボタンのみ**＝`display:contents`＋`sm:hidden`）。
  - マスコット＝oniku（2018/2019共通 SVG、`public/oniku.svg`／`Oniku`）。Hero のは**タップで跳ねる**
    （`BounceOniku`＝animate.css、連打で激化・マウントで落下→jiggle）。
  - Wanted: DJ／スナック・バー／運営手伝い の募集（文言はオーナーが調整予定）。
  - 連絡先: 公開トップは Instagram / Twitter のみ（LINE は出さない＝イタズラ防止）。
- 認証画面（/invite）: Google ＋ メールリンクの2択。既登録者は「もう登録済み」→ /mypage へ誘導。
- 招待/登録: 運営発行＝自動確定 / 確定者発行（FR9・1人3枚）＝pending→運営確認。紹介元は自動追跡。
  （UI文言は **主催→運営／承認→確認** に統一・2026-06-19）。
  - 登録フォーム（2026-06-19 改）: 名前／**何が楽しみ？（複数 expectations・必須）**／**職業（6カテゴリ＋その他自由入力）**／
    **運営からの連絡手段（必須・LINE/Instagram/Twitter/Discord＋ID）**／**その他（任意・子連れ可能性/アレルギー＋自由入力）**。
    **性別はフォームで聞かず admin が付与**（公開Data集計用）。**招待に職業をプリフィル可**（`?job=`）。
    連絡先/子連れ/アレルギーは attendee のみ保存（**`shares` には出さない**＝private）。`JOBS` は `lib/profile.ts` で共有。
  - **既登録者の再登録は不可**（ルールが ticketNo 上書きを拒否）→ invite/register で先回りして /mypage へ。
- 画面構成: ログイン後の着地＝**`/mypage`（実務ホーム）**＝状態(承認)＋支払い(`事前決済：未`をソッと)＋
  日時/場所＋招待(approved・FR9 1人3枚)＋連絡(キャンセル/変更も集約)＋「**チケットを見る🎟**」CTA＋**最下部にログアウト**。
  登録/招待後の遷移は /mypage。
- **読み込みガード（2026-06-19）**：/mypage・/ticket は認証復元/Firestore初回読込が**沈黙ハング**しても
  **8秒タイムアウト→再試行(reload)UI**に切替（`use-auth`/`use-my-attendee`＋`RetryNotice`）＝永久スピナー解消。
  失敗時は Console に `[meatup] … TIMEOUT` を出す（**真因=auth/firestore の確定は再発時のログ待ち**）。
- **`/ticket`（券のリビール）**＝券(全面・登場アニメ `.ticket-reveal`／reduced-motion尊重)＋**右上のシェア
  アイコン**だけ。実務は持たない（"見せる/共有する"瞬間に集中）。
- 券面＝**OGと同一意匠**の横長パス（`src/components/ticket-card.tsx`／`functions/og/[id].js`）：GUEST／肩書き
  ／名前／日時・会場／半券(oniku＋**QR**＋No.)＋「楽しみ」選択の**透かし**(肉/麦/遊/繋)。状態は券外(/mypage)。
  設計判断は `DESIGN.md §0/§3/§3.5`。
- 参加費（通常5,000/事前4,500・記載のみ）と連絡(LINE主＋IG/Twitter)は /mypage に。事前決済は**オンデマンド**
  （PayPay リンクは失効するため静的に貼らない＝「連絡くれたら都度送る」）。確定者は招待発行枠。
- admin: 承認、招待発行（**職業プリフィル付き**）、**支払い管理（✓払った トグル＋支払い済みカウント）**、
  **性別の付与（未設定/男/女/その他）＋性別タリー**、連絡先・子連れ・アレルギーの表示、
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

## 2026-06-19 後半（公開対応）の追加変更
- **一般公開済み**。本番＝`main`＝`origin`（手動 `wrangler` デプロイ継続）。
- マイページ: ヘッダー刷新（ブランドワードマーク見出し／氏名／メール／状態は枠pillをやめ**ドット+ラベル**／余白は gap の入れ子で階層化）。CTAボタン幅をトップと同じ **320px** に統一。
- 連絡手段フロー: 登録フォームに「**運営のLINEをこの場で追加**」ラジオ（選ぶと連絡先入力をパス）→ 送信後の**完了画面**でLINE追加リンク＋SNSフォールバック案内。/mypage ヘッダーに「連絡先：◯◯ ✏️」表示→ **新ルート `/mypage/contact`**（`contact-editor.tsx`＝自己更新 `updateMyContact`、`ContactSection` 併設）。自由入力に `maxLength`（名前16/職業16/連絡先50/アレルギー100）。
- /invite: 別アカウント切替、送信エラーを **FirebaseError コード別**文言（`auth/quota-exceeded` 等）、認証前でも IG/X で連絡できるフォールバック、「← トップへ」。`/register` にも「← トップへ」。
- **認証バグ修正**: `use-auth` の `onAuthStateChanged` が**初回コールバックしか反映しない**不具合（メールリンク完了/ログアウト/アカウント切替がリロードまで反映されなかった）を、毎コールバック反映に修正。
- **セキュリティ①（本番ルール反映済み・テスト15/15）**: 承認付き自己作成を `getAfter` で**「同一コミットで invites/{token}.usedBy==自分」に束縛**。1本の管理者トークンから無制限に自己承認アカウントを量産できる穴を封鎖（直接 setDoc 攻撃・同時実行レースとも封じる）。
- トップ: **会場（Venue）セクション**追加（`public/venue/*`・`next/image` を `images.unoptimized` で使用）。参加費の見せ方（事前28px/当日20px・下揃え）。最下段 recap は **SP でロゴ＋ボタンのみ**（あおり＋日時は省略・ロゴ縮小）。
- **読み込み 🍖💨 アニメ**（`load-state.tsx` の `Loading`/`MeatRunner`、`globals.css` の `.meat-run`/`.meat-puff`＝配達バイク風）。**カスタム404**（`not-found.tsx`・🍖💦 `.meat-panic`）。いずれも reduced-motion 対応。
- **SEO/AI**: `app/robots.ts`（全許可＝AIクローラー含む・認証ページ除外、`dynamic='force-static'`）、`app/sitemap.ts`、トップに **schema.org Event の JSON-LD**、`public/llms.txt`。※llms.txt は2026時点で効果限定的＝**構造化データが本命**。
- **OGP 共有**: チケット共有テキスト＝「Meatup2026に参加します🍖 #meatup2026」、リンクは個別チケット一本。**キャッシュ無効化を2層**＝`og:image` を `/og/{uid}?v={ticketNo}`、共有URLを `/t/{uid}?t={ticketNo}`（チケット再発行でエッジ＆Xカード両方を確実に更新）。※既投稿のXカードは再取得まで古いまま＝削除して貼り直しで解消。

## 残タスク
- [ ] **PayPay 本人確認(KYC)**：2026/6/17 から受け取りに必須。事前集金するなら要対応（オーナー）。
- [ ] **Wanted の文言**・各セクション中身（Schedule/Content/Data は現在 🚧準備中の placeholder）。
- [ ] **実機の通し確認**（要サインイン）：招待発行(/admin)→サインイン（メール含む）→登録→**/mypage**→「チケットを見る🎟」→**/ticket**（共有でOGP）→/admin で承認・✓払った→/mypage で「確定」化確認。
- [ ] （任意）**セキュリティ②**：attendees 自己 update のフィールドをホワイトリスト化（現状 status/ticketNo のみ固定＝本人が `paid`/`gender`/任意フィールドを書ける）。admin はオーナー専用のため**運用で許容中**。締めるなら `diff().affectedKeys().hasOnly([...])`。
- [ ] （任意）Cloudflare **git 連携**で自動デプロイ化（Pages に env 設定）／ `www.meatup.love`→apex リダイレクト。
- [ ] （任意）**認証メール本文の完全自由化**＝カスタムSMTP＋自前送信（`generateSignInWithEmailLink`/`sendOobCode` returnOobLink・Worker＋ESP＋サービスアカウント）。
- [ ] **永久スピナーの真因確定**：再発時に Console の `[meatup] … TIMEOUT`（auth/firestore）を確認。※後述の auth 修正で「後発サインインが未反映」は解消済み。WebChannel ストールは別問題。

### 完了（2026-06-19・公開対応セッション）
- [x] **一般公開**（https://meatup.love）。本番＝`main`＝`origin` 一致。
- [x] **メール Blaze 化**（メールリンク送信 5通/日 → 25,000/日。予算アラート併設）。
- [x] **/invite のアカウント切替**（旧「ログアウト」タスク）。
- [x] **開発データのクリーンアップ**（attendees/invites/shares 全削除・`admins` 保全）。
- [x] **記事化の素材整理**（Zenn 用・`synsk.me/docs/research/` の文体分析を参照）※執筆は別途。

## ドキュメント
- `docs/SPEC.md` 仕様 / `DESIGN.md` 意匠・OGP（出典付き） / `PRINCIPLES.md` 内部品質原則 / `DEPLOY.md` 手順
