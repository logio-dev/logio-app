# Wac 短い運用手順

## 最短ルール

1. 修正前に現象と期待値を1行で整理
2. ローカルで `npm run dev` を起動
3. 実画面で確認する
4. 問題なければ「確定」
5. Claude Code がコミットと push を実行

## よく使うコマンド

```bash
npm run dev

git status --short
git --no-pager diff -- src/App.jsx
git add src/App.jsx
git commit -m "現場名重複防止と一覧重複除去を修正"
git push origin main
```

## 確定の基準

- 画面が意図どおり
- 数字が合っている
- 重複がない
- ユーザー操作に不自然さがない

## コミット例

- 「現場名重複防止と一覧重複除去を修正」
- 「同名現場の追加防止と一覧表示の重複解消」
- 「現場追加時の重複チェックと画面表示修正」

## 重要

ビルド成功だけでは不十分です。画面確認を必須にし、その後に確定して push します。

詳しい版: [docs/運用マニュアル.md](docs/運用マニュアル.md)
