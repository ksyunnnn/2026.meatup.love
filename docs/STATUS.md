# 現状と引き継ぎ（2026-07-02 更新）

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
    追跡 → https://github.com/ksyunnnn/2026.meatup.love/issues/10

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
- admin: 承認、招待発行（**職業プリフィル付き**）、**支払い管理（チェックボックス「支払い済み」＋支払い済みカウント）**、
  **性別の付与（未設定/男/女/その他）＋性別タリー**、連絡先・子連れ・アレルギーの表示、
  「楽しみ」集計＋その他職業の自由入力表示。**確認待ち・参加者一覧は共通カード（情報量同一・下半のみ段階で出し分け）で
  新しい順**。日時（確認待ち=登録日時／一覧=確定日時）。**キャンセル受付**（別セクション・集計除外・参加に戻す）。
  **招待リンク管理**（未使用=取り消す＝削除で失効／使用済み=アーカイブ）。**手動登録**（後述）。
  **参加者編集**＝カード右上 ✏️ → **画面遷移 `/admin/edit?id=`**（admin専用・Suspense＋クエリ方式）。入力欄は追加フォームと
  共通の `AttendeeFields`（`EXPECTATIONS`/`CONTACT_METHODS` は `profile.ts` に集約）。`status`/`ticketNo` は触らず
  （承認/キャンセルが status を、`shares` 整合のため番号を固定）、空にした任意項目は `deleteField` で消去、`paidAt` は支払いON化時のみ更新。
  **本人統合**（後述）。

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

## 2026-06-21（招待登録バグ修正）
- **招待リンク経由の登録が必ず失敗していた不具合を修正**（本番ルール＋フロント両方デプロイ済み）。
  - 症状: 招待された人が `/register` で「参加する」を押すと毎回フォールバック文言で失敗。飛び込み登録は成功＝「**招待時だけ失敗**」。
  - 真因: `createAttendee` のトランザクションが `admins/{issuedBy}` を**クライアント読取**して自動承認可否を判定していたが、`admins` 読取ルールが「自分のdocか管理者のみ」で、招待された非管理者が**発行者(オーナー)の admin doc を読めず `PERMISSION_DENIED`** → tx ごと throw。
    - ルール側 `adminInvite()` の `get()` は特権評価で通る一方、クライアントの `tx.get` は読取ルールに従う＝**評価経路の非対称**。旧ルールテストは `writeBatch`（読取なし）で素通りし見逃していた。
  - 修正: `firestore.rules` の `admins` を **`allow get: if isSignedIn()` / `allow list: if isAdmin()`** に分割（単体読取のみ開放・列挙は管理者限定）。本番と同じ「admins読取つきトランザクション」の**回帰テストを追加**（rules **18/18**）。
  - 併せて `register-client` の catch-all を **FirebaseError コード別**に分岐（`permission-denied`＝招待リンク／`unavailable`＝通信／`aborted`＝競合…）。失敗時は Console に `[meatup] register failed <code>` を出す。
  - ⚠ **未検証**: いしまる本人での再登録の通し（要サインインのため手元で再現不可）。本人が時間をおいて再試行で確定。失敗時は新しい文言（どのコード分岐か）を回収。

## 2026-06-22（登録完了画面にチケット＋共有を追加）
- **参加登録の直後に完了画面**を出し、その場で**チケット（`/ticket` と同じ `TicketCard`＋登場アニメ）＋共有ボタン**を表示。狙い＝“登録できた瞬間”に SNS へ「参加します！」を OGP 付きで投稿してもらう。
  - **両パス共通**：SNS連絡手段の登録も完了画面を経由（従来は `/mypage` 直行）。**承認待ち(pending)でも表示**（既存 `/ticket` が status で出し分けないのに揃える＝オーナー判断）。
  - **LINEパスは「LINE追加」を最上部**（連絡手段の確保が最優先）→ その下に祝福＋チケット＋共有。
  - **共有文言にトップと同じ掛け声を先頭付与**（「オレ、ニク、クウ🦍」等・2文言からランダム）。掛け声は **`src/lib/share.ts` に集約**し、トップ `TweetChip` と共有が同一ソースを参照（**トップに足せば全箇所反映**）。
  - 共有ロジックは **`src/lib/use-ticket-share.ts` に共通化**（`/ticket` と完了画面で同一・文言ズレなし。setTimeout 未クリアも解消）。`createAttendee` が `{ ticketNo, status }` を返し**再フェッチ無しで即描画**。
  - 完了画面コピーはオーナー調整済み（「登録多謝〜🎉／ええ感じやない？？SNSで共有してくれたら…」）。**残メモ**：pending の人にも祝福が出る件は現状維持で確定。⚠ 認証越し画面のため**新規登録での実機通し確認は未**。

