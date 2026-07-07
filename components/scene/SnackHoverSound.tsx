"use client";
import { useState } from "react";
import { useHoverSound } from "@/lib/useHoverSound";

// 바닥 과자봉지 위치 — candy-bag-crumple 브랜치에서 측정한 좌표와 동일(그 브랜치 머지 시 spots.ts의
// snack 스팟으로 대체 예정, 지금은 별도 파일로 호버 사운드만 독립적으로 추가)
const SNACK_AREA = { left: 31, top: 79, width: 16, height: 12 };

/** 과자봉지 호버 사운드 — 마우스를 올리는 동안 비닐 부스럭거리는 소리가 반복 재생된다. */
export function SnackHoverSound({ active }: { active: boolean }) {
  const [hovering, setHovering] = useState(false);
  useHoverSound("/sounds/plastic-bag-crinkle.mp3", active && hovering);

  if (!active) return null;

  return (
    <div
      aria-hidden
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        left: `${SNACK_AREA.left}%`,
        top: `${SNACK_AREA.top}%`,
        width: `${SNACK_AREA.width}%`,
        height: `${SNACK_AREA.height}%`,
      }}
      className="absolute"
    />
  );
}
