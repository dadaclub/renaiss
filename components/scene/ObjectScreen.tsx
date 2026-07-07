"use client";
import { SpotId } from "@/lib/spots";
import { MOCK_ACCOUNT } from "./LoginIntro";
import { ScreenShell } from "./screens/ScreenShell";
import { SCREENS } from "./screens/registry";

/**
 * 오브젝트 클릭 시 뜨는 전체화면 디스패처.
 * - phone = 로그아웃 (뼈대 소유)
 * - 그 외 = screens/registry 에 등록된 담당자 화면
 * ⚠️ 뼈대 파일 — 개별 오브젝트 작업은 screens/*Screen.tsx 에서.
 */
export function ObjectScreen({
  spot,
  onClose,
  onLogout,
}: {
  spot: SpotId;
  onClose: () => void;
  onLogout: () => void;
}) {
  if (spot === "phone") {
    return (
      <ScreenShell title="Renaiss account" onClose={onClose}>
        {/* 연결된 르네시스 계정 (소셜 연동 테마와 통일 — 아이디/비번 없음) */}
        <div className="w-[300px] rounded-[2rem] bg-[#0e0b1a] border border-glassline shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-white border border-amber/40 overflow-hidden mb-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/renaiss-logo.jpg" alt="Renaiss" className="w-full h-full object-contain p-1.5" />
          </div>
          <div className="text-[10px] tracking-[0.32em] text-amber font-bold uppercase">Renaiss</div>
          <div className="text-cream font-serif text-2xl mt-1">Connected</div>
          <div className="text-creamdim/70 text-[11px] font-mono mt-2">{MOCK_ACCOUNT}</div>
          <button
            onClick={onLogout}
            className="mt-6 w-full border border-glassline text-cream rounded-xl py-2.5 text-sm font-bold hover:border-amber hover:text-amber transition-colors"
          >
            Log out
          </button>
        </div>
      </ScreenShell>
    );
  }

  const Screen = SCREENS[spot];
  if (!Screen) return null;
  return <Screen onClose={onClose} />;
}
