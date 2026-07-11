"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { SPOTS, type Spot, type SpotId } from "@/lib/spots";
import { quadMatrix3d, type Corners, type Pt } from "@/lib/quad";
import { useElementSize } from "@/lib/useElementSize";

/**
 * 오버레이(액자 속 사진 등) 네 꼭짓점을 마우스로 직접 맞추는 개발용 편집기.
 * 방 화면을 `?edit` 쿼리로 열면 활성화된다(일반 사용자에겐 안 보임).
 *  - 상단 선택기로 대상 스팟(액자/앨범/핸드폰/카드수집장 등)을 고른다.
 *  - 사진(가운데) 드래그 = 전체 이동, 모서리 핸들 드래그 = 그 꼭짓점만 이동(위·아래 기울기 개별 조정)
 *  - 방향키 = 선택한 모서리 미세 이동(Shift=×5). 모서리 핸들/패널 행 클릭으로 선택.
 *  - "Solid fill" = 사진 대신 어두운 판으로 렌더(흰색 섞인 사진보다 치수 재기 쉬움), Opacity로 방 아래 비침.
 *  - 하단 값/복사 버튼으로 lib/spots.ts 의 overlay 한 줄을 그대로 뽑아 붙이면 됨
 */
const BASE = 100;
type CornerKey = "tl" | "tr" | "br" | "bl";
const CORNER_KEYS: CornerKey[] = ["tl", "tr", "br", "bl"];
const CORNER_LABEL: Record<CornerKey, string> = { tl: "TL", tr: "TR", br: "BR", bl: "BL" };

/** 스팟의 overlay corners, 없으면 area(직사각형)에서 시드 */
function seedCorners(spot: Spot): Corners {
  if (spot.overlay) return spot.overlay.corners;
  const { left, top, width, height } = spot.area;
  return {
    tl: [left, top],
    tr: [left + width, top],
    br: [left + width, top + height],
    bl: [left, top + height],
  };
}

