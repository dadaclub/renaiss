"use client";
import { useEffect, useRef, useState } from "react";
import { SPOTS, Spot, SpotId, ROOM_IMG, PHONE_GLOW } from "@/lib/spots";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { Hotspot } from "./Hotspot";
import { LoginIntro } from "./LoginIntro";
import { ObjectScreen } from "./ObjectScreen";
import { OverlayEditor } from "./OverlayEditor";

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
  // 개발용: ?edit 쿼리로 오버레이(액자 사진) 위치·크기·기울기를 직접 드래그해 맞추는 편집기
  const [edit, setEdit] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("edit")) {
      setEdit(true);
      setEntered(true); // 편집 중엔 로그인 연출 건너뛰고 밝은 방 바로 표시
    }
  }, []);

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
            사진이 놓일 자리에 딱 맞는 투명 박스(div)를 액자 기울기(skewY)에 맞춰 띄우고,
            그 안에 이미지를 object-cover로 채워 넣는다(넘치는 부분은 박스가 클립).
            방 배경의 일부처럼 어둠 레이어 아래에 두어 로그인 연출과 함께 밝아짐.
            클릭은 위에 겹친 Hotspot 버튼이 받으므로 여기선 pointer-events 없음. */}
        {SPOTS.map((s) =>
          // 편집 중인 오버레이는 정적 렌더를 건너뛰고 OverlayEditor가 대신 그린다
          s.overlay && !(edit && s.id === "photo") ? (
            <div
              key={`overlay-${s.id}`}
              aria-hidden
              style={{
                left: `${s.overlay.left}%`,
                top: `${s.overlay.top}%`,
                width: `${s.overlay.width}%`,
                height: `${s.overlay.height}%`,
                transform: `skewY(${s.overlay.skewY ?? 0}deg)`,
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

        {/* 로그인 전 — 어둠 속에서 켜진 핸드폰 화면 불빛 (클릭영역과 별개, PHONE_GLOW 좌표).
            ① 화면 사각형(폰 기울기만큼 회전) ② 그 빛이 바닥으로 번지는 블룸 */}
        {!entered && !edit && (
          <div
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              left: `${PHONE_GLOW.left}%`,
              top: `${PHONE_GLOW.top}%`,
              width: `${PHONE_GLOW.width}%`,
              height: `${PHONE_GLOW.height}%`,
            }}
          >
            <span className="absolute left-1/2 top-1/2 w-[360%] h-[170%] rounded-full mix-blend-screen blur-[13px] animate-phone-bloom motion-reduce:animate-none bg-[radial-gradient(ellipse_at_center,rgba(206,224,255,0.5),rgba(150,185,255,0.22)_38%,transparent_70%)]" />
            <span
              className="absolute inset-0 rounded-[2px] mix-blend-screen blur-[1px] animate-phone-screen motion-reduce:animate-none bg-[linear-gradient(155deg,rgba(242,248,255,0.96),rgba(194,216,255,0.78))]"
              style={{ transform: `rotate(${PHONE_GLOW.rotate}deg)` }}
            />
          </div>
        )}

        {SPOTS.map((s, i) => {
          const isPhone = s.id === "phone";
          // 로그인 전엔 핸드폰만, 로그인 후엔 전부. 화면 열림(active) 중엔 잠금.
          const enabled = (entered ? true : isPhone) && !active && !edit;
          return (
            <Hotspot
              key={s.id}
              spot={s}
              disabled={!enabled}
              introDelay={intro ? i * INTRO_STAGGER : null}
              // 오버레이 사진이 있는 스팟(액자)은 빈 프레임 복제 팝이 사진을 덮으므로 끔
              pop={entered && !s.overlay}
              onSelect={select}
            />
          );
        })}

        {/* 개발용 오버레이 편집기 (?edit) — 액자 사진을 직접 드래그/리사이즈해 값 확정 */}
        {edit &&
          (() => {
            const o = SPOTS.find((s) => s.id === "photo")?.overlay;
            return o ? (
              <OverlayEditor
                src={o.src}
                initial={{
                  left: o.left,
                  top: o.top,
                  width: o.width,
                  height: o.height,
                  skewY: o.skewY ?? 0,
                }}
                sceneRef={sceneRef}
              />
            ) : null;
          })()}
      </div>

      {/* 로그인 폼 (핸드폰 줌인 상태) — 열면 바로 Authorize, Cancel은 방으로 */}
      {!entered && active === "phone" && <LoginIntro onLogin={login} onCancel={close} />}

      {/* 오브젝트 새 화면 (로그인 후) */}
      {entered && active && <ObjectScreen spot={active} onClose={close} onLogout={logout} />}
    </main>
  );
}
