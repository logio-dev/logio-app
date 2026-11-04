# Wac ロゴ（E案「Wac by FACE」）

完成イメージは `preview.png`（左から ヘッダー／メニュー／ログイン）。

## 中身
- `WacLogo.jsx` … ロゴ部品（React）。`variant` で3種類を切り替え
- `WacLogo.css` … 見た目（文字サイズ・色・黄色の光）
- `fonts/` … ロゴ用フォント（必要な文字だけに絞って計約3KB。外部読み込みなし）
  - Inter 800（Wac）／Inter 500（by）／Archivo 900・幅85%（FACE）
  - どちらも SIL Open Font License。ライセンス文を同梱（削除しないこと）
- `assets/` … ログイン画面で左右に並べるマスコット2体
- `preview.png` … 完成イメージ（本番には不要）

## 使い方
```jsx
import WacLogo from "./components/WacLogo/WacLogo";

<WacLogo variant="header" />  // ヘッダー中央の「Wac」と置き換え
<WacLogo variant="menu" />    // 左メニュー（ドロワー）上部の「Wac」と置き換え
<WacLogo variant="login" />   // ログイン画面のマスコット＋「Wac」＋キャッチコピーと置き換え
```

## Claude Code への指示（コピーして貼り付け）

```
ダウンロードフォルダ（~/Downloads）に解凍した「WacLogo」フォルダがあります。
これをこのプロジェクトの src/components/WacLogo/ にコピーしてください（components フォルダが無ければ作る）。
仕様は WacLogo/README.md、完成イメージは WacLogo/preview.png です。preview.png と README.md は src にコピーしなくてよい。

アプリ内の「Wac」ロゴの文字を、この WacLogo に置き換えてください。

1. ヘッダー（画面上部の中央の「Wac」）→ <WacLogo variant="header" />
2. 左メニュー（ドロワー）の一番上の「Wac」→ <WacLogo variant="menu" />
3. ログイン画面
   - 上の大きいマスコット画像、「Wac」の見出し、「現場管理をスマートに」の文字の3つを削除し、
     代わりに <WacLogo variant="login" /> を一番上に置く
   - 「一般／管理者」の切り替えと、ID・パスワードの入力欄はそのまま残す（並びは ロゴ → 一般／管理者 → 入力欄）
   - 余白は詰まりすぎないよう自然に調整
4. ブラウザのタブ名（<title>）やホーム画面に追加したときのアプリ名など、文字としての「Wac」は変えない
5. ロゴ以外の機能・見た目は変えない

作業前に、置き換える場所（ファイル名と行）を一覧で見せてから進めてください。
終わったら変更内容を説明 → npm run dev で確認できる状態にする。commit / push は私が画面で確認してから指示します。
```
