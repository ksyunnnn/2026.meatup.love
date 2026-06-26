# チケット共有 / Instagram ストーリー対応 — 設計と根拠（出典付き）

> `/ticket`・`/register` の「シェア」機能の設計記録。判断の根拠と出典を残す（記憶の逐語は不可・
> 効く判断はその場で公式を実取得して裏取りする方針。`DESIGN.md §0` と同じ運用）。
> 対象実装: `src/components/share-menu.tsx` / `src/lib/use-ticket-share.ts` / `src/lib/share.ts` /
> `functions/og/[id].js`（OGP画像生成）/ `src/app/globals.css`（モーション）。

## 0. 要件

- チケット（個別OGP画像）を **Instagram のストーリーにシェア**したい。
- ストーリーは**画像でのシェアが必須**。できれば**URLも添えたい**。
- meatup.love は **Web（Next.js / 静的書き出し）**。ネイティブアプリは持たない。

## 1. Instagram ストーリー共有の仕様（調査結果）

### 1-1. 公式の「Sharing to Stories」は**ネイティブ専用**
Meta公式が提供するストーリーへの差し込みは iOS / Android の**ネイティブアプリ専用**。Web向け公式SDKは無い。

- iOS: URLスキーム `instagram-stories://share` ＋ `UIPasteboard` に名前付きアイテムを書き込む。
  - キー: `com.instagram.sharedSticker.backgroundImage`（背景・全画面）/ `…stickerImage`（ステッカー＝動かせるシール）/ `…backgroundTopColor` / `…backgroundBottomColor`
  - 画像推奨: 背景 720×1280・比率 9:16/9:18、ステッカー 約 640×480