## 2026-06-22（コード/DB/ドメイン レビュー対応）
全系統をレビュー（DB整合性＝問題なし／コードレビュー2系統／ドメイン実測）し、判明分を修正・本番反映・push 済み。
- **セキュリティ強化（ルール・本番反映・テスト 20/20）**
  - **C1**：attendees 自己update を `affectedKeys().hasOnly([profile/contact 9フィールド])` のホワイトリストへ。本人が `paid`/`gender`/`approvedBy` 等を直接書ける穴を封鎖（＝旧「セキュリティ②」完了）。
  - **C2**：`shares` 作成時 `ticketNo` を `getAfter` で attendees 実体と一致必須に（公開券番号の偽装防止）。
  - **L3**：`validInvite` を `'usedBy' in data` 形式へ統一（consume 側と一致）。
- **OG関数の堅牢化**：`og/[id]` の `cache.match` を try/catch 内へ（キャッシュ例外で500を返さず必ずカード）。`t/[id]` の warm ループを `x-og:render` マーカー判定へ（フォールバックと本生成を確実に区別・body消費で接続解放）。`og/[id]` 本生成に `x-og:render` ヘッダ付与。
- **www.meatup.love → apex 301**：www を `meatup-2026` Pages のカスタムドメインに追加＋ `functions/_middleware.js` でホスト判定301（パス/クエリ保持）。**稼働確認済**。CNAME（`www`→`meatup-2026.pages.dev`・Proxied）は wrangler OAuth に DNS 編集権限が無くダッシュボードで作成。
- **AIクローラー方針＝現状維持で確定**：Cloudflare「AIボットをブロック」は **ON のまま**。これがブロックするのは**学習用クローラー（GPTBot/ClaudeBot/CCBot/Google-Extended 等）だけ**で、**回答での紹介に効くクローラー（OAI-SearchBot/ChatGPT-User/Claude-User/Claude-SearchBot/PerplexityBot）は許可**＝ChatGPT・Claude・Perplexity の回答で紹介される状態は成立。学習はブロックのまま、が方針。※Geminiに出したくなった時だけ Google-Extended 解放（＝AIブロックOFF）が必要。robots.ts の「全許可」コメントは実態（学習のみブロック）と差があるが**意図的**＝触らない。

## 2026-06-23（参加者の編集画面＋本人統合＋削除・本番反映済み）
commit `8044bc7`（編集/統合・ルール変更なし）＋後続コミット（**削除＝ルール変更あり**）。Pages デプロイ済み（`/admin/edit` 200 確認）。
- **参加者の完全削除**：編集画面 `/admin/edit` 下部に「この参加者を削除」（赤・確認ダイアログ・キャンセル受付＝可逆 とは別の不可逆操作）。`deleteAttendee(id)` が `attendees/{id}` と `shares/{id}` を `writeBatch` で同時削除（削除した人の公開OGカードを残さない／手動レコードは shares 無しでも no-op で安全）。
  - **ルール変更（本番反映済み・rules 22/22）**：`shares` に `allow delete: if isAdmin();` を追加（公開済み＝非機微データへの admin限定 delete）。回帰テスト＝admin削除OK／所有者・他人は拒否。
  - **削除の安全策**（後続コミット `1b0c880`/`ebc7362`・ルール変更なし）：①自己登録者（`addedByAdmin` でない）の削除は**二段確認**（別人のアカウント連携・チケットを消す旨）。手動レコードは1回確認。②削除ボタン上＋確認ダイアログに**登録経路（誰が追加したか）**を表示＝運営が手動追加／飛び込み（本人登録）／運営 or ◯◯さんの招待リンクから本人登録（`invites.ts` に `getInvite` 追加し発行者名を解決）。
- **参加者編集画面 `/admin/edit?id=`**：一覧カード右上の ✏️ から画面遷移（`/mypage/contact` と同じ「1画面1タスク」パターン）。admin専用ガード＋Suspense＋クエリ方式（静的書き出し対応）。保存後 `/admin` へ戻る。`status`/`ticketNo` は不変、空にした任意項目は `deleteField`、`paidAt` は支払いON化時のみ更新。
- **入力欄の共通化**：`src/components/attendee-fields.tsx`（`AttendeeFields`）を新設し、**「参加者を追加」フォームと編集画面で共有**（UIドリフト防止）。`EXPECTATIONS`/`CONTACT_METHODS` を `src/lib/profile.ts` に集約（真実の源を一本化）。
- **本人統合（手動 → 実アカウント）**：手動レコード(`addedByAdmin`)のカードにだけ「本人と統合」。モーダルで**統合先（自己登録アカウント）を選び、項目ごとに本人/手動の値を選択** → 本人レコードへ反映＋手動レコード削除を `writeBatch` で原子的に。生存させるのは**本人側**（uid所有・`shares` あり・/mypage が動く）。`ticketNo` は本人のものを維持。
  - 障害は「マッチング」ではなく**本人の初回ログイン**だけ（uid は本人サインインで初めて生成＝Auth仕様）。メールだけからアカウントは作れない。
  - ⚠ **公開チケット(OG)整合**：admin は他人の `shares/{uid}` を書けないため、名前/職業/楽しみを手動側に上書きしても公開カードには反映されない（編集画面・統合ダイアログで注記）。手動レコードは元々 `shares` 無しなので無関係。
