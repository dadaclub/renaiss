"use client";
import { useEffect, useRef, useState } from "react";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

/** 로그인 후 방에서 계속 도는 배경음악 — 우하단 아이콘으로 음소거 토글. */
export function BackgroundMusic({ active }: { active: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/bgm.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35;
    }
    audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (active) {
      // 브라우저 자동재생 정책으로 막히면, 다음 클릭(어디든) 때 한 번 더 시도
      audio.play().catch(() => {
        const retry = () => audio.play().catch(() => {});
        document.addEventListener("pointerdown", retry, { once: true });
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [active]);

  if (!active) return null;

  return (
    <button
      type="button"
      onClick={() => setMuted((m) => !m)}
      aria-label={muted ? "Unmute background music" : "Mute background music"}
      className="absolute right-5 bottom-5 z-30 grid h-9 w-9 place-items-center rounded-full bg-glass border border-glassline text-creamdim hover:text-cream transition-colors"
    >
      {muted ? (
        <SpeakerSlash size={16} weight="bold" aria-hidden />
      ) : (
        <SpeakerHigh size={16} weight="bold" aria-hidden />
      )}
    </button>
  );
}
