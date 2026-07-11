"use client";
import { ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { ROOM_IMG } from "@/lib/spots";
import { ViewportScale } from "@/components/ui/ViewportScale";

/**
 * 오브젝트 화면 공통 뼈대 (뒤로가기 버튼 + 콘텐츠 슬롯).
 * 배경 = 메인 방 디자인(흐린 방 이미지 + 딤) — 진열장 화면과 동일한 무드로 통일.
 * ⚠️ 공유 파일 — 오브젝트 담당자는 이 파일을 수정하지 마세요. 자기 *Screen.tsx만 편집.
 */
export function ScreenShell({
  title,
  onClose,
  children,
}: {
  /** 화면에 보이진 않지만 스크린리더용 라벨로 쓰임 */
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
    >
      {/* 메인 방 배경 — spots.ts의 ROOM_IMG를 흐리게 깔아 방 위에 떠 있는 느낌 */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ROOM_IMG}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none blur-[3px] scale-[1.03]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_45%,theme(colors.bg/55%),theme(colors.bg/85%))]" />
      </div>

      <button
        onClick={onClose}
        className="fixed top-6 left-6 z-10 inline-flex items-center gap-1.5 bg-glass border border-glassline text-cream text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-md hover:border-amber hover:text-amber transition-colors"
      >
        <ArrowLeft size={14} weight="bold" aria-hidden />
        Back to room
      </button>
      <div className="relative flex-1 min-h-0">
        <ViewportScale className="px-4 py-6 pt-20 sm:px-6">
          {children}
        </ViewportScale>
      </div>
    </div>
  );
}
