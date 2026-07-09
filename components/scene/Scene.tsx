"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SPOTS, Spot, SpotId, ROOM_IMG } from "@/lib/spots";
import { getRoom, HOME_ROOM_ID } from "@/lib/rooms";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { BackgroundMusic } from "./BackgroundMusic";
import { ClickSound } from "./ClickSound";
import { Hotspot } from "./Hotspot";
import { LoginIntro } from "./LoginIntro";
import { ObjectScreen } from "./ObjectScreen";
import { OverlayEditor } from "./OverlayEditor";
import { OverlayQuad } from "./OverlayQuad";
import { RoomProvider } from "./RoomContext";
import { SnackHoverSound } from "./SnackHoverSound";
import { ArrowLeft } from "@phosphor-icons/react";

/**
 * 방 씬.
 * - 진입: 방은 어둡고 핸드폰만 빛남 → 핸드폰 줌인 → 로그인 → 방 밝아짐
 * - 로그인 후: 오브젝트 클릭 → 방 위에 새 화면(ObjectScreen)이 뜸. 방 자체는 확대 안 함
 *   (참고 구조: 방=배경판+가구 스티커 / 오브젝트 화면=또 다른 배경판+개별 물체 스티커).
 * - 핸드폰(로그인 후): 로그아웃 화면.
 * - 방문(?room=<id>): 방명록에서 다른 유저를 누르면 그 방으로. 읽기 전용(편집 숨김),
 *   로그인 게이트 건너뛰고 바로 밝은 방. SBT·카드는 그 방 주인 것으로 로드.
 */
