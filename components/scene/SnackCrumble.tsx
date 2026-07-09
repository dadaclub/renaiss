"use client";
import { useEffect, useRef, useState } from "react";
import { ROOM_IMG, SPOTS } from "@/lib/spots";

const SNACK = SPOTS.find((s) => s.id === "snack");

/**
 * 과자봉지 구겨짐 이스터에그.
 * 클릭(trigger 증가)할 때마다 과자 영역(방 이미지 조각)을 복제해 우그러뜨리는 애니메이션 +
 * 비닐 부스럭 소리를 재생한다. 방 이미지에 그려진 원본 과자 위에 정확히 겹쳐 두므로,
 * 재생 중엔 복제본이 과자처럼 찌그러지고, 끝나면 사라져 원본이 그대로 보인다(반복 가능).
 */
export function SnackCrumble({ trigger }: { trigger: number }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (trigger === 0) return; // 초기 마운트에는 재생하지 않음
    setPlaying(false);
    // 다음 프레임에 다시 켜서 애니메이션을 재시작 (연타 시에도 매번 리셋)
    const raf = requestAnimationFrame(() => setPlaying(true));
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/plastic-bag-crinkle.mp3");
      audioRef.current.volume = 0.65;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
    const done = window.setTimeout(() => setPlaying(false), 600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [trigger]);

  if (!SNACK) return null;
  const { left, top, width, height } = SNACK.area;

  return (
    <div
      aria-hidden
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
      className="absolute pointer-events-none z-[5]"
    >
      {playing && (
        <span
          style={{
            backgroundImage: `url(${ROOM_IMG})`,
            backgroundSize: `${10000 / width}% ${10000 / height}%`,
            backgroundPosition: `${(left / (100 - width)) * 100}% ${(top / (100 - height)) * 100}%`,
          }}
          className="absolute inset-0 animate-snack-crumple motion-reduce:animate-none [mask-image:radial-gradient(ellipse_at_center,black_58%,transparent_92%)]"
        />
      )}
    </div>
  );
}
