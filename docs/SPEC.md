# meatup 2026 — 仕様メモ（進行中のロードマップ）

> ⚠️ **これは“完成した仕様書”ではありません。** 現時点の思いつきと決定を記録した、
> ここから育てていく**未完成のロードマップ**です。内容は今後変わります。確定事項と
> 検討中・後回しを区別して書いています。最新の実装状況はコミット履歴も参照。

## 概要

歴代 meatup の今年度開催回サイト。告知に加えて **簡単な招待管理**を持たせる：
簡単な認証で「誰か」を把握し、**仮想チケット**を発行（現場では使わない＝盛り上げ用）。
データはセンシティブでない（任意の名前・何してるひと・どっち＝性別程度）。

## 現状（実装フェーズ）

- ✅ Cycle 0: Next.js 16 雛形・独立リポジトリ化・GitHub push
- ✅ Cycle 1: Firebase 配線（`src/lib/firebase.ts`）・型・Emulator 設定・`firestore.rules`（DRAFT）
- ✅ Cycle 2: ルート骨組み `/invite → /register → /ticket` ＋ `/admin`（**ダミーデータ・スタブ**）
- ⏳ 次（B）: 実 Firebase 配線（Auth → 参加保存 → 承認 → **実際のID採番・発行**）

**今はまだダミー**：認証は押すだけのスタブ／登録は保存されない／チケット番号は固定ダミー／
`/admin` の確認ボタンは無反応。

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

- **チケット番号の形式**: (1) ランダム短コード（衝突しにくい・実装容易） vs (2) 連番（映えるが同時採番の競合対策が必要）。
- **ホスティング／静的化**: Cloudflare Pages（静的・$0・商用可・帯域無制限）優勢。Firebase Hosting も候補。
  → 決まれば `output:'export'` 要否も確定。
- **招待の usedBy 反映**: トークン消費の記録をどう書くか（限定ルール or 特権ツール）。未実装。
- **管理者ゲート**: `admins/{uid}` 存在チェックで進める想定。
- **通知**: Webhook（Discord/Slack/LINE）にするか、管理画面バッジのみか。

## 後回し（ロードマップ）

- コピー調整パス：細かい言い回し全般、2019 の砕けたトーン（例「はよ参加登録させてくれ」）の反映。
  文言は `src/content/copy.ts` 等に集約して一括編集できるようにする案。
- デザイン／スタイリング（現状は素の最小スタイル、Tailwind なし）。
- OGP 画像生成（チケット共有用）。
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
