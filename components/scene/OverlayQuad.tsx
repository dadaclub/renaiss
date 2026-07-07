"use client";
import type { RefObject } from "react";
import { quadMatrix3d, type Corners } from "@/lib/quad";
import { useElementSize } from "@/lib/useElementSize";

const BASE = 100; // 소스 사각형 기준 크기(px) — matrix3d가 corners로 투영

/**
 * 방 배경 위에 얹는 오브젝트 사진(예: 액자 속 사진)을 네 꼭짓점(corners)에 맞춰 원근 배치.
 * 각 모서리를 독립적으로 지정하므로 위·아래 변 기울기가 다른 사다리꼴도 표현된다.
 * 이미지는 네 모서리에 꽉 차게(코너-투-코너) 채워진다.
 */
export function OverlayQuad({
  src,
  corners,
  sceneRef,
  className = "",
}: {
  src: string;
  corners: Corners;
  sceneRef: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const { width, height } = useElementSize(sceneRef);
  if (!width || !height) return null;
  const matrix = quadMatrix3d(corners, width, height, BASE);
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: BASE,
        height: BASE,
        transformOrigin: "0 0",
        transform: matrix,
      }}
      className={`pointer-events-none select-none ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} className="block w-full h-full select-none" />
    </div>
  );
}
