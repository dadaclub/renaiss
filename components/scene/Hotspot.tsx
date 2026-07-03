"use client";
import { Spot } from "@/lib/spots";

interface Props {
  spot: Spot;
  disabled: boolean;
  /** 상시 발광 (예: 로그인 전 울리는 핸드폰) */
  highlight?: boolean;
  /** 입장 온보딩 — 초 단위 딜레이. null이 아니면 한 번 반짝이고 사라짐 */
  introDelay?: number | null;
  onSelect: (spot: Spot) => void;
}

export function Hotspot({ spot, disabled, highlight, introDelay = null, onSelect }: Props) {
  const { left, top, width, height } = spot.area;
  return (
    <button
      onClick={() => onSelect(spot)}
      disabled={disabled}
      aria-label={spot.label}
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
      className="group absolute rounded-[14px] enabled:cursor-pointer disabled:pointer-events-none"
    >
      {/* 호버 글로우 — 가구 자체가 밝아짐 */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] mix-blend-screen bg-[radial-gradient(ellipse_at_center,theme(colors.cream/65%),theme(colors.cream/25%)_55%,transparent_78%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
      />
      {/* 입장 온보딩 — 순서대로 한 번씩 반짝여 클릭 가능한 가구를 알려줌.
          mix-blend-screen은 밝은 아트에서 안 보이므로 네온 링 + 채움 사용 (아트 명암 무관) */}
      {introDelay != null && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-[inherit] border-2 border-amber/70 bg-[radial-gradient(ellipse_at_center,theme(colors.amber/30%),transparent_75%)] shadow-[0_0_24px_theme(colors.amber/45%)] opacity-0 animate-glow-once motion-reduce:animate-none pointer-events-none"
          style={{ animationDelay: `${introDelay}s` }}
        />
      )}
      {/* 상시 강조 — 어두운 방에서 홀로 빛나며 맥동 */}
      {highlight && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-[inherit] mix-blend-screen bg-[radial-gradient(ellipse_at_center,theme(colors.cream/85%),theme(colors.amber/45%)_50%,transparent_80%)] animate-pulse pointer-events-none"
        />
      )}
    </button>
  );
}
