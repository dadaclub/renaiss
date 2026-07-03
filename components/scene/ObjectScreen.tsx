"use client";
import { SpotId } from "@/lib/spots";

/**
 * 오브젝트 클릭 시 뜨는 새 전체화면. (줌 대신 화면 전환)
 * 지금은 플레이스홀더 — 사진/콘텐츠는 나중에 첨부.
 * phone = 로그아웃 화면.
 */
const TITLES: Record<SpotId, string> = {
  cabinet: "Card Collection",
  computer: "Computer",
  window: "Window",
  photo: "Photo",
  album: "Album",
  phone: "Renaiss Wallet",
};

export function ObjectScreen({
  spot,
  onClose,
  onLogout,
}: {
  spot: SpotId;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[radial-gradient(ellipse_75%_75%_at_50%_40%,#1a1233,#0a0716_65%,#050409)]">
      <button
        onClick={onClose}
        className="fixed top-6 left-6 z-10 bg-glass border border-glassline text-cream text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-md hover:border-amber hover:text-amber transition-colors"
      >
        ← Back to room
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6">
        <h2 className="font-hand text-[40px] text-cream text-center">{TITLES[spot]}</h2>

        {spot === "phone" ? (
          <button
            onClick={onLogout}
            className="mt-1 bg-amber text-inkdark font-bold rounded-xl px-7 py-3 text-sm hover:brightness-110 transition"
          >
            Log out
          </button>
        ) : (
          <div className="w-[min(82vw,680px)] aspect-[16/10] rounded-2xl border-2 border-dashed border-glassline flex items-center justify-center text-creamdim text-sm">
            Image coming soon
          </div>
        )}
      </div>
    </div>
  );
}