- lib 追加：`getAttendee` / `updateAttendeeProfile(id, input, {touchPaidAt})` / `mergeManualIntoAccount(survivorUid, placeholderId, fields)`（いずれも `attendees.ts`）。
- 未着手：**claim URL による自動紐付け**（手動登録→専用URL→ログインで自動統合）。最小案＝admin invite 流用＋invite に `claimFor` 1フィールド（番号再採番・gender/paid は非転記の割り切り）。完全引き継ぎは特権サーバが必要。

## 2026-06-22（管理画面の改善・2コミット本番反映済み）
管理画面を一通り改善。commit `dbfd7f1`（UI系・ルール変更なし）と `2aa2139`（手動登録・**ルール変更あり**）の2本。
- **並べ替え＝新しい順**（確認待ち・参加者一覧とも `createdAt` 降順）。日時表示：確認待ち=登録日時、参加者一覧=確定日時（`approvedAt`／pendingは「未確定」）。
- **共通カード `AttendeeCard` 抽出**：確認待ち・参加者一覧で**上半の情報ブロックを完全同一**化（名前・職業・No.・紹介元・楽しみ・連絡先・子連れ・アレルギー）。下半のみ段階で出し分け（確認待ち=確認ボタン／一覧=性別・支払い・キャンセル）。デザイン軸6「状態で出し分け」。
- **支払いUI**：状態がラベルになって誤解を招く `未払い/✓払った` トグルを廃止 → **固定ラベル「支払い済み」のチェックボックス**。
- **キャンセル受付**：新ステータス `cancelled` を追加（`AttendeeStatus` に追加・`STATUS_LABEL` 廃止）。`cancelledAt`/`cancelledFrom` を保持。一覧では**控えめなテキストリンク＋確認ダイアログ**で記録、**別セクション「キャンセル(n)」折りたたみに集約・集計（人数/支払い/楽しみ/性別）から除外**、「参加に戻す」で `cancelledFrom` へ復帰。
- **招待リンク管理**：未使用は「取り消す」＝`deleteDoc`（**削除が失効も兼ねる**＝`validInvite` の `exists()` で弾かれる・確認付き）。使用済みは `archivedAt` を付けて一覧から隠す（**doc保全で紹介元表示を維持**）＋「アーカイブ済み」折りたたみ＋「戻す」。型 `Invite.archivedAt?`。
- **手動登録（直接連絡をくれた人を運営が登録）**：`addAttendeeByAdmin()` が**合成ID `manual_<32hex>`**（Auth uid と衝突しない）で `status:'approved'`＋`createdAt/approvedAt/approvedBy`＋`ticketNo` を付与。**`shares` は作らない**（オフライン前提・公開OGの用途なし、公開面とルール緩和を回避）。型 `Attendee.addedByAdmin?`。一覧の紹介元は「運営が追加」。アカウントは無し（/mypage・対話チケットは持たない）。後でログイン紐付け＝**2026-06-23 に「本人統合」で実装**（後述）。
  - **ルール変更（本番反映済み・テスト 21/21）**：`attendees` に `allow create: if isAdmin();` を追加（運営が名簿エントリを作成可）。`shares` は無変更。回帰テスト＝admin作成OK／非adminの他人ID作成は拒否。
- ⚠ **「支払いUI」より上のメール表示案は撤回済み**（owner判断）：admin に email を出す案を一度実装→全撤回。`Attendee` に email フィールドは持たない（`authName` は登録時 `user.email ?? displayName ?? uid`＝実データ上は全員メール、だが admin では非表示が確定）。
- ⚠ **共有リンクの設計（再確認メモ）**：`/t/{uid}` はクローラー向けOGメタ専用で**人間は全員 `/ticket/`（固定）へリダイレクト**。`/ticket` は常にログイン中の自分の券（URLのuidは見ない）。他人の対話チケットは出ない＝公開面は `shares` の非機微カード画像のみ。これは**ルール上の制約ではなくIAの選択**（`shares` は `read: if true` なので、やろうと思えばルール変更なしで公開券ページ化も可能）。根拠＝NFR8（他人情報は管理者のみ）＋shares/attendees の二層分離。

