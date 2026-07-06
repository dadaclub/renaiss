"use client";
import { ReactNode } from "react";

/**
 * 오브젝트 화면 공통 뼈대 (뒤로가기 버튼 + 제목 + 콘텐츠 슬롯).
 * ⚠️ 공유 파일 — 오브젝트 담당자는 이 파일을 수정하지 마세요. 자기 *Screen.tsx만 편집.
 */
export function ScreenShell({
  title,
  onClose,
  children,
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
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
        {title && <h2 className="font-hand text-[40px] text-cream text-center">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