- Android: 暗黙的Intent `com.instagram.share.ADD_TO_STORY` ＋ `interactive_asset_uri` ＋ `grantUriPermission`（`FLAG_GRANT_READ_URI_PERMISSION`）
- **Webからは不可**: Mobile Safari は名前付きペーストボードを書けず、ブラウザは content:// のURI権限付与もできない（＝stickerImage指定は権限モデル上ブラウザでは不可能）。
  - 出典: [Meta for Developers — Sharing to Stories](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories/) / [Sharing to Instagram Stories: a definitive guide (Ishan Chhabra)](https://www.ishanchhabra.com/thoughts/sharing-to-instagram-stories) / [SwiftUI 実装例 (Codakuma)](https://codakuma.com/instagram-stories-sharing-swiftui/) / [react-native-share #855（Android の URI 権限）](https://github.com/react-native-share/react-native-share/issues/855)

### 1-2. 「クリック可能なURLの自動添付」は**公式に不可**
現行の Sharing to Stories API に**リンクを渡すキーは無い**（画像と背景色のみ）。
ストーリーのリンクは Instagram アプリ内の**リンクステッカー**機能で、2023年に全アカウント開放されたが、
**ユーザーが手動で貼る**もので外部からの自動添付は不可。
- 出典: [About Instagram — リンクステッカー全開放](https://about.instagram.com/blog/announcements/expanding-sharing-links-in-stories-to-everyone)
- → 代替: **OGP画像内にURLのQRを焼き込む**（`functions/og/[id].js` で実装済み。テキストを落とす共有先でもURLが生存）。

### 1-3. 巷の「PCからストーリー投稿ツール」は用途違い
INSSIST / Metricool / Meta Business Suite 等は**アカウント運用者が自分で投稿する**ツールで、
「来場者が自分のチケットを自分のストーリーに共有する」用途には使えない。
- 出典: [How to Post Instagram Stories from PC (2026)](https://socialrails.com/blog/how-to-post-instagram-stories-from-pc-complete-guide)

## 2. Web で実現できること

### 2-1. Web Share API（採用）
`navigator.share({ files })` でOSの共有シートに**画像ファイル**を渡す → ユーザーがInstagram→ストーリーを選ぶ。
- `navigator.canShare({ files })` で事前判定が必須。iOS Safari / Android Chrome で動作。
- 注意（iOS）: `navigator.share()` はタップの**transient activation**が必要。ハンドラ内で `await fetch(画像)` すると活性が切れ `NotAllowedError` になりがち → **画像はタップ前に先読み**して `File` を用意。
- 注意（iOS）: `text` と `url` を**併用すると `url` が落ちる** → URLは `text` に内包し単一フィールドで渡す。
- 限界: 「ストーリー」を直接指定はできない（共有シート任せ）/ レイヤー（背景 or ステッカー）も指定不可。
  - 出典: [MDN — Navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) / [web.dev — Web Share API](https://web.dev/web-share/) / [Nearform — Sharing media in PWAs](https://www.nearform.com/blog/sharing-media-in-progressive-web-apps/)

### 2-2. 参考: Snapchat は Web 公式SDKがある（不採用）
Snapchat の [Creative Kit for Web](https://developers.snap.com/snap-kit/creative-kit/web) は、Webサイトに
ボタンを置くだけで**カスタムステッカー＋リンク付き**でストーリー共有できる。やりたいことが Web だけで実現する
唯一の正攻法だが、今回は共有先 Instagram 固定のため不採用（将来の選択肢として記録）。

## 3. リンク共有とのすみ分け（X/LINE はカード維持）

画像ファイルを共有すると X/LINE は**OGPカード**でなく画像添付になる。要件は「X/LINEはカード維持・Instagramは画像」。
両者は**別ペイロード**（URLテキスト vs 画像ファイル）で両立不可のため、**1つの入口→2択メニュー**で出し分ける。
- `shareLink()`: URLをテキストで渡す → X/LINE がOGPカード表示。Web Share非対応(PC)はクリップボードコピー。
- `shareImage()`: OGP画像を `File` で渡す → ストーリーに画像。URLは画像内QRで生存。非対応時は `shareLink()` にフォールバック。

## 4. モバイルUX — メニュー vs ボトムシート（根拠）

上部アンカーの小さいドロップダウンはモバイルで押しづらい（親指が届かない・誤タップで閉じる）。各社の答えは「下からのシート」。

| 出典 | 要点 |
|---|---|
| Apple HIG（Action sheets / Menus and actions） | アクションシートは**小さい画面では下からスライド**、大きい画面ではポップオーバー。iOS純正の共有も下シート。 |
| Material 3（Bottom sheets / Menus） | **モーダル・ボトムシートはモバイルでのインラインメニューの代替**。項目・説明・アイコンの余地があり背景操作をブロック。メニューはトリガー近接が要る時向け。 |
| 親指ゾーン（Hoober / NN/g） | 主要操作は**画面下40%**へ。下部のタップ精度 **96%** vs 上部 **61%**。片手操作49%・タップの75%が親指。右上＝最も届きにくい角。 |
| WCAG 2.1 | タップ標的 **≥44×44px**。 |

- 出典: [Apple HIG — Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets) / [Apple HIG — Menus and actions](https://developer.apple.com/design/human-interface-guidelines/menus-and-actions) / [Material 3 — Bottom sheets](https://m3.material.io/components/bottom-sheets/guidelines) / [Material 3 — Menus](https://m3.material.io/components/menus/guidelines) / [Smashing Magazine — The Thumb Zone](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/) / [LukeW — Designing for Large Screen Smartphones](https://www.lukew.com/ff/entry.asp?1927=)

### 採用: 入力デバイスで出し分け（レスポンシブ）
Apple が画面幅で「ポップオーバー⇄シート」を切替えるのと同じ発想を、Web では `@media (pointer: coarse)` で再現（ライブラリ不要・ゼロランタイムTailwindに適合）。
- **タッチ（coarse）** → 下からのアクションシート（暗幕＋grabber＋全幅の大きな行＋safe-area＋背景スクロールロック、`createPortal` で body 直下）。
- **ポインタ（fine）** → トリガー直下のポップオーバー（近接が効く）。
- 中身（行・グリフ凡例・コピー）は共通。各行に**実際に飛ぶ先のグリフ**（🐦Twitter＋LINE / Instagram）を添え、アイコンを「経路の凡例」にする。

## 5. 結論

- ✅ **画像としてのストーリー共有は可能**（Web Share API）。ただしストーリー指定・レイヤー指定はユーザー操作任せ。
- ❌ **URLの自動埋め込みは公式不可** → 画像内QRで担保。
- ❌ **stickerImage（動かせるシール）指定は Web 不可**（ネイティブ権限モデル）。やるならネイティブ/Capacitor等。
- 📱 モバイルは**ボトムシート**、PCは**ポップオーバー**のレスポンシブ。

## 6. 参考リンク（記事用にまとめ）

- Instagram: [Sharing to Stories](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories/) / [リンクステッカー全開放](https://about.instagram.com/blog/announcements/expanding-sharing-links-in-stories-to-everyone) / [実装ガイド(Ishan Chhabra)](https://www.ishanchhabra.com/thoughts/sharing-to-instagram-stories) / [SwiftUI(Codakuma)](https://codakuma.com/instagram-stories-sharing-swiftui/) / [Android URI権限(react-native-share#855)](https://github.com/react-native-share/react-native-share/issues/855)
- Web Share API: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) / [web.dev](https://web.dev/web-share/) / [Nearform(PWA)](https://www.nearform.com/blog/sharing-media-in-progressive-web-apps/)
- 代替: [Snapchat Creative Kit for Web](https://developers.snap.com/snap-kit/creative-kit/web)
- モバイルUX: [Apple HIG Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets) / [Apple HIG Menus and actions](https://developer.apple.com/design/human-interface-guidelines/menus-and-actions) / [Material 3 Bottom sheets](https://m3.material.io/components/bottom-sheets/guidelines) / [Material 3 Menus](https://m3.material.io/components/menus/guidelines) / [Smashing — Thumb Zone](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/) / [LukeW — Large Screen Smartphones](https://www.lukew.com/ff/entry.asp?1927=)
