"use client";
import { useEffect, useRef } from "react";

/** 벨소리 반복 재생 훅 — active인 동안 루프 재생, 꺼지면 멈추고 되감는다. 파일이 없으면 조용히 무시. */
export function useRingSound(src: string, active: boolean, volume = 0.5) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;
    if (active) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [active, src, volume]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);
}
