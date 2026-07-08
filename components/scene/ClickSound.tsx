"use client";
import { useEffect } from "react";
import { useClickSound } from "@/lib/useClickSound";

/**
 * 전역 클릭음 — 앱 어디서든 클릭 가능한 요소(버튼·링크·칩·카드·탭 등)를 누르면
 * 통일된 UI 클릭음을 낸다. 개별 컴포넌트마다 붙이지 않고 window에서 한 번만 위임 처리.
 * 재생 시점은 pointerdown(누르는 순간) — click(뗀 후)보다 물리 클릭 감각에 맞는다.
 * 마운트는 Scene 한 곳에서만.
 */
export function ClickSound() {
  const play = useClickSound("/sounds/ui-click.mp3");

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (e.button !== 0) return; // 주 버튼(좌클릭/터치)만
      const target = e.target as HTMLElement | null;
      // 클릭 가능한 컨트롤만 — 텍스트 입력·빈 배경 클릭엔 소리 안 남
      const el = target?.closest(
        'button, a[href], [role="button"], [role="option"], summary'
      ) as HTMLElement | null;
      if (!el) return;
      if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
      play();
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [play]);

  return null;
}
