"use client";
import { CSSProperties } from "react";
import { SPOTS, ROOM_IMG } from "@/lib/spots";

/**
 * 과자봉지 이스터에그 — 클릭하면 봉지가 구겨졌다 펴지고 부스러기가 튄다.
 * 방 이미지에서 봉지 영역만 잘라낸 복제본(호버 팝과 같은 기법)을 스쿼시 애니메이션.
 * Scene이 클릭할 때마다 key를 바꿔 리마운트 → 애니메이션 재시작.
 * 밝은 복제본이 로그아웃 후 어두워진 방 위에 남지 않도록, 재생이 끝나면 onDone으로 내려간다.
 */

// 봉지 입구에서 튀어나오는 부스러기들 — 위로 솟았다가 바닥으로 떨어진다 (--dx/--dy = 정점 방향).
// delay + 0.8s(snack-crumb)가 봉지(snack-crumple 0.9s)보다 먼저 끝나야 마지막 조각이 잘리지 않는다.
const CRUMBS = [
  { dx: -44, dy: -36, delay: 0.04, size: 5 },
  { dx: 28, dy: -54, delay: 0, size: 4 },
  { dx: 56, dy: -22, delay: 0.06, size: 6 },
  { dx: -20, dy: -58, delay: 0.08, size: 4 },
  { dx: 46, dy: -44, delay: 0.1, size: 5 },
];

export function SnackCrumple({ onDone }: { onDone: () => void }) {
  const spot = SPOTS.find((s) => s.id === "snack");
  if (!spot) return null;
  const { left, top, width, height } = spot.area;

  return (
    <div
      aria-hidden
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
      // 자식들의 animationend가 버블돼 올라옴 — 가장 늦게 끝나는 봉지(snack-crumple) 기준으로 내려간다
      onAnimationEnd={(e) => e.animationName === "snack-crumple" && onDone()}
      className="absolute pointer-events-none"
    >
      {/* 구겨지는 봉지 복제본 — 가장자리는 라디얼 마스크로 페더링해 사각형 티를 없앰 */}
      <span
        style={{
          backgroundImage: `url(${ROOM_IMG})`,
          backgroundSize: `${10000 / width}% ${10000 / height}%`,
          backgroundPosition: `${(left / (100 - width)) * 100}% ${(top / (100 - height)) * 100}%`,
        }}
        className="absolute inset-0 animate-crumple motion-reduce:animate-none [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_92%)]"
      />
      {CRUMBS.map((c, i) => (
        <span
          key={i}
          style={
            {
              width: c.size,
              height: c.size,
              left: "52%",
              top: "34%",
              animationDelay: `${c.delay}s`,
              "--dx": `${c.dx}px`,
              "--dy": `${c.dy}px`,
            } as CSSProperties
          }
          className="absolute rounded-full bg-inkdark/50 opacity-0 animate-crumb motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
