"use client";
import { useHoverSound } from "@/lib/useHoverSound";

/**
 * 방명록(노트) 호버 사운드 — note 스팟에 마우스를 올리는 동안 종이에 손글씨 쓰는 소리가 재생된다.
 * 위치는 spots.ts의 note 스팟(Hotspot)이 담당하고, 여기선 Scene이 넘겨준 호버 상태로 소리만 낸다.
 */
export function NoteHoverSound({ active }: { active: boolean }) {
  // 원본 파일 자체가 작게 녹음돼 있어서, 1(=100%)을 넘겨 증폭한다 (Web Audio GainNode라 1 초과도 가능)
  useHoverSound("/sounds/writing-on-paper.mp3", active, 2.2);
  return null;
}
