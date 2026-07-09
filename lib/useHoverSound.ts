"use client";
import { useEffect, useRef } from "react";

/** 호버 반복 재생 훅 — 마우스가 올라가 있는 동안 루프 재생, 벗어나면 멈추고 되감는다. 파일이 없으면 조용히 무시. */
export function useHoverSound(src: string, hovering: boolean, volume = 0.5) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
    const audio = audioRef.current;
    // src가 바뀌면(또는 HMR로 이전 인스턴스가 남아있으면) 새 파일로 갈아끼운다
    if (!audio.src.endsWith(src)) {
      audio.src = src;
    }
    audio.volume = volume;
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
