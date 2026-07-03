"use client";
import { SpotId } from "@/lib/spots";
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
      <ScreenShell title="Renaiss Wallet" onClose={onClose}>
        <button
          onClick={onLogout}
          className="mt-1 bg-amber text-inkdark font-bold rounded-xl px-7 py-3 text-sm hover:brightness-110 transition"
        >
          Log out
        </button>
      </ScreenShell>
    );
  }

  const Screen = SCREENS[spot];
  if (!Screen) return null;
  return <Screen onClose={onClose} />;
}
