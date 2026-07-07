"use client";
import { useEffect, useRef } from "react";

// 폰 진동(.animate-ring, app/globals.css)이 실제로 보이기 시작하는 지연과 맞춤 — 화면보다 소리가 먼저 나오지 않도록
const RING_VISUAL_DELAY_MS = 1200;

/** 벨소리 반복 재생 훅 — 진동 애니메이션이 실제로 보이는 동안만 루프 재생, 꺼지면 멈추고 되감는다. 파일이 없으면 조용히 무시. */
export function useRingSound(src: string, active: boolean, volume = 0.5) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;
    if (!active) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }
    const timer = setTimeout(() => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }, RING_VISUAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, src, volume]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);
}
