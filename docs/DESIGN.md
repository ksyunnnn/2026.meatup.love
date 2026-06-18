# デザイン & OGP 設計メモ（判断の経緯）

> 進行中。スタイルは全棄却の可能性ありとのことなので、判断根拠を残す。
> すべて `style-and-ogp` ブランチで作業。気に入らなければブランチごと破棄可。

## 0. デザイン判断の軸（迷ったらここ・出典付き）

UI/IA の判断はこの軸で決める（根拠が無いとブレるので固定）。基準は **Apple HIG**（iOS基準だが
原則として転用）＋ Web固有は **WCAG** 併用。**効く判断ほど、その場でHIG該当節を実取得して裏取り**する
（HIGは更新が速く、記憶の逐語は当てにしない）。

1. **重要度＝目立ち**。強調するのは最重要の1操作。塗り/色ボタンは1画面に1〜2個まで。
   > HIG Buttons: "use a button that has a prominent visual style for the most likely action… Keep the number of prominent buttons to one or two per view."
2. **正直なアフォーダンス**。見た目＝実際の挙動。やらないことをやるように見せない。別アプリ/別画面へ
   行くなら示す（例：連絡へ遷移するボタンを"即キャンセル"に見せない）。
   > HIG: "Ensure that each button clearly communicates its purpose." / macOS: 末尾の…は別画面/アプリを開く合図。
3. **破壊的操作は赤（Destructive）＋確認、主役にしない**。データを壊す時だけ赤。Primaryにしない。
   > HIG Buttons: "Destructive… can result in data destruction"（system red）/ "Don't assign the primary role to a button that performs a destructive action."
   - 本アプリのキャンセルは「主催者に連絡」＝破壊的でない → **赤でも単独ボタンでもなく、連絡導線に集約**。
4. **ラベルは具体的な動詞・予測可能に**。単独の「キャンセル」は避ける（HIGでは Cancel＝"現在の操作の
   取消" の意味で衝突する）。「参加をキャンセル」等、何が起きるか分かる語に。
   > HIG Buttons: "Cancel. The button cancels the current action." / Writing: 動詞始まりで具体的に。
5. **意味でグループ化し、見出し＝中身を一致させる**。1つの箱（カード/画面）に複数の役割を混ぜない。
   1画面が2役を兼ねるなら、セクションで明示的に分ける（例：/ticket＝券＋会員ホーム → 「参加情報」で区切る）。
6. **状態で出し分け**。pending/approved 等で「最重要＝最も目立つ」が変わる前提で強弱・露出を変える。
7. **アクセシビリティ（Web）**：タップ領域 ≥44pt、フォーカス可視、コントラスト（WCAG AA）。

## 1. 過去サイトから抽出した「meatup の共通アイデンティティ」

`sites/2018`（CRA）と `sites/2019-summer`（Gatsby）を実コード調査して共通項を抽出。

| 要素 | 2018 | 2019 summer | → 2026 で採用 |
|---|---|---|---|
| 主役色 | oniku 赤 `#B33D44` ＋ grill 橙 `#DC7C34` | flame 橙 `#FF6500` | 暖色（赤を主・橙をアクセント） |
| 背景/文字 | 白背景・濃文字・**赤い太枠** | 白/淡灰・**4px ダーク枠＋ダイヤ角** | 白/クリーム・太枠のポスター感 |
| 見出し書体 | Lato 700（display 的） | **Righteous**（display）＋Montserrat | Righteous（共通点・自己ホスト） |
| マスコット | oniku（湯気つき肉）SVG | oniku（橙の肉玉）PNG | 🍖 絵文字（軽量・将来 SVG 化可） |
| 年号 | "2018" | **白抜き×橙の年号バッジ** | 年号バッジ（白×赤・回転） |
| ボタン | 赤い円形 FAB | 角丸 24px ピル | 角丸ピル（暖色・太枠） |
| トーン | 砕けた日本語＋絵文字（🍖🍻） | 砕けた（「はよ参加登録させてくれ」） | 砕けた＋絵文字 |

出典＝両リポジトリの実ファイル（`2018/src/variables/colors.jsx`、`2019-summer/src/helpers/State.js`、各 styled/css）。

## 2. 実装方式の決定（出典付き・推測でなく公式/一次情報ベース）

### スタイリング = CSS Modules ＋ globals トークン（CSS-in-JS 不使用）
- Next 公式：Server Components を装飾するなら「CSS ファイルを出力する CSS Modules 等」を推奨。
  ランタイム CSS-in-JS は style registry が必要で `'use client'` を強制し依存が増える。
  → 静的書き出し＋最小依存（NFR3）に最適。
  出典: https://nextjs.org/docs/app/getting-started/css , https://nextjs.org/docs/app/guides/css-in-js

### 見出しフォント = Righteous を `next/font/local` で自己ホスト
- `next/font` はビルド時にダウンロードして静的アセットとして自己ホスト（CLS ゼロ、ブラウザは
  Google に接続しない）。`output:'export'` の非対応機能一覧にフォント最適化は無い＝静的でも動く。
