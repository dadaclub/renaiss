"use client";
import { useState } from "react";
import { ScreenShell } from "./ScreenShell";

/**
 * 액자 — 클릭 시 사진을 얇은 흰 액자에 끼운 것처럼 크게 보여준다.
 * 마우스를 올리면 돋보기(loupe)가 커서를 따라다니며 그 부분을 확대해 보여줌.
 * 👉 이 파일 안에서만 자유롭게 작업하세요. onClose = 방으로 돌아가기.
 *
 * 사진 교체: public/ 에 이미지를 넣고 PHOTO_SRC 만 바꾸면 됨.
 */
const PHOTO_SRC = "/picture_v1_cdither_g2_l4.jpg";
const LENS = 160; // 돋보기 지름(px)
const ZOOM = 1.5; // 확대 배율

export function PhotoScreen({ onClose }: { onClose: () => void }) {
  const [lens, setLens] = useState<{
    x: number;
    y: number;
    bgSize: string;
    bgPos: string;
  } | null>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLens({
      x,
      y,
      bgSize: `${rect.width * ZOOM}px ${rect.height * ZOOM}px`,
      // 커서 지점이 돋보기 중앙에 오도록 배경을 이동
      bgPos: `${-(x * ZOOM - LENS / 2)}px ${-(y * ZOOM - LENS / 2)}px`,
    });
  }

  return (
    <ScreenShell title="Photo" onClose={onClose}>
      {/* 얇은 흰 액자 — 사진을 그 안에 끼운 프린트처럼 */}
      <figure className="w-[min(94vw,840px)] overflow-hidden rounded-[4px] border-[3px] border-cream shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]">
        <div
          className="relative leading-none [&:hover>img]:cursor-none"
          onMouseMove={handleMove}
          onMouseLeave={() => setLens(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PHOTO_SRC} alt="A framed photo" draggable={false} className="block w-full select-none" />

          {/* 돋보기 렌즈 */}
          {lens && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-full border-2 border-cream shadow-[0_6px_20px_rgba(0,0,0,0.55)]"
              style={{
                width: LENS,
                height: LENS,
                left: lens.x - LENS / 2,
                top: lens.y - LENS / 2,
                backgroundImage: `url(${PHOTO_SRC})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: lens.bgSize,
                backgroundPosition: lens.bgPos,
              }}
            />
          )}
        </div>
      </figure>
    </ScreenShell>
  );
}
