"use client";
import { useEffect, useRef } from "react";

/** 호버 반복 재생 훅 — 마우스가 올라가 있는 동안 루프 재생, 벗어나면 멈추고 되감는다. 파일이 없으면 조용히 무시. */
export function useHoverSound(src: string, hovering: boolean, volume = 0.5) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;
    if (hovering) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [hovering, src, volume]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);
}
