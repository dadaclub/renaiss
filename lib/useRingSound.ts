"use client";
import { useEffect, useRef } from "react";

// 폰 진동(.animate-ring, app/globals.css)과 타이밍을 맞추기 위한 값들.
// ring-shake 키프레임: 0~45%(약 0.99s) 구간에서 실제로 흔들리고, 나머지 55%는 정지 — 이 버즈 구간에만 소리가 나야 한다.
const RING_VISUAL_DELAY_MS = 1200; // 애니메이션 시작 지연과 맞춤 — 화면보다 소리가 먼저 나오지 않도록
const CYCLE_MS = 2200; // ring-shake 한 사이클 길이
const BUZZ_MS = CYCLE_MS * 0.45; // 사이클 중 실제로 흔들리는 구간(0~45%)

/** 벨소리 훅 — 진동이 실제로 보이는 버즈 구간에만 소리를 내고, 멈춰 있는 동안은 조용하다. 파일이 없으면 조용히 무시. */
export function useRingSound(src: string, active: boolean, volume = 0.5) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;

    if (!active) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    // 버즈(재생) → 정지(일시정지) → 다음 버즈, 를 진동이 멈출 때까지 반복
    const scheduleBuzz = (delay: number) => {
      timers.push(
        setTimeout(() => {
          audio.currentTime = 0;
          audio.play().catch(() => {});
          timers.push(
            setTimeout(() => {
              audio.pause();
              scheduleBuzz(CYCLE_MS - BUZZ_MS);
            }, BUZZ_MS)
          );
        }, delay)
      );
    };
    scheduleBuzz(RING_VISUAL_DELAY_MS);

    return () => {
      timers.forEach(clearTimeout);
      audio.pause();
    };
  }, [active, src, volume]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);
}
