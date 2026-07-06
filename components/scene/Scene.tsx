"use client";
import { useRef, useState } from "react";
import { SPOTS, Spot, SpotId, ROOM_IMG } from "@/lib/spots";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { Hotspot } from "./Hotspot";
import { LoginIntro } from "./LoginIntro";
import { ObjectScreen } from "./ObjectScreen";

/**
 * 방 씬.
 * - 진입: 방은 어둡고 핸드폰만 빛남 → 핸드폰 줌인 → 로그인 → 방 밝아짐
 * - 로그인 후: 오브젝트 클릭 → 방 위에 새 화면(ObjectScreen)이 뜸. 방 자체는 확대 안 함
 *   (참고 구조: 방=배경판+가구 스티커 / 오브젝트 화면=또 다른 배경판+개별 물체 스티커).
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
    // 외부 링크 스팟(예: 피규어 → 르네 트위터): 화면을 열지 않고 새 탭으로 이동
    if (spot.href) {
      window.open(spot.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (spot.id === "phone" && !entered) {
      // 로그인 연출: 핸드폰으로 줌인 (이것만 카메라 이동. 나머지는 새 화면을 위에 띄움)
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

  // Esc로 현재 화면 닫고 방으로 돌아가기 (로그인 폼이든 오브젝트 화면이든)
  useEscapeToClose(close, active !== null);

  return (
    <main className="fixed inset-0 overflow-hidden flex items-center justify-center bg-room-ambient">
      {/* scene */}
      <div
        ref={sceneRef}
        style={{ transform, transitionProperty: "transform", transitionDuration: "0.85s" }}
        className="relative shrink-0 w-[min(100vw,100vh)] aspect-square ease-camera"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ROOM_IMG} alt="My room (sketch)" className="block w-full h-full select-none" draggable={false} />

        {/* 방 아트 위에 얹는 오브젝트 사진 (예: 액자 속 사진).
            사진이 놓일 자리에 딱 맞는 투명 박스(div)를 액자 기울기(rotate)에 맞춰 띄우고,
            그 안에 이미지를 object-cover로 채워 넣는다(넘치는 부분은 박스가 클립).
            방 배경의 일부처럼 어둠 레이어 아래에 두어 로그인 연출과 함께 밝아짐.
            클릭은 위에 겹친 Hotspot 버튼이 받으므로 여기선 pointer-events 없음. */}
        {SPOTS.map((s) =>
          s.overlay ? (
            <div
              key={`overlay-${s.id}`}
              aria-hidden
              style={{
                left: `${s.overlay.left}%`,
                top: `${s.overlay.top}%`,
                width: `${s.overlay.width}%`,
                height: `${s.overlay.height}%`,
                transform: `rotate(${s.overlay.rotate ?? 0}deg)`,
              }}
              className="absolute overflow-hidden pointer-events-none select-none shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.overlay.src}
                alt=""
                draggable={false}
                className="block w-full h-full object-cover select-none"
              />
            </div>
          ) : null
        )}

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
              // 오버레이 사진이 있는 스팟(액자)은 빈 프레임 복제 팝이 사진을 덮으므로 끔
              pop={entered && !s.overlay}
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
