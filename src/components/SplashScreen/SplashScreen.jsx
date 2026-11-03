// Wac 起動画面（A案「ポン」）
// 使い方:
//   {showSplash && <SplashScreen ready={初回読み込み完了} onFinish={() => setShowSplash(false)} />}
// ・演出は約1.1秒。ready が true ならそのまま消える
// ・ready が false のままなら、2体が交互に跳ねて待ち、true になった時点で消える
// ・タップで即スキップ
// ・端末の「視差効果を減らす」がオンならフェードのみ
import { useEffect, useRef, useState } from "react";
import "./SplashScreen.css";
import mascotGreen from "./assets/mascot-green.webp";
import mascotPink from "./assets/mascot-pink.webp";

const W_PTS =
  "260,328 340,328 410,589 480,328 545,328 615,589 685,328 765,328 665,695 583,695 512,448 442,695 360,695";
const FACE_YELLOW = "#F8B500";
const W_SHADOW = "drop-shadow(0 5px 6px rgba(0,0,0,.55))";
const BACK = "cubic-bezier(.3,1.55,.55,1)";

export default function SplashScreen({ ready = true, onFinish }) {
  const rootRef = useRef(null);
  const readyRef = useRef(ready);
  const finishRef = useRef(onFinish);
  const doneRef = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => { readyRef.current = ready; }, [ready]);
  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    finishRef.current?.();
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    const q = (s) => root.querySelector(s);
    const A = (el, kf, o) => el.animate(kf, { fill: "both", ...o });
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const logo = q(".wac-splash__logo");
    const art = q(".wac-splash__art");
    const svg = q(".wac-splash__w");
    const glow = q(".wac-splash__glow");
    const shine = q(".wac-splash__shine");
    const flash = q(".wac-splash__flash");
    const spark = q(".wac-splash__spark");
    const ml = q(".wac-splash__m--left");
    const mr = q(".wac-splash__m--right");
    const dots = q(".wac-splash__dots");

    const hop = (el) =>
      A(el, [
        { transform: "translateY(0) scale(1,1)", easing: "cubic-bezier(.2,.7,.4,1)" },
        { transform: "translateY(-7%) scale(.97,1.04)", offset: 0.45, easing: "cubic-bezier(.6,0,.8,.4)" },
        { transform: "translateY(0) scale(1.08,.9)", offset: 0.8, easing: "ease-out" },
        { transform: "translateY(0) scale(1,1)" },
      ], { duration: 360 });

    const intro = () => {
      if (reduce) {
        A(art, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
        return 400;
      }
      // W がポンと押し出される
      A(svg, [
        { transform: "scale(.5)", opacity: 0 },
        { transform: "scale(1.09)", opacity: 1, offset: 0.62 },
        { transform: "scale(1)" },
      ], { duration: 320, easing: "cubic-bezier(.25,.8,.35,1)" });
      A(glow, [
        { opacity: 0, transform: "scale(.4)" },
        { opacity: 1, transform: "scale(1)", offset: 0.35 },
        { opacity: 0, transform: "scale(1.35)" },
      ], { delay: 80, duration: 620, easing: "ease-out" });

      // 2体が W の裏から飛び出して前へ回り込む
      const pop = (el, dx, rot, delay) =>
        A(el, [
          { transform: `translate(${dx}%,8%) scale(.55) rotate(0deg)`, opacity: 0, zIndex: 1, easing: "cubic-bezier(.2,.9,.3,1)" },
          { transform: `translate(${-dx * 0.22}%,-26%) scale(1.07) rotate(${rot}deg)`, opacity: 1, zIndex: 1, offset: 0.5, easing: "linear" },
          { transform: `translate(${-dx * 0.22}%,-26%) scale(1.07) rotate(${rot}deg)`, opacity: 1, zIndex: 3, offset: 0.51, easing: BACK },
          { transform: "translate(0%,0%) scale(1) rotate(0deg)", opacity: 1, zIndex: 3 },
        ], { delay, duration: 440 });
      pop(ml, 50, -7, 110);
      pop(mr, -50, 7, 170);

      // フェイスの黄色で W がピカッ
      const d = 420, dur = 300, f = d + dur * 0.42;
      A(shine, [
        { transform: "translateX(0px) skewX(-18deg)", opacity: 1 },
        { transform: "translateX(1300px) skewX(-18deg)", opacity: 1 },
      ], { delay: d, duration: dur, easing: "cubic-bezier(.45,0,.25,1)" });
      A(flash, [{ opacity: 0 }, { opacity: 0.7, offset: 0.3 }, { opacity: 0 }], { delay: f, duration: 280, easing: "ease-out" });
      A(svg, [
        { filter: W_SHADOW },
        { filter: "drop-shadow(0 0 16px rgba(248,181,0,.95))", offset: 0.3 },
        { filter: W_SHADOW },
      ], { delay: f, duration: 340, easing: "ease-out", fill: "none" });
      A(spark, [
        { opacity: 0, transform: "scale(0) rotate(0deg)" },
        { opacity: 1, transform: "scale(1.15) rotate(45deg)", offset: 0.4 },
        { opacity: 0, transform: "scale(.2) rotate(90deg)" },
      ], { delay: d + dur * 0.65, duration: 300, easing: "ease-out" });
      return 870;
    };

    (async () => {
      await wait(intro());
      if (cancelled) return;
      // まだ読み込み中なら交互に跳ねて待つ
      if (!readyRef.current) {
        A(dots, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
        let left = true;
        while (!readyRef.current && !cancelled) {
          if (reduce) await wait(100);
          else await hop(left ? ml : mr).finished.catch(() => {});
          left = !left;
        }
      }
      if (cancelled) return;
      A(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-in" });
      A(logo, [
        { transform: "translate(-50%,-50%) scale(1)" },
        { transform: "translate(-50%,-50%) scale(1.07)" },
      ], { duration: 180, easing: "ease-in" });
      await wait(180);
      if (!cancelled) finish();
    })();

    return () => {
      cancelled = true;
      root.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    };
    // 起動時に1回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;

  return (
    <div className="wac-splash" ref={rootRef} onClick={finish} role="presentation">
      <div className="wac-splash__logo">
        <div className="wac-splash__art">
          <div className="wac-splash__glow" />
          <svg className="wac-splash__w" viewBox="0 0 1024 1024" aria-label="Wac">
            <defs>
              <linearGradient id="wacsp-wg" x1="0" y1="0" x2="0.25" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset=".65" stopColor="#f1f1f1" />
                <stop offset="1" stopColor="#cfcfcf" />
              </linearGradient>
              <linearGradient id="wacsp-sg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={FACE_YELLOW} stopOpacity="0" />
                <stop offset=".3" stopColor={FACE_YELLOW} stopOpacity=".95" />
                <stop offset=".5" stopColor="#FFE48A" stopOpacity="1" />
                <stop offset=".7" stopColor={FACE_YELLOW} stopOpacity=".95" />
                <stop offset="1" stopColor={FACE_YELLOW} stopOpacity="0" />
              </linearGradient>
              <clipPath id="wacsp-wc">
                <polygon points={W_PTS} />
              </clipPath>
            </defs>
            <polygon points={W_PTS} fill="url(#wacsp-wg)" stroke="url(#wacsp-wg)" strokeWidth="8" strokeLinejoin="round" />
            <polygon className="wac-splash__flash" points={W_PTS} fill={FACE_YELLOW} stroke={FACE_YELLOW} strokeWidth="8" strokeLinejoin="round" />
            <g clipPath="url(#wacsp-wc)">
              <rect className="wac-splash__shine" x="-240" y="280" width="200" height="460" fill="url(#wacsp-sg)" />
            </g>
            <g transform="translate(762,332)">
              <path className="wac-splash__spark" d="M0,-70 C7,-12 12,-7 70,0 C12,7 7,12 0,70 C-7,12 -12,7 -70,0 C-12,-7 -7,-12 0,-70Z" fill="#FFF1B8" />
            </g>
          </svg>
          <img className="wac-splash__m wac-splash__m--left" src={mascotGreen} alt="" draggable="false" />
          <img className="wac-splash__m wac-splash__m--right" src={mascotPink} alt="" draggable="false" />
        </div>
      </div>
      <div className="wac-splash__dots"><i /><i /><i /></div>
    </div>
  );
}
