"use client";
import { useRef, useState } from "react";
import { SPOTS, Spot, SpotId, ROOM_IMG } from "@/lib/spots";
import { Hotspot } from "./Hotspot";
import { LoginIntro } from "./LoginIntro";
import { ObjectScreen } from "./ObjectScreen";

/**
 * 방 씬.
 * - 진입: 방은 어둡고 핸드폰만 빛남 → 핸드폰 줌인 → 로그인 → 방 밝아짐
 * - 로그인 후: 오브젝트 클릭 → 새 전체화면(ObjectScreen). 카메라 줌 없음.
 * - 핸드폰(로그인 후): 로그아웃 화면.
 */
export function Scene() {
  const [entered, setEntered] = useState(false);
  const [active, setActive] = useState<SpotId | null>(null);
  const [intro, setIntro] = useState(false); // 입장 온보딩 — 핫스팟 순차 반짝
  const sceneRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(""); // 로그인 연출(폰 줌)에만 사용

  const INTRO_START = 900; // 방 밝아지는 시간과 동기화
  const INTRO_STAGGER = 0.18; // 스팟당 딜레이(초)
  const INTRO_GLOW = 900; // glow-once 애니메이션 길이(ms)

  const select = (spot: Spot) => {
    if (spot.id === "phone" && !entered) {
      // 로그인 연출: 핸드폰으로 줌인
      const el = sceneRef.current;
      if (el) {
        const { cx, cy, scale } = spot.zoom;
        const dx = (0.5 - cx) * el.offsetWidth * scale;
        const dy = (0.5 - cy) * el.offsetHeight * scale;
        setTransform(`translate(${dx}px, ${dy}px) scale(${scale})`);
      }
    }
    setActive(spot.id);
  };

  const close = () => {
    setActive(null);
    setTransform("");
  };

  const login = () => {
    setEntered(true);
    close();
    // 방이 밝아진 뒤 핫스팟을 순서대로 한 번씩 반짝여 위치를 알려줌
    setTimeout(() => setIntro(true), INTRO_START);
    setTimeout(
      () => setIntro(false),
      INTRO_START + SPOTS.length * INTRO_STAGGER * 1000 + INTRO_GLOW
    );
  };

  const logout = () => {
    setEntered(false);
    setIntro(false);
    close();
  };

  return (
    <main className="fixed inset-0 overflow-hidden flex items-center justify-center bg-[radial-gradient(ellipse_75%_75%_at_50%_45%,#1a1233,#0a0716_62%,#050409)]">
      {/* scene */}
      <div
        ref={sceneRef}
        style={{ transform, transitionProperty: "transform", transitionDuration: "0.85s" }}
        className="relative shrink-0 w-[min(100vw,100vh)] aspect-square ease-camera"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ROOM_IMG} alt="My room (sketch)" className="block w-full h-full select-none" draggable={false} />

        {/* 로그인 전: 방 전체 어둡게 (핸드폰만 빛남) */}
        <div
          className={`absolute inset-0 bg-[rgba(4,3,12,0.86)] transition-opacity duration-[900ms] pointer-events-none ${
            entered ? "opacity-0" : "opacity-100"
          }`}
        />

        {SPOTS.map((s, i) => {
          const isPhone = s.id === "phone";
          // 로그인 전엔 핸드폰만, 로그인 후엔 전부. 화면 열림(active) 중엔 잠금.
          const enabled = (entered ? true : isPhone) && !active;
          return (
            <Hotspot
              key={s.id}
              spot={s}
              disabled={!enabled}
              highlight={isPhone && !entered && !active}
              introDelay={intro ? i * INTRO_STAGGER : null}
              onSelect={select}
            />
          );
        })}
      </div>

      {/* 로그인 폼 (핸드폰 줌인 상태) */}
      {!entered && active === "phone" && <LoginIntro onLogin={login} />}

      {/* 오브젝트 새 화면 (로그인 후) */}
      {entered && active && <ObjectScreen spot={active} onClose={close} onLogout={logout} />}
    </main>
  );
}
