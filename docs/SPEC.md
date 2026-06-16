# meatup 2026 — 仕様メモ（進行中のロードマップ）

> ⚠️ **これは“完成した仕様書”ではありません。** 現時点の思いつきと決定を記録した、
> ここから育てていく**未完成のロードマップ**です。内容は今後変わります。確定事項と
> 検討中・後回しを区別して書いています。最新の実装状況はコミット履歴も参照。

## 概要

歴代 meatup の今年度開催回サイト。告知に加えて **簡単な招待管理**を持たせる：
簡単な認証で「誰か」を把握し、**仮想チケット**を発行（現場では使わない＝盛り上げ用）。
データはセンシティブでない（任意の名前・何してるひと・どっち＝性別程度）。

## 現状（実装フェーズ）

- ✅ Next.js 16 雛形・独立リポジトリ化・GitHub push
- ✅ Firebase 配線（`src/lib/firebase.ts`）・型・Emulator 設定・`firestore.rules`
- ✅ ルート骨組み `/invite → /register → /ticket` ＋ `/admin`
- ✅ 実 Firebase 配線：認証（Google/GitHub）→ 参加保存 → チケット発行
- ✅ 主催者の確認画面：確認待ち一覧・「確認しました！」で確定・参加者一覧
- ✅ 招待リンク発行（`/admin`）＋ 単回使用（トランザクションで1リンク1人だけ自動確定）

**動きは一通り完成**（FR1〜FR6 の主要動作）。残りはデザイン／コピー／通知／本番鍵など（後述）。
認証 UX 最適化・メールリンクは後回し。

## 機能要件（FR）

- **FR1 認証**: Google / GitHub / メール（マジックリンク）。認証IDが「誰か」の真実の源泉。
- **FR2 招待**: 管理者が `meatup.love/invite?name=X&t=token` を発行。開くと name プリフィル＋トークン保持。
  - 招待リンクは apex（`meatup.love`）でOK＝開催期間中だけ使う消えもの。
- **FR3 参加（登録）**: 認証後、name（編集可）＋何してるひと？（任意）＋どっち？（任意・男/女/その他ラジオ）→ 送信。
- **FR4 確認フロー**: 招待（有効トークン）＝**自動で確定**／飛び込み＝**pending → 管理者が「確認しました！」で確定**。
  リジェクトは可能だが基本使わない（UberEats の「店が確認しました」的なコミュニケーション）。
- **FR5 チケット**: 確定で仮想チケット発行（ユニーク番号＋共有/OGP）。ゲストは状態（受付→🎟確定）を見られる。
- **FR6 管理**: 管理者のみ `/admin`（確認待ち一覧・確認ボタン・招待リンク発行・参加者一覧）。
- **FR7 通知（任意）**: 新規申請への気づき＝pending バッジ＋（任意）Discord/Slack/LINE Webhook。
- **FR8（後回し）**: フォームに「**つながり／紹介者**」項目を追加（誰経由かを把握）。データ側に拡張枠を先行確保。
- **FR9（後回し）**: 直接招待者が **招待枠**を持つ（紹介ツリー）。`invites` に `issuedBy`/`edition` を先行設置し、
  発行権限を admin 限定 → admin＋枠を持つ確定者へ後から拡張。

## 非機能要件（NFR）

- **NFR1 コスト**: 保証された $0（Firebase Spark、Cloud Functions/Blaze 不使用、無料ホスティング）。
- **NFR2 無停止**: スリープしない（Supabase の pause 問題を回避）。休眠×開催前スパイクに耐える。
- **NFR3 長寿命/低保守**: 依存最小。数年放置後も再ビルド可能であること（2019 の sharp 教訓）。
- **NFR4 整合性/認可**: 非センシティブだが status 改ざん不可（approved は管理者 or 有効トークンのみ）を Firestore ルールで強制。
- **NFR5 低結合**: 独立リポジトリ・独自スタック・他回/ハブに非依存。個別デプロイ、apex 振り分けは `deploy/`。
- **NFR6 理解容易/協業**: Next + Firebase + TS の王道。
- **NFR7 スケール**: 小規模。無料枠で十分。静的フロント＋Firebase でスパイク耐性。
- **NFR8 プライバシー**: 収集最小・他人情報は管理者のみ閲覧。保持方針は別途。
- **NFR9 静的配信性**: Firebase は client SDK 中心 → フロントは静的のままで成立。

