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
      {/* 상시 강조 — 어둠 속에서 실제로 켜진 핸드폰처럼.
          ① 화면 빛이 바닥으로 번지는 블룸(차가운 흰-푸른 빛), ② 켜진 화면 사각형 자체 */}
      {highlight && (
        <>
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 w-[300%] h-[250%] rounded-full mix-blend-screen blur-[16px] animate-phone-bloom pointer-events-none motion-reduce:animate-none bg-[radial-gradient(ellipse_at_center,rgba(206,224,255,0.5),rgba(150,185,255,0.22)_38%,transparent_70%)]"
          />
          <span
            aria-hidden
            className="absolute inset-[16%] rounded-[4px] mix-blend-screen blur-[1.5px] animate-phone-screen pointer-events-none motion-reduce:animate-none bg-[linear-gradient(155deg,rgba(242,248,255,0.96),rgba(194,216,255,0.78))]"
          />
        </>
      )}
    </button>
  );
}