## 2026-06-25〜26（ビールジョッキ刷新・ストーリー画像共有・本番反映済み）
- **ビールジョッキ刷新**（commit `3dd25dc`・2026-06-25）：シズル線画 Canvas を採用（`beer-mug.tsx`）。3日前100%・当日120%（縁からあふれ）＋お肉 jiggle。泡アニメは不採用＝全静止。実物参照で作成。詳細メモ [[meatup-2026-beer-mug-handoff]]。
- **Instagram ストーリー画像共有**（commit `89db4ce`→`e583138`→`417ce55`・2026-06-26）：チケットを画像でストーリー共有（リンク/画像の2択メニュー）。9:16（1080×1920）の縦長を渡す。合成は**エッジ→クライアント Canvas に移動**して `error 1102`（CPU超過）を回避。

## 2026-07-02（トップに Meat Mates 追加・Wanted/Content 廃止・apex反映＋push）
- **Meat Mates セクション新設**（`src/components/friends-section.tsx`）＝当日の賑やかし仲間を顔写真で紹介。**Data と Venue の間**。
  - レイアウト＝丸ポートレート2列（本体はPCでも細い1カラム基調なので2列固定・行は自然整列）。写真右下に **4本柱テーマバッジ**（🍖肉 / 🍺酒 / 🎧音楽 / 🤝交流＝`THEME` が真実の源。各人 `theme` で分類）。
  - カード情報設計（HIG/IA）：**写真→名前→@ID を近接**（アイデンティティ）、紹介文は下に分離。IGアイコンは冗長なので廃止し `@` 表記のみ。
  - 末尾に「+ / and You 👻」の空席カード（**How to Join へ誘導**＝`#join`）。増員は `FRIENDS` に1件足すだけ（`name/insta/photo` が揃った人だけ表示）。
  - 初期メンバー：**Reed**（DJ from 高円寺／`bbqsauceandspice`）・**Naoki Kimura**（料理するひと／`kmnaoki_1118`）・**KOHEi**（ワインと野菜にやさしい／`winetokotoba`）。顔写真は `public/friends/*.jpg`（600×600・IG等から取得しローカル保存＝CDN直リンクは失効/ホットリンク不可のため）。
- **Content 廃止**（役割を Meat Mates に譲渡）／**Wanted 廃止**（`WANTED` 定数・セクションとも削除。連絡導線は footer に残存）。
- 検証用ルート `src/app/friends-preview/` は撤去済み。※プレビュー用 Pages ブランチ `friends-preview` は残置（無害・未リンク）。

## 残タスク
- [ ] **Schedule の中身**（当日タイムテーブル。現在 🚧準備中の placeholder）。

### クローズ済み（2026-07-01・運用判断＝いずれも問題化せずクローズ）
以下は未完 or 任意だが、**実運用で問題になっていない**ためオープン扱いをやめる（履歴として残す）。再燃したら復活。
- [x] **実機の通し確認**（招待発行→サインイン→登録→/mypage→/ticket→承認→確定）… 本番稼働中で問題報告なし＝クローズ。
- [x] **OG 初回コールドの `error 1102`（CPU超過）**… 構造課題として残るが実測 9–10/10 で安定・実害なし＝クローズ（追跡は issue #10 のまま）。
- [x] **ログインセッションが数時間で切れる件**… 再発の訴えなし＝クローズ（[[meatup-2026-login-session-investigation]] は証拠取り手順として保全）。
- [x] **永久スピナーの真因確定**… auth 修正で「後発サインイン未反映」は解消済み・以後の再発報告なし＝クローズ。
- [x] **PayPay 本人確認(KYC)**… 事前集金の運用判断次第（オーナー領域）。現状ブロッカーでないためクローズ。
- [x] **（任意）Cloudflare git 連携で自動デプロイ**… 手動 `wrangler` で運用継続で支障なし＝クローズ。
- [x] **（任意）認証メール本文の完全自由化**… 現状の日本語化＋カスタム送信ドメインで十分＝クローズ。
- [x] ~~（任意）**セキュリティ②**：attendees 自己 update のホワイトリスト化~~ → **2026-06-22 完了（C1）**。

### 完了（2026-06-19・公開対応セッション）
- [x] **一般公開**（https://meatup.love）。本番＝`main`＝`origin` 一致。
- [x] **メール Blaze 化**（メールリンク送信 5通/日 → 25,000/日。予算アラート併設）。
- [x] **/invite のアカウント切替**（旧「ログアウト」タスク）。
- [x] **開発データのクリーンアップ**（attendees/invites/shares 全削除・`admins` 保全）。
- [x] **記事化の素材整理**（Zenn 用・`synsk.me/docs/research/` の文体分析を参照）※執筆は別途。

## ドキュメント
- `docs/SPEC.md` 仕様 / `DESIGN.md` 意匠・OGP（出典付き） / `PRINCIPLES.md` 内部品質原則 / `DEPLOY.md` 手順
