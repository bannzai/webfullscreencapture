# 拡張の権限と外部送信を増やさない

本拡張は「ページの内容を外部に送信しない」「必要最小限の権限だけを使う」ことをプライバシーポリシー (`docs/PrivacyPolicy.md`) で約束している。実装がその約束から外れると、ストアの審査と利用者への説明の両方が崩れる。

## ルール

- 撮影した画像・ページ内容・URL・タイトルは、ブラウザ内 (canvas と `chrome.downloads`) で完結させる。外部サーバーへの送信、アクセス解析、外部スクリプトの読み込みを追加しない
- `manifest.json` の `permissions` / `host_permissions` を増やす時は、`docs/PrivacyPolicy.md` の「権限の利用目的」を同じ変更で更新する。特に `activeTab` を `<all_urls>` に広げない (ユーザーが拡張を操作したタブだけを対象にする設計のため)
- ビルドステップを導入しない。`extension/` を Chrome の「パッケージ化されていない拡張機能を読み込む」でそのまま読める状態を保つ (README「インストール (開発版)」と webtunnel の `extension_path` がこの前提に依存する)
- `chrome.tabs.captureVisibleTab` の呼び出し間隔・canvas の上限など、Chrome の制約に由来する固定値は `extension/capture-plan.js` / `extension/background.js` のコメントの根拠を更新してから変える
