"use client";
import type { CSSProperties } from "react";
import { Spot, ROOM_IMG } from "@/lib/spots";
import { useRingSound } from "@/lib/useRingSound";

interface Props {
  spot: Spot;
  disabled: boolean;
  /** 호버 팝(5% 확대) 활성화 — 로그인 후에만 (어두운 방에선 복제본이 밝게 떠서 분위기 깨짐) */
  pop?: boolean;
  /** 울리는 핸드폰 진동 — 입장 후 로그인 전, "이걸 눌러야 한다"는 유도. 폰 스팟 전용 */
  ring?: boolean;
  /** 호버 상태 알림 — Scene이 오버레이(액자 사진) pop에 사용 */
  onHover?: (spot: Spot, hovering: boolean) => void;
  onSelect: (spot: Spot) => void;
}

export function Hotspot({
  spot,
  disabled,
  pop = false,
  ring = false,
  onHover,
  onSelect,
}: Props) {
  const { left, top, width, height } = spot.area;
  useRingSound("/sounds/phone-ring.mp3", ring);
  // clip이 있으면 area(바운딩 박스) 안에서 실제 오브젝트 모양(다각형)으로 히트/호버 영역을 좁힌다.
  const clip = spot.clip;
  const clipPath = clip
    ? `polygon(${(["tl", "tr", "br", "bl"] as const)
        .map((k) => {
          const [cx, cy] = clip[k];
          return `${(((cx - left) / width) * 100).toFixed(2)}% ${(((cy - top) / height) * 100).toFixed(2)}%`;
        })
        .join(", ")})`
    : undefined;
  const popScale = spot.popScale ?? 1.05; // 호버 확대 배율 → CSS 변수 --pop 로 전달
  return (
    <button
      // 클릭음은 전역(ClickSound)에서 pointerdown 위임으로 처리 — 여기선 진입만.
      onClick={() => onSelect(spot)}
      onMouseEnter={() => onHover?.(spot, true)}
      onMouseLeave={() => onHover?.(spot, false)}
      disabled={disabled}
      aria-label={spot.label}
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, clipPath, "--pop": popScale } as CSSProperties}
      className="hotspot-cursor group absolute rounded-[14px] disabled:pointer-events-none"
    >
      {/* 호버 팝 — 방 이미지에서 이 영역만 잘라낸 복제본을 확대 (가구가 살짝 커지는 효과).
          확대 배율은 spot.popScale (기본 5%, 모니터·캐비닛 같은 큰 평면은 3%) → CSS 변수 --pop.
          가장자리는 라디얼 마스크로 페더링해 사각형 티를 없앰. */}
      {pop && (
        <span
          aria-hidden
          style={{
            backgroundImage: `url(${ROOM_IMG})`,
            backgroundSize: `${10000 / width}% ${10000 / height}%`,
            backgroundPosition: `${(left / (100 - width)) * 100}% ${(top / (100 - height)) * 100}%`,
          }}
          className="absolute inset-0 rounded-[inherit] opacity-0 scale-100 transition-all duration-200 group-hover:opacity-100 group-hover:scale-[var(--pop)] group-focus-visible:opacity-100 group-focus-visible:scale-[var(--pop)] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_92%)] motion-reduce:transition-none pointer-events-none"
        />
      )}
      {/* 울리는 핸드폰 — 이 영역 방-이미지 조각을 ring-shake로 흔들어 폰이 실제로 진동한다
          (벨소리 useRingSound 타이밍과 동기). bright 이미지를 복제해, 어두운 방에서 폰 화면만
          켜진 것처럼(로고 있는 밝은 폰이 울리는 연출) 보이게 한다.
          bright 이미지는 배경이 회색+비네팅이라 바닥까지 복제하면 dark(순백) 위에서 가장자리가
          어둡게 뜬다 → 마스크를 좁게(중심 폰 위주로만) 잡아 바깥 바닥이 안 보이게 한다. */}
      {ring && (
        <span
          aria-hidden
          style={{
            backgroundImage: `url(${ROOM_IMG})`,
            backgroundSize: `${10000 / width}% ${10000 / height}%`,
            backgroundPosition: `${(left / (100 - width)) * 100}% ${(top / (100 - height)) * 100}%`,
          }}
          className="absolute inset-0 rounded-[inherit] opacity-0 animate-ring motion-reduce:animate-none [mask-image:radial-gradient(ellipse_at_center,black_38%,transparent_70%)] pointer-events-none"
        />
      )}
      {/* 호버 글로우 — 가구 자체가 밝아짐. 방이 켜진 뒤에만(pop) 작동.
          어두운 로그인 화면에선 폰의 울림 글로우와 겹치므로 끈다. */}
      {pop && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-[inherit] mix-blend-screen bg-[radial-gradient(ellipse_at_center,theme(colors.cream/65%),theme(colors.cream/25%)_55%,transparent_78%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
        />
      )}
    </button>
  );
}
