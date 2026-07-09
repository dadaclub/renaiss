"use client";
import { useHoverSound } from "@/lib/useHoverSound";

/**
 * 과자봉지 호버 사운드 — snack 스팟에 마우스를 올리는 동안 비닐 부스럭거리는 소리가 반복 재생된다.
 * 위치는 spots.ts의 snack 스팟(Hotspot)이 담당하고, 여기선 Scene이 넘겨준 호버 상태로 소리만 낸다.
 */
export function SnackHoverSound({ active }: { active: boolean }) {
  useHoverSound("/sounds/plastic-bag-crinkle.mp3", active);
  return null;
}
