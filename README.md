# 青空文庫 G2 リーダー

Even G2スマートグラスで青空文庫を読むWebアプリ。

## インスピレーション

[@howyi さんの記事・実装](https://zenn.dev/howyi/articles/eveng2-introduction)にインスパイアされて作成しました。
Even Hub SDKの使い方や画面サイズ等の知見は同氏の先行実装から学んでいます。
オリジナル実装: [howyi/even-aozora-reader](https://github.com/howyi/even-aozora-reader)

## 機能

- 書籍リストから作品を選択
- R1リング操作でページめくり（上スクロール: 次ページ / 下スクロール: 前ページ）
- Shift-JISエンコードされた青空文庫テキストの取得・整形
- ルビ・注記の除去

## 収録作品

| 作品 | 著者 |
|------|------|
| 羅生門 | 芥川龍之介 |
| 蜘蛛の糸 | 芥川龍之介 |
| 鼻 | 芥川龍之介 |
| 坊っちゃん | 夏目漱石 |
| こころ | 夏目漱石 |
| 銀河鉄道の夜 | 宮沢賢治 |
| ごんぎつね | 新美南吉 |

## 技術スタック

- TypeScript + Vite（シングルHTML出力）
- [@evenrealities/even_hub_sdk](https://www.npmjs.com/package/@evenrealities/even_hub_sdk)

## 開発

```bash
npm install
npm run dev -- --host
npx evenhub qr --url "http://<あなたのIP>:5173"
```

Even AppでQRをスキャンするとG2に読み込まれます。

```bash
npm run build  # dist/index.html にシングルファイル出力
```

## ライセンス

MIT