export function Scene() {
  // entered = 스플래시를 탭해 방으로 입장(밝아짐). loggedIn = 방 안에서 폰을 눌러 로그인 완료.
  const [entered, setEntered] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState<SpotId | null>(null);
  const [hovered, setHovered] = useState<SpotId | null>(null); // 호버 중인 스팟 — 오버레이(액자 사진) pop용
  // 현재 보고 있는 방 — SSR 안전 기본 홈, 마운트 후 URL ?room= 반영 (하이드레이션 일치)
  const [roomId, setRoomId] = useState<string>(HOME_ROOM_ID);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(""); // 로그인 연출(폰 줌)에만 사용
  // 개발용: ?edit 쿼리로 오버레이(액자 사진) 위치·크기·기울기를 직접 드래그해 맞추는 편집기
  const [edit, setEdit] = useState(false);
  const [editSpotId, setEditSpotId] = useState<SpotId>("photo"); // 편집기에서 치수 재는 대상 스팟
  // 방 이동 연출 — 화면을 덮고 팩맨이 점 먹는 로딩을 보여준 뒤 새 방을 드러냄
  const [moving, setMoving] = useState(false);
  // 모바일이면 오브젝트 화면을 body로 포탈(전체화면), 데스크톱이면 방 정사각 안에 컨테인.
  // (SSR/초기값 false=데스크톱 — 오브젝트 화면은 클릭 후에만 뜨므로 그땐 이미 판정됨)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const room = getRoom(roomId);
  const isVisiting = roomId !== HOME_ROOM_ID;
  // 방문 중엔 스플래시/로그인 없이 바로 밝은 방 + 오브젝트 열람(읽기 전용)
  // 방은 스플래시를 탭해 입장(entered)하면 밝아진다 — 밝은 방에서 폰만 울리며 로그인을 유도.
  // 로그인 취소해도 밝은 방(폰은 계속 울림)으로 남는다.
  // 오브젝트 조작(호버 효과 포함)은 로그인 후(loggedIn/방문)부터.
  const roomBright = entered || isVisiting;
  const objectsReady = loggedIn || isVisiting;

  // URL ?room= 를 상태에 반영 (마운트 + 뒤로가기)
  useEffect(() => {
    const sync = () => {
      const p = new URLSearchParams(window.location.search);
      if (p.has("edit")) {
        setEdit(true);
        setEntered(true); // 편집 중엔 스플래시/로그인 건너뛰고 밝은 방 바로 표시
        setLoggedIn(true); // 편집 중엔 모든 오브젝트 활성화
      }
      setRoomId(getRoom(p.get("room")).id);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // 방 이동 — 커버 페이드인 → (가려진 채) 방 교체 → 페이드아웃. 공유 URL도 갱신.
  const visitRoom = useCallback((id: string) => {
    const target = getRoom(id);
    setActive(null);
    setTransform("");
    setMoving(true);
    // 커버가 화면을 덮은 뒤 방을 바꾼다 (전환이 안 보이게)
    window.setTimeout(() => {
      setRoomId(target.id);
      const url = target.id === HOME_ROOM_ID ? "/" : `/?room=${target.id}`;
      window.history.pushState({}, "", url);
    }, 900);
    // 새 방을 드러내며 커버 페이드아웃 (총 ~2.2초)
    window.setTimeout(() => setMoving(false), 1950);
  }, []);

  const select = (spot: Spot) => {
    // 외부 링크 스팟(예: 피규어 → 르네 트위터): 화면을 열지 않고 새 탭으로 이동
    if (spot.href) {
      window.open(spot.href, "_blank", "noopener,noreferrer");
      return;
    }
    // 방문 중 폰은 비활성 (홈 계정 로그아웃은 내 방에서만)
    if (spot.id === "phone" && isVisiting) return;
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
    <RoomProvider value={{ room, isOwnRoom: !isVisiting, visitRoom }}>
    <main className="fixed inset-0 overflow-hidden flex items-center justify-center bg-room-ambient">
      {/* 프레임 = 방 이미지 정사각형. overflow-hidden으로 줌·오브젝트 화면을 이 안에 가둔다
          (정사각형 밖 검은 여백으론 절대 안 넘침). */}
      <div className="relative shrink-0 w-[min(100vw,100vh)] aspect-square overflow-hidden">
      {/* 카메라 = 폰 로그인 줌 대상. 프레임이 클립하므로 줌이 정사각형 밖으로 안 넘친다. */}
      <div
        ref={sceneRef}
        style={{ transform, transitionProperty: "transform", transitionDuration: "0.85s" }}
        className="absolute inset-0 ease-camera"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ROOM_IMG} alt="My room (sketch)" className="block w-full h-full select-none" draggable={false} />

        {/* 방 아트 위에 얹는 오브젝트 사진 (예: 액자 속 사진). */}
        {SPOTS.map((s) =>
          s.overlay && !(edit && s.id === editSpotId) ? (
            <OverlayQuad
              key={`overlay-${s.id}`}
              src={s.overlay.src}
              corners={s.overlay.corners}
              sceneRef={sceneRef}
              hovered={objectsReady && !active && hovered === s.id}
              className="shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            />
          ) : null
        )}

        {/* 로그인 전: 방 전체를 은은히 어둡게 (입장/방문하면 페이드아웃) */}
        <div
          className={`absolute inset-0 bg-[rgba(6,4,3,0.5)] transition-opacity duration-[900ms] pointer-events-none ${
            roomBright ? "opacity-0" : "opacity-100"
          }`}
        />

        {SPOTS.map((s, i) => {
          const isPhone = s.id === "phone";
          // 로그인 전엔 폰만(로그인 게이트), 로그인/방문 후엔 전부. 화면 열림(active) 중엔 잠금.
          // 방문 중엔 폰 제외(홈 계정 전용).
          const enabled =
            (isVisiting ? !isPhone : objectsReady ? true : isPhone) && !active && !edit;
          return (
            <Hotspot
              key={s.id}
              spot={s}
              disabled={!enabled}
              // 호버 효과(팝·호버 글로우)는 로그인 후에만 — 밝은 방이라도 로그인 전 폰엔 호버 글로우를 안 얹는다
              pop={objectsReady && !s.overlay}
              // 폰 진동 유도 — 내 방 로그인 전에만
              ring={isPhone && entered && !loggedIn && !active && !isVisiting}
              // 로그인 직후 웨이크 글로우 — 내 방에서만
              wake={loggedIn && !isVisiting}
              wakeDelay={i * 0.12}
              onHover={(sp, h) => setHovered(h ? sp.id : (cur) => (cur === sp.id ? null : cur))}
              onSelect={select}
            />
          );
        })}

        <SnackHoverSound active={objectsReady && !active} />

        {edit && (
          <OverlayEditor
            key={editSpotId}
            spotId={editSpotId}
            onSpotChange={setEditSpotId}
            sceneRef={sceneRef}
          />
        )}
      </div>
      {/* ↑ 카메라 끝. 아래는 프레임 직속 — 줌 안 되고 방 정사각형 기준으로 붙음. */}

      {/* 아래 요소들은 방 이미지 정사각형 기준으로 붙는다 (뷰포트 끝이 아니라 방 가장자리). */}

        {/* 진입 스플래시 — 내 방 첫 진입에만 (방문 중엔 없음). 방 이미지 위에 얹힘. */}
        {!edit && !isVisiting && (
          <button
            type="button"
            onClick={() => setEntered(true)}
            aria-label="Tap to enter the room"
            className={`absolute inset-0 z-40 block text-left transition-opacity duration-[900ms] ${
              entered || active ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(ellipse_70%_58%_at_50%_58%,theme(colors.bg/0%),theme(colors.bg/55%)_62%,theme(colors.bg/95%)),linear-gradient(to_bottom,theme(colors.bg/95%),theme(colors.bg/0%)_22%,theme(colors.bg/0%)_72%,theme(colors.bg/95%))]"
            />
            <span className="absolute left-6 bottom-6 sm:left-9 sm:bottom-9 flex flex-col items-start">
              <span className="text-cream font-serif text-4xl sm:text-5xl leading-none">CardScene</span>
              <span className="mt-2.5 text-creamdim text-sm">
                A room for your TCG collection.
              </span>
              <span className="mt-4 text-amber text-[11px] font-semibold uppercase tracking-[0.22em] animate-tap-hint motion-reduce:animate-none">
                Tap anywhere to step inside
              </span>
            </span>
          </button>
        )}

        {/* 방문 배너 — 방 이미지 상단 중앙 */}
        {isVisiting && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-glass border border-glassline text-cream text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-md">
            <span>
              Visiting <span className="text-amber">{room.ownerName}</span>&apos;s room
            </span>
            <span className="w-px h-4 bg-glassline" aria-hidden />
            <button
              onClick={() => visitRoom(HOME_ROOM_ID)}
              className="inline-flex items-center gap-1 hover:text-amber transition-colors"
            >
              <ArrowLeft size={13} weight="bold" aria-hidden />
              Back to my room
            </button>
          </div>
        )}

        {/* 프로필 배지 — 방 이미지 우하단, 스피커 버튼 옆. 아바타 + 닉네임만. */}
        {objectsReady && !active && !edit && (
          <div className="absolute bottom-5 right-16 z-30 flex items-center gap-2 h-9 pl-1 pr-3 rounded-full bg-glass border border-glassline backdrop-blur-md">
            <span className="w-7 h-7 rounded-full overflow-hidden bg-inkdark border border-amber/40 shrink-0">
              {room.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={room.avatarUrl} alt="" className="w-full h-full object-cover" draggable={false} />
              ) : null}
            </span>
            <span className="text-cream text-xs font-bold">{room.ownerName}</span>
          </div>
        )}

        {/* 배경음악/스피커 — 방 이미지 우하단 */}
        <BackgroundMusic active={objectsReady} />

        {/* 데스크톱: 오브젝트 화면을 프레임 안 + transform으로 방 정사각에 컨테인 (기존 룩 유지, 확대 방지).
            모바일 버전은 아래에서 body로 포탈. */}
        {active && !isMobile && (
          <div className="absolute inset-0 z-50" style={{ transform: "translateZ(0)" }}>
            {!isVisiting && !loggedIn && active === "phone" && (
              <LoginIntro onLogin={login} onCancel={close} />
            )}
            {objectsReady && <ObjectScreen spot={active} onClose={close} onLogout={logout} />}
          </div>
        )}

      </div>

      {/* 모바일: 오브젝트 화면을 body로 포탈해 프레임(overflow-hidden) 밖에 렌더.
          iOS 사파리는 overflow-hidden 조상이 position:fixed 자식을 클립하는 버그가 있어,
          프레임 안에 두면 정사각에 잘린다. body 직속이면 fixed inset-0 이 뷰포트 전체가 되어 안 잘림.
          RoomProvider 안이라 context는 유지됨. */}
      {active &&
        isMobile &&
        createPortal(
          <div className="fixed inset-0 z-[60]">
            {!isVisiting && !loggedIn && active === "phone" && (
              <LoginIntro onLogin={login} onCancel={close} />
            )}
            {objectsReady && <ObjectScreen spot={active} onClose={close} onLogout={logout} />}
          </div>,
          document.body
        )}

      {/* 전역 클릭음 — 모든 클릭 가능한 요소에 통일된 UI 클릭음 */}
      <ClickSound />

      {/* 방 이동 연출 — 화면을 덮고 팩맨이 점을 먹는 작은 로딩. 멘트 없음. */}
      <div
        aria-hidden={!moving}
        className={`fixed inset-0 z-[70] flex items-center justify-center bg-bg transition-opacity duration-300 ${
          moving ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* 팩맨(왼쪽, 입 짝짝) + 오른쪽에서 다가와 먹히는 점들. color=amber를 currentColor로 상속 */}
        <div className="relative w-[96px] h-6 text-amber" aria-hidden>
          <span className="pac absolute left-0 top-0.5" />
          {[0, 1, 2].map((i) => (
            <span key={i} className="pdot" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>
      </div>

      <style>{`
        .pac {
          width: 20px; height: 20px; background: currentColor; border-radius: 50%;
          animation: pac-chomp 0.45s linear infinite;
        }
        @keyframes pac-chomp {
          0%, 100% { clip-path: polygon(100% 25%, 45% 50%, 100% 75%, 100% 100%, 0 100%, 0 0, 100% 0); }
          50%      { clip-path: polygon(100% 48%, 45% 50%, 100% 52%, 100% 100%, 0 100%, 0 0, 100% 0); }
        }
        .pdot {
          position: absolute; top: 9px; width: 5px; height: 5px; border-radius: 50%;
          background: currentColor; animation: pac-eat 1.2s linear infinite;
        }
        @keyframes pac-eat {
          0%   { left: 92px; opacity: 1; }
          78%  { left: 24px; opacity: 1; }
          82%  { left: 22px; opacity: 0; }
          100% { left: 22px; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pac, .pdot { animation: none; }
        }
      `}</style>
    </main>
    </RoomProvider>
  );
}