- `local` を選んだ理由：ビルド時ネットワーク依存すら排除（数年後の再ビルド耐性＝NFR3）。
  latin サブセット（`src/app/fonts/righteous-latin.woff2`、12KB）のみ同梱。
  出典: https://nextjs.org/docs/app/api-reference/components/font , https://nextjs.org/docs/app/guides/static-exports

### 本文 = 日本語システムフォントスタック（CJK Web フォントを配らない）
- CJK Web フォントは数 MB と重く、モバイル/アプリ内ブラウザでは離脱リスク。英字 display のみ
  Web フォント、日本語は OS 標準、が定石。
  `"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic","Meiryo","Noto Sans JP",system-ui,sans-serif`
  （`system-ui` 単体は日本語で誤フォント選択しうるため明示指定）。
  出典: https://bloomstreet.jp/en/best-japanese-font-setting-for-websites , https://zenn.dev/neos21/articles/0b7de5d05fe7ea

### モバイル / アプリ内ブラウザ対策
- **`100dvh`/`100svh`**：`100vh` はアドレスバー表示時にはみ出す。ヒーローは `svh`、本文は `dvh`。
  2025-06 に Baseline Widely Available。出典: https://web.dev/blog/viewport-units , https://developer.mozilla.org/en-US/docs/Web/CSS/length
- **viewport は `viewport` export**（手書き `<meta>` 禁止）＋ `viewportFit:'cover'` で
  `env(safe-area-inset-*)` 有効化。出典: https://nextjs.org/docs/app/api-reference/functions/generate-viewport , https://developer.mozilla.org/en-US/docs/Web/CSS/env
- **入力は 16px 以上**（iOS のフォーカス時オートズーム防止）。zoom 無効化はしない（WCAG）。
  出典: https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/
- **タップ領域 48px**（Apple 44 / Material 48）。出典: https://m3.material.io/foundations/designing/structure
- ダークモード自動反転は無効化（`color-scheme: light`）。暖色ブランドを SNS のアプリ内ブラウザで固定。

## 3. OGP（個別チケット画像）アーキテクチャ

要件：チケット共有時に**1人ずつ名前入り**の画像をプレビュー表示。$0（Blaze 不使用）。

- **券面＝OG は「同じ一枚」**：サイトに出る券（`src/components/ticket-card.tsx`）と、シェアで拡散される
  OG画像（`functions/og/[id].js`）を**同一意匠**にして所有感を出す（Vercel Ship 式）。横長ボーディング
  パス：本券（meatupワードマーク／GUESTバッジ／肩書き／名前／日時・会場フッター）＋ もぎり線 ＋ 半券
  （oniku／QR／TICKET No.）。サイト側は **container-query 単位(cqw)** で 1080px設計を任意幅へ等比縮小。
- **動的要素**：肩書き(`role`)と、「何が楽しみ？」の選択を一字に割り当てた**透かし**（肉/麦/遊/繋＝
  `expectationChars`）で1枚ずつ違う絵に。状態(確定/受付)は**OGに載せない**（1年immutableキャッシュで
  凍結するため。サイトの券外にのみ表示）。
- **QR**：半券に共有URL `…/t/{uid}` の QR（`qrcode-generator`→自前SVG、ink on cream）。拡散先で
  スキャン→イベントへ、の導線。サイト/関数で同じ生成（`src/lib/qr.ts`／`functions/_lib/qr.js`、要同期）。

- **なぜエッジ必須**：クローラは JS を実行しない＝OG メタ/画像はサーバ HTML に無いと効かない。
  個別＝動的レンダリング。Firebase Hosting で動的は Cloud Functions＝Blaze で NFR1 違反 → 不採用。
  出典: https://ogp.me/ , https://firebase.google.com/docs/firestore/use-rest-api
