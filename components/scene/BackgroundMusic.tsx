"use client";
import { useEffect, useRef, useState } from "react";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

const TARGET_VOLUME = 0.35;
const FADE_IN_MS = 2500;

/** 로그인 후 방에서 계속 도는 배경음악 — 시작할 때 갑자기 크게 들리지 않도록 서서히 커진다. 우하단 아이콘으로 음소거 토글. */
export function BackgroundMusic({ active }: { active: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  // 컴퓨터 미니게임 화면이 열려 있는 동안(자체 게임 BGM 재생 중)은 방 배경음악을 잠시 멈춘다
  const [suppressed, setSuppressed] = useState(false);

  useEffect(() => {
    const onSuppress = (e: Event) => setSuppressed((e as CustomEvent<boolean>).detail);
    window.addEventListener("suppress-room-bgm", onSuppress);
    return () => window.removeEventListener("suppress-room-bgm", onSuppress);
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/bgm.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0;
    }
    audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (active && !suppressed) {
      audio.volume = 0;
      // 브라우저 자동재생 정책으로 막히면, 다음 클릭(어디든) 때 한 번 더 시도
      audio.play().catch(() => {
        const retry = () => audio.play().catch(() => {});
        document.addEventListener("pointerdown", retry, { once: true });
      });
      const start = performance.now();
      let raf = requestAnimationFrame(function fade(now) {
        const t = Math.min((now - start) / FADE_IN_MS, 1);
        audio.volume = t * TARGET_VOLUME;
        if (t < 1) raf = requestAnimationFrame(fade);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [active, suppressed]);

  if (!active) return null;

  return (
    <button
      type="button"
      onClick={() => setMuted((m) => !m)}
      aria-label={muted ? "Unmute background music" : "Mute background music"}
      className="absolute right-3 bottom-3 sm:right-5 sm:bottom-5 z-30 grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-full bg-glass border border-glassline text-creamdim hover:text-cream transition-colors"
    >
      {muted ? (
        <SpeakerSlash className="w-3.5 h-3.5 sm:w-4 sm:h-4" weight="bold" aria-hidden />
      ) : (
        <SpeakerHigh className="w-3.5 h-3.5 sm:w-4 sm:h-4" weight="bold" aria-hidden />
      )}
    </button>
  );
}
