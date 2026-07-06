"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 오버레이(액자 속 사진) 위치·크기·기울기를 마우스로 직접 맞추는 개발용 편집기.
 * 방 화면을 `?edit` 쿼리로 열면 활성화된다(일반 사용자에겐 안 보임).
 *  - 박스 드래그 = 이동, 모서리 핸들 드래그 = 크기 조절
 *  - 방향키 = 미세 이동(Shift=×5, Alt=크기), 슬라이더 = skewY
 *  - 하단 값/복사 버튼으로 lib/spots.ts 의 overlay 한 줄을 그대로 뽑아 붙이면 됨
 */
export interface OverlayBox {
  left: number;
  top: number;
  width: number;
  height: number;
  skewY: number;
}

type Mode = "move" | "nw" | "ne" | "sw" | "se";

export function OverlayEditor({
  src,
  initial,
  sceneRef,
}: {
  src: string;
  initial: OverlayBox;
  sceneRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [box, setBox] = useState<OverlayBox>(initial);
  const boxRef = useRef(box);
  boxRef.current = box;

  const round = (n: number) => Math.round(n * 10) / 10;

  // 포인터 이동량(px) → 씬 대비 %
  const toPct = useCallback(
    (dxPx: number, dyPx: number) => {
      const r = sceneRef.current?.getBoundingClientRect();
      const w = r?.width || 1;
      const h = r?.height || 1;
      return { dx: (dxPx / w) * 100, dy: (dyPx / h) * 100 };
    },
    [sceneRef]
  );

  const startDrag = (mode: Mode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = { ...boxRef.current };
    const onMove = (ev: PointerEvent) => {
      const { dx, dy } = toPct(ev.clientX - startX, ev.clientY - startY);
      let { left, top, width, height } = start;
      if (mode === "move") {
        left = start.left + dx;
        top = start.top + dy;
      } else if (mode === "se") {
        width = start.width + dx;
        height = start.height + dy;
      } else if (mode === "sw") {
        left = start.left + dx;
        width = start.width - dx;
        height = start.height + dy;
      } else if (mode === "ne") {
        top = start.top + dy;
        width = start.width + dx;
        height = start.height - dy;
      } else if (mode === "nw") {
        left = start.left + dx;
        top = start.top + dy;
        width = start.width - dx;
        height = start.height - dy;
      }
      setBox({
        left: round(left),
        top: round(top),
        width: Math.max(2, round(width)),
        height: Math.max(2, round(height)),
        skewY: start.skewY,
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // 방향키 미세 조정
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      e.preventDefault();
      const step = e.shiftKey ? 1 : 0.2;
      setBox((b) => {
        const nb = { ...b };
        if (e.altKey) {
          if (e.key === "ArrowRight") nb.width = round(b.width + step);
          if (e.key === "ArrowLeft") nb.width = round(Math.max(2, b.width - step));
          if (e.key === "ArrowDown") nb.height = round(b.height + step);
          if (e.key === "ArrowUp") nb.height = round(Math.max(2, b.height - step));
        } else {
          if (e.key === "ArrowRight") nb.left = round(b.left + step);
          if (e.key === "ArrowLeft") nb.left = round(b.left - step);
          if (e.key === "ArrowDown") nb.top = round(b.top + step);
          if (e.key === "ArrowUp") nb.top = round(b.top - step);
        }
        return nb;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const line = `overlay: { src: "${src}", left: ${box.left}, top: ${box.top}, width: ${box.width}, height: ${box.height}, skewY: ${box.skewY} },`;

  const boxStyle = {
    left: `${box.left}%`,
    top: `${box.top}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
    transform: `skewY(${box.skewY}deg)`,
  } as const;

  const handle = "absolute w-3 h-3 -m-1.5 bg-amber border border-inkdark rounded-sm pointer-events-auto";

  const fields: (keyof OverlayBox)[] = ["left", "top", "width", "height", "skewY"];

  return (
    <>
      {/* 편집 대상 박스(실제 결과와 동일 렌더) */}
      <div
        onPointerDown={startDrag("move")}
        style={boxStyle}
        className="absolute overflow-hidden cursor-move outline outline-2 outline-amber z-[60]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="block w-full h-full object-cover select-none pointer-events-none"
        />
      </div>

      {/* 크기 조절 핸들 (박스와 같은 skew를 따라감) */}
      <div style={boxStyle} className="absolute z-[61] pointer-events-none">
        <span onPointerDown={startDrag("nw")} className={`${handle} left-0 top-0 cursor-nwse-resize`} />
        <span onPointerDown={startDrag("ne")} className={`${handle} right-0 top-0 cursor-nesw-resize`} />
        <span onPointerDown={startDrag("sw")} className={`${handle} left-0 bottom-0 cursor-nesw-resize`} />
        <span onPointerDown={startDrag("se")} className={`${handle} right-0 bottom-0 cursor-nwse-resize`} />
      </div>

      {/* 컨트롤 패널 */}
      <div className="fixed top-3 left-3 z-[70] w-[300px] rounded-xl bg-[#0e0b1a]/95 border border-glassline p-3 text-cream text-xs space-y-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="font-bold text-amber tracking-wide">📐 Photo overlay editor</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {fields.map((f) => (
            <label key={f} className="flex items-center justify-between gap-2">
              <span className="text-creamdim/80">{f}</span>
              <input
                type="number"
                step={0.1}
                value={box[f]}
                onChange={(e) =>
                  setBox((b) => ({ ...b, [f]: parseFloat(e.target.value) || 0 }))
                }
                className="w-16 bg-cream/10 border border-glassline rounded px-1.5 py-0.5 text-right outline-none focus:border-amber"
              />
            </label>
          ))}
        </div>
        <label className="block">
          <span className="text-creamdim/80">skewY (기울기): {box.skewY}°</span>
          <input
            type="range"
            min={-20}
            max={20}
            step={0.5}
            value={box.skewY}
            onChange={(e) => setBox((b) => ({ ...b, skewY: parseFloat(e.target.value) }))}
            className="w-full accent-amber"
          />
        </label>
        <div className="text-[10px] leading-relaxed text-creamdim/70">
          박스 드래그=이동 · 모서리=크기 · 방향키=미세이동(Shift=×5, Alt=크기)
        </div>
        <textarea
          readOnly
          value={line}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full h-16 bg-black/40 border border-glassline rounded p-1.5 font-mono text-[10px] leading-snug resize-none"
        />
        <button
          onClick={() => navigator.clipboard?.writeText(line)}
          className="w-full bg-amber text-inkdark font-bold rounded py-1.5 hover:brightness-110 transition"
        >
          Copy spots.ts line
        </button>
      </div>
    </>
  );
}
