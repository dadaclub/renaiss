"use client";
import { useEffect, useRef, useState } from "react";
import { SPOTS, Spot, SpotId, ROOM_IMG } from "@/lib/spots";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { Hotspot } from "./Hotspot";
import { LoginIntro } from "./LoginIntro";
import { ObjectScreen } from "./ObjectScreen";
import { OverlayEditor } from "./OverlayEditor";
import { OverlayQuad } from "./OverlayQuad";

/**
 * 방 씬.
 * - 진입: 방은 어둡고 핸드폰만 빛남 → 핸드폰 줌인 → 로그인 → 방 밝아짐
 * - 로그인 후: 오브젝트 클릭 → 방 위에 새 화면(ObjectScreen)이 뜸. 방 자체는 확대 안 함
 *   (참고 구조: 방=배경판+가구 스티커 / 오브젝트 화면=또 다른 배경판+개별 물체 스티커).
 * - 핸드폰(로그인 후): 로그아웃 화면.
 */
export function Scene() {
  // entered = 스플래시를 탭해 방으로 입장(밝아짐). loggedIn = 방 안에서 폰을 눌러 로그인 완료.
  // 입장했지만 로그인 전엔 폰만 클릭 가능(로그인 게이트), 로그인해야 나머지 오브젝트가 열린다.
  const [entered, setEntered] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState<SpotId | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(""); // 로그인 연출(폰 줌)에만 사용
  // 개발용: ?edit 쿼리로 오버레이(액자 사진) 위치·크기·기울기를 직접 드래그해 맞추는 편집기
  const [edit, setEdit] = useState(false);
  const [editSpotId, setEditSpotId] = useState<SpotId>("photo"); // 편집기에서 치수 재는 대상 스팟
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("edit")) {
      setEdit(true);
      setEntered(true); // 편집 중엔 스플래시/로그인 건너뛰고 밝은 방 바로 표시
      setLoggedIn(true); // 편집 중엔 모든 오브젝트 활성화
    }
  }, []);

  const select = (spot: Spot) => {
    // 외부 링크 스팟(예: 피규어 → 르네 트위터): 화면을 열지 않고 새 탭으로 이동
    if (spot.href) {
      window.open(spot.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (spot.id === "phone" && !loggedIn) {
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
    setLoggedIn(true);
    close();
  };

  const logout = () => {
    setLoggedIn(false);
    setEntered(false);
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
            액자 개구부 네 꼭짓점(corners)에 맞춰 원근(matrix3d)으로 사진을 끼워 넣는다.
            방 배경의 일부처럼 어둠 레이어 아래에 두어 로그인 연출과 함께 밝아짐.
            클릭은 위에 겹친 Hotspot 버튼이 받으므로 여기선 pointer-events 없음. */}
        {SPOTS.map((s) =>
          // 편집 중인 오버레이는 정적 렌더를 건너뛰고 OverlayEditor가 대신 그린다
          s.overlay && !(edit && s.id === editSpotId) ? (
            <OverlayQuad
              key={`overlay-${s.id}`}
              src={s.overlay.src}
              corners={s.overlay.corners}
              sceneRef={sceneRef}
              className="shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            />
          ) : null
        )}

        {/* 로그인 전: 방 전체를 은은히 어둡게 (스플래시 비네트와 함께 무드 형성. 입장하면 페이드아웃) */}
        <div
          className={`absolute inset-0 bg-[rgba(6,4,3,0.5)] transition-opacity duration-[900ms] pointer-events-none ${
            entered ? "opacity-0" : "opacity-100"
          }`}
        />

        {SPOTS.map((s) => {
          const isPhone = s.id === "phone";
          // 로그인 전엔 폰만(로그인 게이트), 로그인 후엔 전부. 화면 열림(active) 중엔 잠금.
          const enabled = (loggedIn ? true : isPhone) && !active && !edit;
          return (
            <Hotspot
              key={s.id}
              spot={s}
              disabled={!enabled}
              // 오버레이 사진이 있는 스팟(액자)은 빈 프레임 복제 팝이 사진을 덮으므로 끔
              pop={entered && !s.overlay}
              onSelect={select}
            />
          );
        })}

        {/* 개발용 오버레이 편집기 (?edit) — 아무 스팟이나 네 꼭짓점을 드래그해 치수 확정.
            key로 스팟 전환 시 편집기를 리마운트해 상태를 새 스팟 값으로 초기화. */}
        {edit && (
          <OverlayEditor
            key={editSpotId}
            spotId={editSpotId}
            onSpotChange={setEditSpotId}
            sceneRef={sceneRef}
          />
        )}
      </div>

      {/* 진입 스플래시 — 어둡게 깔린 방 위 브랜딩 + 비네트. 화면 아무 곳이나 탭하면 방으로 입장(밝아짐).
          로그인은 방 안에서 폰을 눌러야 진행된다. 입장(entered)하면 페이드아웃한다. */}
      {!edit && (
        <button
          type="button"
          onClick={() => setEntered(true)}
          aria-label="Tap to enter the room"
          className={`absolute inset-0 z-40 flex flex-col items-center justify-center text-center transition-opacity duration-[900ms] ${
            entered || active ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          style={{
            background:
              "radial-gradient(ellipse 72% 55% at 50% 44%, rgba(4,3,6,0) 0%, rgba(4,3,6,0.5) 62%, rgba(2,1,3,0.92) 100%), linear-gradient(to bottom, rgba(2,1,3,0.96) 0%, rgba(2,1,3,0) 24%, rgba(2,1,3,0) 76%, rgba(2,1,3,0.96) 100%)",
          }}
        >
          <span className="text-amber text-[11px] font-semibold uppercase tracking-[0.42em]">
            Card Scene
          </span>
          <span className="mt-3 text-cream font-serif text-5xl leading-none">카드씬</span>
          <span className="mt-6 text-creamdim/80 text-sm tracking-wide animate-tap-hint motion-reduce:animate-none">
            화면을 탭해서 내 방으로 입장하기
          </span>
        </button>
      )}

      {/* 로그인 폼 — 방 안에서 폰을 눌렀을 때(로그인 전). 열면 바로 Authorize, Cancel은 방으로 */}
      {!loggedIn && active === "phone" && <LoginIntro onLogin={login} onCancel={close} />}

      {/* 오브젝트 새 화면 (로그인 후) */}
      {loggedIn && active && <ObjectScreen spot={active} onClose={close} onLogout={logout} />}
    </main>
  );
}
