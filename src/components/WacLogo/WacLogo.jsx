// Wac ロゴ（E案「Wac by FACE」）
// 使い方:
//   <WacLogo variant="header" />  … 上部ヘッダー中央
//   <WacLogo variant="menu" />    … 左メニュー（ドロワー）の一番上
//   <WacLogo variant="login" />   … ログイン画面（左右にマスコット＋下に by FACE）
// フォントは fonts/ に同梱（外部読み込みなし）。
import "./WacLogo.css";
import mascotGreen from "./assets/mascot-green.webp";
import mascotPink from "./assets/mascot-pink.webp";

function ByFace() {
  return (
    <>
      <span className="wac-logo__by">by</span>
      <span className="wac-logo__face">FACE</span>
    </>
  );
}

export default function WacLogo({ variant = "header", className = "" }) {
  const cls = `wac-logo wac-logo--${variant} ${className}`.trim();

  if (variant === "login") {
    return (
      <div className={cls} role="img" aria-label="Wac by FACE">
        <div className="wac-logo__row" aria-hidden="true">
          <img className="wac-logo__mascot wac-logo__mascot--left" src={mascotGreen} alt="" draggable="false" />
          <span className="wac-logo__wac">Wac</span>
          <img className="wac-logo__mascot wac-logo__mascot--right" src={mascotPink} alt="" draggable="false" />
        </div>
        <span className="wac-logo__sub" aria-hidden="true">
          <ByFace />
        </span>
      </div>
    );
  }

  return (
    <span className={cls} role="img" aria-label="Wac by FACE">
      <span className="wac-logo__wac" aria-hidden="true">Wac</span>
      <span aria-hidden="true" style={{ display: "contents" }}>
        <ByFace />
      </span>
    </span>
  );
}