## データモデル（暫定）

`src/lib/types.ts` を正とする。要点：
- `attendees/{uid}`: authName / name / job? / gender? / status(pending|approved|rejected) /
  ticketNo? / edition / invitedAs? / inviteToken? / createdAt / approvedAt? / approvedBy?
- `invites/{token}`: name? / edition / issuedBy / usedBy? / createdAt
- `admins/{uid}`: 存在＝管理者（コンソール等で管理）

## 未決の設計判断（B で決める）

- ~~**チケット番号の形式**~~ → **暫定：ランダム短コード**（`MU-2026-XXXX`、登録時発行）を採用。連番は映えるが同時採番の競合対策が必要なので見送り（必要なら後で再検討）。
- ~~**ホスティング／静的化**~~ → **決定：Cloudflare**（Pages＋Pages Functions）をエッジに、
  Firebase は Auth/Firestore 専用。Next は `output:'export'`（静的）維持。個別チケット OGP は
  **共有ルートのみ Cloudflare Pages Function で動的生成**（Firebase Hosting 動的＝Blaze＝NFR1 違反のため不採用）。
- ~~**招待の usedBy 反映**~~ → **決定：単回使用**。`createAttendee` をトランザクション化し、
  有効・未使用トークンのみ自動確定＋`usedBy` を自分にセット。ルールで「消費者は usedBy を
  一度だけ自分に・他フィールド不変」を許可。同時利用は再試行で2人目以降 pending に落ちる。
- ~~**管理者ゲート**~~ → **実装済み**：`admins/{uid}` 存在チェック（自己 read のみ許可するルール追加）。
- **通知**: Webhook（Discord/Slack/LINE）にするか、管理画面バッジのみか。

## 後回し（ロードマップ）

- コピー調整パス：細かい言い回し全般、2019 の砕けたトーン（例「はよ参加登録させてくれ」）の反映。
  文言は `src/content/copy.ts` 等に集約して一括編集できるようにする案。
- デザイン／スタイリング（現状は素の最小スタイル、Tailwind なし）。
- **個別チケット OGP（次の実装対象・必須）**：1人ずつ名前入り画像。共有ルートを Cloudflare
  Pages Function にし、リクエスト時に OG メタ＋画像（Satori 系）を生成。閲覧者は未認証で見るため、
  確定時に**公開用の最小投影 `shares/{id}`（name／ticketNo のみ・world-readable）** を作るか署名付き URL を使う
  （プライバシー：name 公開の合意込み）。初回デプロイ＆動作確認の後に着手。
- FR8 つながり項目 / FR9 招待枠（紹介ツリー）。
- 実 Firebase プロジェクト作成と本番鍵差し込み（あなたのコンソール作業）。
- `2019-summer` の API エラーハンドリング不足（別サイトの既知 TODO・参考）。
- 認証 UX 改善（本番＆実機検証時に判断）：A=外部ブラウザ導線（採用方針）、B=Google One Tap/FedCM（戻りユーザー最小タップ・in-app での効きは要検証）、C=セッション永続化。OAuth 方式（popup→redirect＋authDomain=自ドメイン、または One Tap 追加）の最適化もここで。

## 決定ログ（確定事項）

- URL 方式：**サブドメイン**（各回 `<id>.meatup.love`、apex は最新回 or 端境期メタサイト）。
- バックエンド：**Firebase**（Supabase はスリープのため不採用）。
- フロント：**Next.js 16**（公式手順準拠、Tailwind なし＝意図的差分）。
- 認証：簡単な認証のみ。**Google 主役 / GitHub 任意 / メールリンクは保険（後回し）**。重い認可は持たない。
- **事実（実機確認 2026-06）**：Google サインインは LINE・Instagram の in-app ブラウザで動作する。当初の「WebView は Google が一律拒否」は過度な一般化につき撤回。
- **in-app ブラウザの UX 対策 = A（外部ブラウザで開く導線）を採用**：常用ブラウザの既存ログインに乗せて入力を削減（RFC 8252／LINE は `openExternalBrowser=1`）。今は OAuth は `signInWithPopup` を継続し、方式の最適化は本番ドメイン確定後の実機検証でまとめて判断。
- チケットは現場非使用＝盛り上げ用。
