"use client";
import { Spot, ROOM_IMG } from "@/lib/spots";

interface Props {
  spot: Spot;
  disabled: boolean;
  /** 호버 팝(5% 확대) 활성화 — 로그인 후에만 (어두운 방에선 복제본이 밝게 떠서 분위기 깨짐) */
  pop?: boolean;
  /** 울리는 핸드폰 진동 — 입장 후 로그인 전, "이걸 눌러야 한다"는 유도. 폰 스팟 전용 */
  ring?: boolean;
  /** 로그인 직후 한 번 빛나는 웨이크 글로우 — 오브젝트가 인터랙티브해졌다는 피드백 */
  wake?: boolean;
  /** 웨이크 글로우 시작 지연(초) — Scene이 스팟 순서대로 스태거를 준다 */
  wakeDelay?: number;
  /** 호버 상태 알림 — Scene이 오버레이(액자 사진) pop에 사용 */
  onHover?: (spot: Spot, hovering: boolean) => void;
  onSelect: (spot: Spot) => void;
}

export function Hotspot({
  spot,
  disabled,
  pop = false,
  ring = false,
  wake = false,
  wakeDelay = 0,
  onHover,
  onSelect,
}: Props) {
  const { left, top, width, height } = spot.area;
  return (
    <button
      onClick={() => onSelect(spot)}
      onMouseEnter={() => onHover?.(spot, true)}
      onMouseLeave={() => onHover?.(spot, false)}
      disabled={disabled}
      aria-label={spot.label}
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
      className="hotspot-cursor group absolute rounded-[14px] disabled:pointer-events-none"
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
      {/* 울리는 핸드폰 — 이 영역 클립 복제본이 진동(ring-shake)해 "눌러서 받아라"를 유도.
          모션 축소 환경에선 진동 대신 정적 amber 글로우만 남는다 */}
      {ring && (
        <>
          <span
            aria-hidden
            className="absolute -inset-[18%] rounded-[inherit] mix-blend-screen bg-[radial-gradient(ellipse_at_center,theme(colors.amber/35%),transparent_72%)] opacity-0 animate-[fade-in_0.6s_ease-out_1.2s_both] motion-reduce:animate-none motion-reduce:opacity-100 pointer-events-none"
          />
          <span
            aria-hidden
            style={{
              backgroundImage: `url(${ROOM_IMG})`,
              backgroundSize: `${10000 / width}% ${10000 / height}%`,
              backgroundPosition: `${(left / (100 - width)) * 100}% ${(top / (100 - height)) * 100}%`,
            }}
            className="absolute inset-0 rounded-[inherit] opacity-0 animate-ring motion-reduce:animate-none [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_92%)] pointer-events-none"
          />
        </>
      )}
      {/* 웨이크 글로우 — 로그인 직후 스팟 순서대로 한 번씩 amber로 빛남 */}
      {wake && (
        <span
          aria-hidden
          style={{ animationDelay: `${wakeDelay}s` }}
          className="absolute inset-0 rounded-[inherit] mix-blend-screen bg-[radial-gradient(ellipse_at_center,theme(colors.amber/50%),theme(colors.amber/20%)_55%,transparent_78%)] opacity-0 animate-wake motion-reduce:animate-none pointer-events-none"
        />
      )}
      {/* 호버 글로우 — 가구 자체가 밝아짐 (어두운 아트에서만 효과) */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] mix-blend-screen bg-[radial-gradient(ellipse_at_center,theme(colors.cream/65%),theme(colors.cream/25%)_55%,transparent_78%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
      />
    </button>
  );
}
