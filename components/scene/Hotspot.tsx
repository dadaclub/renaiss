"use client";
import { Spot, ROOM_IMG } from "@/lib/spots";

interface Props {
  spot: Spot;
  disabled: boolean;
  /** 상시 발광 (예: 로그인 전 울리는 핸드폰) */
  highlight?: boolean;
  /** 입장 온보딩 — 초 단위 딜레이. null이 아니면 한 번 반짝이고 사라짐 */
  introDelay?: number | null;
  /** 호버 팝(5% 확대) 활성화 — 로그인 후에만 (어두운 방에선 복제본이 밝게 떠서 분위기 깨짐) */
  pop?: boolean;
  onSelect: (spot: Spot) => void;
}

export function Hotspot({ spot, disabled, highlight, introDelay = null, pop = false, onSelect }: Props) {
  const { left, top, width, height } = spot.area;
  return (
    <button
      onClick={() => onSelect(spot)}
      disabled={disabled}
      aria-label={spot.label}
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
      className="group absolute rounded-[14px] enabled:cursor-pointer disabled:pointer-events-none"
    >
      {/* 호버 팝 — 방 이미지에서 이 영역만 잘라낸 복제본을 5% 확대 (가구가 살짝 커지는 효과).
          가장자리는 라디얼 마스크로 페더링해 사각형 티를 없앰 */}
      {pop && (
        <span
          aria-hidden
          style={{
            backgroundImage: `url(${ROOM_IMG})`,
            backgroundSize: `${10000 / width}% ${10000 / height}%`,
            backgroundPosition: `${(left / (100 - width)) * 100}% ${(top / (100 - height)) * 100}%`,
          }}
          className="absolute inset-0 rounded-[inherit] opacity-0 scale-100 transition-all duration-200 group-hover:opacity-100 group-hover:scale-105 group-focus-visible:opacity-100 group-focus-visible:scale-105 [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_92%)] motion-reduce:transition-none pointer-events-none"
        />
      )}
      {/* 호버 글로우 — 가구 자체가 밝아짐 (어두운 아트에서만 효과) */}
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
      {/* 상시 강조 — 어두운 방에서 폰 화면 불빛처럼 작고 부드럽게 맥동 */}
      {highlight && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-[inherit] mix-blend-screen bg-[radial-gradient(ellipse_at_center,theme(colors.cream/90%)_0%,theme(colors.amber/35%)_30%,transparent_55%)] blur-[10px] animate-pulse pointer-events-none"
        />
      )}
    </button>
  );
}
