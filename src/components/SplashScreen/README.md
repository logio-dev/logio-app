# Wac 起動画面（A案「ポン」）

## 中身
- `SplashScreen.jsx` … 起動画面コンポーネント（React）
- `SplashScreen.css` … 見た目
- `assets/mascot-green.webp` / `assets/mascot-pink.webp` … マスコット画像（2枚で約41KB）
- `preview.html` … 試作ページ（ブラウザで開くと動きを確認できる。本番には不要）

## 仕様
- 演出は約1.1秒：Wがポンと出る → 2体がWの裏から飛び出して前へ → フェイスの黄色（#F8B500）でWがピカッ → フェードアウト
- `ready` が false の間は、2体が交互に跳ねて待つ（下に黄色の点3つ）。true になった時点で消える
- タップで即スキップ
- 端末の「視差効果を減らす」がオンならフェードのみ
- 外部ライブラリ不要（ブラウザ標準の Web Animations API を使用）

## 使い方
```jsx
import SplashScreen from "./components/SplashScreen/SplashScreen";

const [showSplash, setShowSplash] = useState(true);

{showSplash && (
  <SplashScreen
    ready={!loading}            // 初回データ読み込みが終わったら true
    onFinish={() => setShowSplash(false)}
  />
)}
```

## Claude Code への指示（コピーして貼り付け）

```
src/components/SplashScreen/ に新しい起動画面コンポーネントを置きました（README.md に仕様あり）。
今の起動画面（マスコットが揺れて「Wac」の文字が出る画面）を、これに置き換えてください。

- 今の起動画面のコンポーネント・CSS・画像・タイマーを探して、SplashScreen に差し替える
- 今の起動画面は約3.9秒出ている。固定の待ち時間（setTimeout や最低表示時間）があれば削除する
- ready には「初回のデータ読み込みが終わったか」を渡す（Supabase の初回取得など。無ければ true 固定でよい）
- onFinish で起動画面を非表示にする
- 使わなくなった旧起動画面のファイルは、削除してよいか一覧で確認してから消す
- 変更内容を説明 → npm run dev で動作確認できる状態にする
- commit / push は私が画面で確認してから指示する
```
