"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SPOTS, Spot, SpotId, ROOM_IMG_DARK, ROOM_IMG_BRIGHT } from "@/lib/spots";
import { getRoom, HOME_ROOM_ID } from "@/lib/rooms";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { useAvatar } from "@/lib/useAvatar";
import { BackgroundMusic } from "./BackgroundMusic";
import { ClickSound } from "./ClickSound";
import { Hotspot } from "./Hotspot";
import { LoginIntro } from "./LoginIntro";
import { ObjectScreen } from "./ObjectScreen";
import { OverlayEditor } from "./OverlayEditor";
import { OverlayQuad } from "./OverlayQuad";
import { RoomProvider } from "./RoomContext";
import { SnackHoverSound } from "./SnackHoverSound";
import { SnackCrumble } from "./SnackCrumble";
import { ArrowLeft } from "@phosphor-icons/react";

/** 프로필 배지 아바타 — 유저 UUID로 Renaiss 프로필의 avatarUrl을 동적 조회(useAvatar).
 *  이미지가 없거나 로드 실패(예: 죽은 URL)하면 닉네임 첫 글자로 대체.
 *  (방마다 유저가 다르므로 Scene에서 key={room.id}로 감싸 broken 상태를 리셋한다.) */
function RoomAvatar({ name, userId }: { name: string; userId?: string }) {
  const [broken, setBroken] = useState(false);
  const url = useAvatar(userId);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="w-5 h-5 sm:w-7 sm:h-7 grid place-items-center rounded-full overflow-hidden bg-inkdark border border-amber/40 shrink-0">
      {url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" draggable={false} onError={() => setBroken(true)} className="w-full h-full object-cover" />
      ) : (
        <span className="text-amber font-bold text-[9px] sm:text-[11px] leading-none">{initial}</span>
      )}
    </span>
  );
}

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
  const [crumbleKey, setCrumbleKey] = useState(0); // 과자봉지 클릭 시마다 증가 → SnackCrumble 구겨짐 재생
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
  // 방은 로그인 성공(loggedIn) 후에 밝아진다 — 그 전(입장~폰 울림~로그인 화면)엔 room_dark,
  // 성공 시 room_bright로 크로스페이드. 로그아웃하면 다시 어두워지고, 로그인 성공은 그 반대(대칭 페이드).
  const roomBright = loggedIn || isVisiting;
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
    // 과자봉지 = 화면 없는 이스터에그. 클릭하면 구겨지는 연출만 트리거하고 화면은 안 연다.
    if (spot.id === "snack") {
      setCrumbleKey((k) => k + 1);
      return;
    }
    // 로그인 연출은 카메라 줌 없이 — 폰 클릭 시 위에 로그인 모달만 뜨고, 승인하면 방이 밝아진다.
    // (예전엔 폰으로 줌인했는데 모달이 그걸 가려서, 승인 후 줌아웃만 보여 어색했음)
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
      <div className="relative shrink-0 w-[min(100vw,calc(100vh*1280/714))] aspect-[1280/714] overflow-hidden">
      {/* 카메라 = 폰 로그인 줌 대상. 프레임이 클립하므로 줌이 정사각형 밖으로 안 넘친다. */}
      <div
        ref={sceneRef}
        style={{ transform, transitionProperty: "transform", transitionDuration: "0.85s" }}
        className="absolute inset-0 ease-camera"
      >
        {/* 방 배경 — 두 버전 크로스페이드. 어두운 방을 베이스로 깔고, 밝아지면(roomBright) 밝은 방을 페이드인.
            둘 다 항상 DOM에 있어 프리로드됨 → 전환 시 로딩 깜빡임 없음. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ROOM_IMG_DARK} alt="My room" className="absolute inset-0 w-full h-full select-none" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ROOM_IMG_BRIGHT}
          alt=""
          aria-hidden
          draggable={false}
          className={`absolute inset-0 w-full h-full select-none transition-opacity duration-[900ms] ${
            roomBright ? "opacity-100" : "opacity-0"
          }`}
        />

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

        {SPOTS.map((s) => {
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
              onHover={(sp, h) => setHovered(h ? sp.id : (cur) => (cur === sp.id ? null : cur))}
              onSelect={select}
            />
          );
        })}

        {/* 과자봉지 호버 시 비닐 부스럭 소리 + 클릭 시 구겨짐 연출 */}
        <SnackHoverSound active={objectsReady && !active && hovered === "snack"} />
        <SnackCrumble trigger={crumbleKey} />

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
            <span className="absolute left-4 bottom-4 sm:left-9 sm:bottom-9 flex flex-col items-start">
              <span className="text-cream font-serif text-2xl sm:text-5xl leading-none">CardScene</span>
              <span className="mt-1.5 sm:mt-2.5 text-creamdim text-xs sm:text-sm">
                A room for your TCG collection.
              </span>
              <span className="mt-2 sm:mt-4 text-amber text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.22em] animate-tap-hint motion-reduce:animate-none">
                Tap anywhere to step inside
              </span>
            </span>
          </button>
        )}

        {/* 방문 배너 — 방 이미지 상단 중앙 */}
        {isVisiting && (
          <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 bg-glass border border-glassline text-cream text-[10px] sm:text-xs font-bold px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full backdrop-blur-md whitespace-nowrap">
            <span>
              Visiting <span className="text-amber">{room.ownerName}</span>&apos;s room
            </span>
            <span className="w-px h-3.5 sm:h-4 bg-glassline" aria-hidden />
            <button
              onClick={() => visitRoom(HOME_ROOM_ID)}
              aria-label="Back to my room"
              className="inline-flex items-center gap-1 hover:text-amber transition-colors"
            >
              <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" weight="bold" aria-hidden />
              <span className="hidden sm:inline">Back to my room</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>
        )}

        {/* 프로필 배지 — 방 이미지 우하단, 스피커 버튼 옆. 아바타 + 닉네임만. */}
        {objectsReady && !active && !edit && (
          <div className="absolute bottom-3 right-12 sm:bottom-5 sm:right-16 z-30 flex items-center gap-1.5 sm:gap-2 h-7 sm:h-9 pl-0.5 pr-2 sm:pl-1 sm:pr-3 rounded-full bg-glass border border-glassline backdrop-blur-md">
            <RoomAvatar key={room.id} name={room.ownerName} userId={room.renaissUser} />
            <span className="text-cream text-[10px] sm:text-xs font-bold">{room.ownerName}</span>
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
