# webfullscreencapture

開いている Web ページ全体をスクショしてくれる Chrome Extension。スクロールしないと見えない範囲まで含めて 1 枚の PNG にし、ダウンロードフォルダに保存する。

## 使い方

1. 保存したいページを開く
2. ツールバーの拡張アイコンをクリックして popup を開く
3. 「撮影して PNG を保存」を押す。ページが自動で下までスクロールしながら撮影され、popup に「撮影中 n / m」と進捗が出る
4. 「保存しました: <ファイル名>」と出たら、ダウンロードフォルダに `<ページタイトル>_<日時>.png` が保存されている。撮影後はスクロール位置が元に戻る

固定ヘッダーやバナー (`position: fixed` / 先頭に見えている `sticky`) は、先頭の 1 フレームだけ写して以降のフレームでは隠す。

## インストール (開発版)

**事前ビルドは不要。** plain JavaScript のみで構成されているため、clone したリポジトリの `extension/` をそのまま Chrome に読み込める (`npm install` も `dist/` のような生成ディレクトリもない)。

1. このリポジトリを clone する
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」をオンにする
4. 「パッケージ化されていない拡張機能を読み込む」をクリックする
5. clone したリポジトリの **`extension/` ディレクトリ** (`manifest.json` が直下にある場所) を選択する
6. 拡張一覧に「Web Full Screen Capture」が表示されれば完了。ツールバーのパズルアイコンからピン留めしておくと使いやすい

コードを変更した場合は、`chrome://extensions` のカードにある更新 (リロード) アイコンを押す。

## 動作確認手順

### 手動 (実ブラウザ)

1. スクロールが必要な長いページ (例: Wikipedia の記事) を開く
2. 拡張アイコンをクリックし、「撮影して PNG を保存」を押す
3. ページが自動で下までスクロールし、popup に「撮影中 n / m」が出ることを確認する
4. 「保存しました」と出た後、ダウンロードフォルダの PNG を開き、ページ先頭から末尾までが 1 枚に収まっていること、固定ヘッダーが 2 回以上写っていないことを確認する
5. ページのスクロール位置が撮影前に戻っていることを確認する

### 自動 (agent-browser)

撮影に使う `activeTab` 権限はユーザーがアイコンをクリックした時にだけ付与され、CDP からは付与できない。そのため自動確認では `host_permissions: ["<all_urls>"]` を足した `extension/` のコピーを `tmp/` に作って読み込み、popup をタブとして開いて service worker へ直接メッセージを送る (コピーは commit しない)。

```bash
rm -rf tmp/extension-e2e && cp -R extension tmp/extension-e2e
node -e "const p='tmp/extension-e2e/manifest.json';const m=JSON.parse(require('fs').readFileSync(p,'utf8'));m.host_permissions=['<all_urls>'];m.permissions.push('tabs');require('fs').writeFileSync(p,JSON.stringify(m,null,2))"
agent-browser --session webfullscreencapture --extension "$PWD/tmp/extension-e2e" open https://ja.wikipedia.org/wiki/Google_Chrome
```

拡張の ID はディレクトリの絶対パスから決まる。popup を `chrome-extension://<id>/popup.html` として別タブで開き、そのタブで `chrome.tabs.query({ url: "https://ja.wikipedia.org/*" })` で対象タブの id を取り、`chrome.runtime.sendMessage({ type: "capture", tabId })` を `agent-browser eval` で呼ぶ。結果の `filename` と `chrome.downloads.search` で保存先を確認し、PNG を目視する。

### うまく動かない時

- **「このページは撮影できません」と出る**: `chrome://` の設定ページ、拡張のページ、Chrome ウェブストアには content script を注入できないため撮影できない
- **拡張を読み込む前から開いていたタブで失敗する**: ページを再読み込みしてから再実行する
- **とても長いページで画像が縮小される**: Chrome の canvas 上限 (1 辺 16384px) に収まるよう縮小して保存する仕様

## 構成と方針

- Manifest V3 + plain JavaScript。ビルドステップなしで `extension/` をそのまま読み込める
- 権限は `activeTab` / `scripting` / `downloads` のみ。ユーザーがアイコンをクリックしたタブだけを対象にし、すべてのサイトを常時読み取る権限は要求しない
- サーバー・DB・アカウント・アクセス解析は持たない。撮影 (`chrome.tabs.captureVisibleTab`) と結合 (`OffscreenCanvas`) と保存 (`chrome.downloads`) はすべてブラウザ内で完結し、外部にデータを送信しない
- `captureVisibleTab` の呼び出し回数制限 (1 秒あたり 2 回) と canvas の上限 (1 辺 16384px) を `extension/background.js` / `extension/capture-plan.js` で扱う
- 拡張を読み込んだ状態でのリモート動作確認は webtunnel (`.github/workflows/browser-session.yml`) で行う

## ドキュメント

- 公開サイト: https://bannzai.github.io/webfullscreencapture/
- 利用規約: [docs/Terms.md](./docs/Terms.md)
- プライバシーポリシー: [docs/PrivacyPolicy.md](./docs/PrivacyPolicy.md)

開発時の自動テスト・検証方法は [AGENTS.md](./AGENTS.md) を参照。
