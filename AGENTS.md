# webfullscreencapture

開いている Web ページ全体を 1 枚の PNG に保存する Chrome 拡張 (Manifest V3 / plain JavaScript / ビルドなし)。要件・使い方・構成方針は README.md を参照。拡張の実体は `extension/` 配下で、そのディレクトリを Chrome にそのまま読み込む。

## 検証方法

コード変更後は以下がすべて通ることを確認してから完了報告する。

- 単体テスト: `node --test`
- 構文チェック: `for f in extension/capture-plan.js extension/background.js extension/popup.js; do node --check "$f"; done`
- manifest の検証: `node -e "JSON.parse(require('fs').readFileSync('extension/manifest.json', 'utf8'))"`
- 拡張を読み込んだブラウザでの確認 (popup の表示・拡張の読み込み): webtunnel (GitHub Actions 上の Chromium) で行う。caller workflow は `.github/workflows/browser-session.yml` で、`extension/` を `extension_path` として読み込む。手順は `~/.claude/skills/webtunnel/SKILL.md` に従い、`WEBTUNNEL_REPO=bannzai/webfullscreencapture` を付けて起動する。popup は run のステップサマリに出る `chrome-extension://<id>/popup.html` を CDP で開いて確認する
- 撮影フロー (ツールバーのアイコンをクリックして PNG が保存されるまで) の確認: `activeTab` 権限はユーザーがアイコンをクリックした時にだけ付与され、CDP からは付与できないため自動化できない。ローカルでは `tmp/` に `host_permissions: ["<all_urls>"]` を足した `extension/` のコピーを作り、`agent-browser --session webfullscreencapture --extension <コピーのパス>` で読み込んで popup を `chrome-extension://<id>/popup.html` として開き、そのページの `chrome.runtime.sendMessage({ type: "capture", tabId })` を eval で呼んで撮影を再現する (コピーは commit しない)。手順の詳細は README.md「動作確認手順」を参照
- ローカルでの手動確認: README.md の「インストール (開発版)」と「動作確認手順」に従う (手順の SSOT は README 側)

<!-- ai-review-config begin -->
<!--
このブロックは自動生成です。直接編集せず、テンプレートを更新してから再生成してください。
内容は AI コードレビュー時の挙動指示であり、コードベース自体への規約ではありません。
-->

## レビュー時の応答スタイル

- 応答は日本語で行う

## レビュー範囲外

以下は自動レビューで指摘しない (別の検出経路があるため):

- コンパイルエラー・型エラー (ローカル/CI のビルドで検出される)
- Lint/フォーマット違反 (リンター・フォーマッターで検出される)
<!-- ai-review-config end -->
