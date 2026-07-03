"use client";
import { Spot } from "@/lib/spots";

interface Props {
  spot: Spot;
  disabled: boolean;
  /** 상시 발광 (예: 로그인 전 울리는 핸드폰) */
  highlight?: boolean;
  onSelect: (spot: Spot) => void;
}

export function Hotspot({ spot, disabled, highlight, onSelect }: Props) {
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