export function OverlayEditor({
  spotId,
  onSpotChange,
  sceneRef,
}: {
  spotId: SpotId;
  onSpotChange: (id: SpotId) => void;
  sceneRef: RefObject<HTMLDivElement | null>;
}) {
  const spot = SPOTS.find((s) => s.id === spotId)!;
  const src = spot.overlay?.src ?? "/picture_v1.jpg"; // 오버레이 없는 스팟은 임시 이미지(치수만 재는 용)

  const [corners, setCorners] = useState<Corners>(() => seedCorners(spot));
  const [selected, setSelected] = useState<CornerKey>("tl");
  const [solid, setSolid] = useState<boolean>(!spot.overlay); // 오버레이 없으면 측정용 판이 기본
  const [opacity, setOpacity] = useState<number>(0.85);
  const cornersRef = useRef(corners);
  cornersRef.current = corners;
  const { width, height } = useElementSize(sceneRef);

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

  // key === null 이면 전체 이동, 아니면 해당 꼭짓점만 이동
  const startDrag = (key: CornerKey | null) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (key) setSelected(key);
    const startX = e.clientX;
    const startY = e.clientY;
    const start = cornersRef.current;
    const onMove = (ev: PointerEvent) => {
      const { dx, dy } = toPct(ev.clientX - startX, ev.clientY - startY);
      const shift = (p: Pt): Pt => [round(p[0] + dx), round(p[1] + dy)];
      if (key) {
        setCorners({ ...start, [key]: shift(start[key]) });
      } else {
        setCorners({ tl: shift(start.tl), tr: shift(start.tr), br: shift(start.br), bl: shift(start.bl) });
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // 방향키 = 선택한 모서리 미세 이동 (Shift=×5)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      e.preventDefault();
      const step = e.shiftKey ? 1 : 0.2;
      setCorners((c) => {
        const [x, y] = c[selected];
        let nx = x;
        let ny = y;
        if (e.key === "ArrowRight") nx = round(x + step);
        if (e.key === "ArrowLeft") nx = round(x - step);
        if (e.key === "ArrowDown") ny = round(y + step);
        if (e.key === "ArrowUp") ny = round(y - step);
        return { ...c, [selected]: [nx, ny] as Pt };
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const setCorner = (key: CornerKey, axis: 0 | 1, value: number) =>
    setCorners((c) => {
      const p: Pt = [...c[key]] as Pt;
      p[axis] = value;
      return { ...c, [key]: p };
    });

  const fmt = (p: Pt) => `[${round(p[0])}, ${round(p[1])}]`;
  const line = `overlay: { src: "${src}", corners: { tl: ${fmt(corners.tl)}, tr: ${fmt(corners.tr)}, br: ${fmt(corners.br)}, bl: ${fmt(corners.bl)} } },`;

  // area(호버·클릭 히트박스) = 네 꼭짓점의 바운딩 박스. 스팟의 area 한 줄로 뽑아 spots.ts에 붙인다.
  const xs = [corners.tl[0], corners.tr[0], corners.br[0], corners.bl[0]];
  const ys = [corners.tl[1], corners.tr[1], corners.br[1], corners.bl[1]];
  const areaLeft = round(Math.min(...xs));
  const areaTop = round(Math.min(...ys));
  const areaWidth = round(Math.max(...xs) - areaLeft);
  const areaHeight = round(Math.max(...ys) - areaTop);
  const areaLine = `area: { left: ${areaLeft}, top: ${areaTop}, width: ${areaWidth}, height: ${areaHeight} },`;

  const matrix = width && height ? quadMatrix3d(corners, width, height, BASE) : "";

  const handleCls =
    "absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] border-2 rounded-full pointer-events-auto cursor-move";

  return (
    <>
      {/* 편집 대상(실제 결과와 동일 렌더 또는 측정용 솔리드 판) — 가운데 드래그로 전체 이동 */}
      {matrix && (
        <div
          onPointerDown={startDrag(null)}
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: BASE,
            height: BASE,
            transformOrigin: "0 0",
            transform: matrix,
            opacity,
          }}
          className="cursor-move select-none z-[60] outline outline-2 outline-amber"
        >
          {solid ? (
            <div className="w-full h-full bg-[#0a0814]" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" draggable={false} className="block w-full h-full select-none pointer-events-none" />
          )}
        </div>
      )}

      {/* 모서리 핸들 (씬 전체 레이어에 % 위치로 배치) */}
      <div className="absolute inset-0 z-[61] pointer-events-none">
        {CORNER_KEYS.map((k) => (
          <span
            key={k}
            onPointerDown={startDrag(k)}
            title={CORNER_LABEL[k]}
            style={{ left: `${corners[k][0]}%`, top: `${corners[k][1]}%` }}
            className={`${handleCls} ${
              selected === k ? "bg-amber border-cream" : "bg-inkdark border-amber"
            }`}
          />
        ))}
      </div>

      {/* 컨트롤 패널 */}
      <div className="fixed top-3 left-3 z-[70] w-[300px] rounded-xl bg-[#0e0b1a]/95 border border-glassline p-3 text-cream text-xs space-y-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="font-bold text-amber tracking-wide">📐 Overlay corner editor</div>

        {/* 대상 스팟 선택 */}
        <div className="flex flex-wrap gap-1">
          {SPOTS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSpotChange(s.id)}
              className={`px-1.5 py-0.5 rounded border text-[10px] ${
                s.id === spotId
                  ? "bg-amber text-inkdark border-amber font-bold"
                  : "bg-cream/10 border-glassline text-creamdim/80 hover:border-amber"
              }`}
            >
              {s.id}
            </button>
          ))}
        </div>

        {/* 측정용 표시 옵션 */}
        <div className="flex items-center justify-between gap-2 border-t border-glassline pt-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={solid} onChange={(e) => setSolid(e.target.checked)} className="accent-amber" />
            <span className="text-creamdim/80">Solid fill (측정용)</span>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-creamdim/60">opacity</span>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-16 accent-amber"
            />
          </label>
        </div>

        <div className="space-y-1.5">
          {CORNER_KEYS.map((k) => (
            <div
              key={k}
              onClick={() => setSelected(k)}
              className={`flex items-center gap-2 rounded px-1 py-0.5 cursor-pointer ${
                selected === k ? "bg-amber/15" : ""
              }`}
            >
              <span className="w-7 font-mono text-creamdim/80">{CORNER_LABEL[k]}</span>
              {([0, 1] as const).map((axis) => (
                <label key={axis} className="flex items-center gap-1">
                  <span className="text-creamdim/60">{axis === 0 ? "x" : "y"}</span>
                  <input
                    type="number"
                    step={0.1}
                    value={corners[k][axis]}
                    onChange={(e) => setCorner(k, axis, parseFloat(e.target.value) || 0)}
                    className="w-16 bg-cream/10 border border-glassline rounded px-1.5 py-0.5 text-right outline-none focus:border-amber"
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="text-[10px] leading-relaxed text-creamdim/70">
          박스 드래그=전체 이동 · 모서리=꼭짓점 개별(크기조절) · 방향키=선택 모서리 미세이동(Shift=×5)
        </div>

        {/* 호버·클릭 영역(area) — 이 줄을 spots.ts 해당 스팟의 area 에 붙여넣으면 호버 위치가 바뀐다. */}
        <div className="border-t border-glassline pt-2 space-y-1">
          <div className="text-[10px] font-bold text-amber">Hover / click area (spots.ts)</div>
          <textarea
            readOnly
            value={areaLine}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-12 bg-black/40 border border-glassline rounded p-1.5 font-mono text-[10px] leading-snug resize-none"
          />
          <button
            onClick={() => navigator.clipboard?.writeText(areaLine)}
            className="w-full bg-amber text-inkdark font-bold rounded py-1.5 hover:brightness-110 transition"
          >
            Copy area line
          </button>
        </div>

        {/* 오버레이(액자 속 사진 등) 꼭짓점 — 사진을 얹는 스팟에서만 사용 */}
        <div className="border-t border-glassline pt-2 space-y-1">
          <div className="text-[10px] text-creamdim/60">Overlay corners (사진 얹을 때만)</div>
          <textarea
            readOnly
            value={line}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-16 bg-black/40 border border-glassline rounded p-1.5 font-mono text-[10px] leading-snug resize-none"
          />
          <button
            onClick={() => navigator.clipboard?.writeText(line)}
            className="w-full bg-cream/10 border border-glassline text-cream rounded py-1.5 hover:border-amber transition"
          >
            Copy overlay line
          </button>
        </div>
      </div>
    </>
  );
}