- **構成**（Cloudflare Pages Functions、`functions/`）
  - `functions/t/[id].js`：共有 HTML。OG/Twitter メタを出力し `/og/[id]` を指す。人はアプリへリダイレクト。
  - `functions/og/[id].js`：1200×630 PNG を生成。
  - ルーティングは `functions/` から Cloudflare が `_routes.json` を自動生成（/t/*・/og/* のみ関数、他は静的）。
  出典: https://developers.cloudflare.com/pages/functions/routing/
- **画像生成 = `workers-og`**（Satori＋resvg-wasm、Workers ランタイム対応。`@vercel/og` は CF で WASM
  バンドルが異なり動かない）。HTML 文字列を渡せる。
  出典: https://github.com/kvnang/workers-og
- **日本語フォント**：Satori は字形を持つフォントが無いと豆腐になる。`loadGoogleFont({family:'Noto Sans
  JP', text})` で**描画する字だけを部分集合**取得（数 KB）。ワードマーク/日付は `Righteous`（英字表示用）を
  別途読む。フル同梱は Free のスクリプト上限 3MiB を圧迫するため避ける。
  出典: https://developers.cloudflare.com/workers/platform/limits/
- **アセット**：oniku は静的 `/oniku.svg` を取得して data URL 化、pin は関数内インラインSVG。Satori は
  inline SVG が不安定なため画像は **`<img>`(data URL)** で渡す。ルート div は **明示px幅**にしないと内容幅へ
  縮んで中央寄せが効かない（実機で確認・修正済み）。
- **データ取得（未認証）**：公開投影 `shares/{uid}`（`name`/`ticketNo`/`role`/`expectations` のみ）を匿名
  Firestore REST で取得。ルールで `read: if true` / 本人 write / フィールド限定。**gender や attendee 本体
  などの機微は出さない**。出典: https://firebase.google.com/docs/firestore/use-rest-api
- **キャッシュ**：PNG は `public, immutable, max-age=31536000`（発行時に確定）。HTML は短め。

## 3.5 画面構成：実務（マイページ）と情緒（券）の分離

このイベントの券は**実務機能を持たない**（現場で使わない＝盛り上げ用）。主催が要るのは「誰が来る/
払った」、来る人が要るのは「詳細/払った」だけ。だから券の仕事は**情緒**＝「開いた人をわくわくさせる」。
この前提から、実務入口を券にすると違和感が出る、という判断で**2面に分けた**：

- **`/mypage`（実務ホーム・ログイン後の着地点）**：状態（承認）＋支払い（`事前決済：未`をソッと）＋
  日時/場所＋招待（approved）＋連絡・困ったとき（キャンセル/変更も集約）。静かで分かる面。
- **`/ticket`（情緒のリビール）**：券（全面）＋シェア**だけ**。読み込み時に券がふわっと登場
  （`.ticket-reveal`）。"見せる/共有する"瞬間に集中。
- 動線：`/mypage` の「**チケットを見る 🎟**」が券へ誘う唯一の入口。登録/招待後の遷移も `/mypage`。
  共有リンク `t/[id]` は従来どおり `/ticket` を指す。

判断の根拠（§0の軸＋補足）：
- **HIG**：ナビとアクションは別物（シェア/招待は画面内アクション、画面分割の理由にしない）。最頻アクション
  を主役に（/mypage では「券を見る」、/ticket では「シェア」）。共有は square.and.arrow.up の馴染みアイコンで
  右上に（大きな主役ボタンは券のリビールに対し過剰）。
- **NN/g**：美的で最小限（券面に実務を盛らない）／システム状態の可視化（状態・支払いを /mypage に）／
  認識＞記憶（Wallet パスのメンタルモデル）。
- **情緒の最上段**：Aaron Walter「UX hierarchy of needs」の Pleasurable／Norman の anticipation。券は実務価値
  ゼロゆえ、"開く"ひと手間が損失ゼロで期待感を生む稀な例。
- **WCAG**：登場アニメは `prefers-reduced-motion: reduce` で無効化（2.3.3）。向きは固定しない（1.3.4）。
  スマホは横向きにすると券が上限幅（540px）まで拡大して読みやすい（回転実装はしない判断）。

## 4. 自己レビューで実機確認したこと（エミュレータ＋wrangler）

- モバイル幅（390×844）で全ページをスクショ確認：トップ/招待/登録/チケットがブランド通り描画。
- 実フロー（Google サインイン→登録→チケット）を通し、`shares/{uid}` 投影がルール越しに作成されることを確認。
- `wrangler pages dev` で `functions/` を起動し、`/t/{id}` の OG メタ、`/og/{id}` の 1200×630 PNG を生成。
  **日本語名「佐藤 さん」が豆腐化せず描画**されることを目視確認。欠番は 404。
- 修正：OG 画像の `Cache-Control` が二重出力だったため、ヘッダを set で単一化。
- コードレビュー（別エージェント）で指摘された脆弱性を修正・再検証：
  - **パストラバーサル/SSRF**：`id` を `^[A-Za-z0-9_-]{1,128}$` で検証し、`shares/` 外（例
    `attendees`）へ逸れる細工 id を 404。`/og/..%2F..%2Fattendees%2F…` が 404 になることを確認。
  - **OG 画像のエスケープ漏れ**：`og/[id].js` の `name`/`ticketNo` を HTML エスケープ（`<`/`"` で
    Satori が壊れ 500 になる問題）。`<script>…` を含む名でも 500 にならず描画されることを確認。
  - **`shares` ルール堅牢化**：create/update を分離し、`ticketNo` を更新不可（番号偽装防止）、
    フィールド限定、本人のみ。REST で 6 ケース（本人create/名前更新/番号変更拒否/他人拒否/
    余分フィールド拒否/匿名read）すべて期待通り。

## 5. 既知の留保・次の判断ポイント

- スタイルは方向性の提案。全棄却なら `style-and-ogp` を破棄。
- 共有リンクの遷移先は現状 `/ticket`（本人なら自分の券、未登録者は参加導線）。要検討。
- マスコットは絵文字 🍖。オリジナル oniku SVG を起こすかは任意（過去2作は独自 SVG/PNG）。
- トップの日時・会場は「調整中」。実データ確定後に差し替え。
- 実機（LINE/Instagram アプリ内ブラウザ）での最終確認は本番デプロイ後（svh のジッタ等）。
