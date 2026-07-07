"use client";
import { useEffect, useState } from "react";
import { ScreenShell } from "./ScreenShell";

/**
 * 앨범 — 띠부실(포켓몬 스티커) "COLLECT BOOK" 컨셉의 SBT 컬렉션북.
 * 처음엔 닫힌 표지(COLLECT BOOK)만 보이고, 표지를 누르면 페이지가 넘어가며(플립) 스티커 그리드가 드러난다.
 * Renaiss 공개 프로필의 favoritedSBTs를 /api/sbt 로 로드, 미설정/장애 시 목 폴백.
 * 👉 이 파일 안에서만 작업.
 */
interface Sbt {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  glyph?: string; // 이미지 없을 때 대체
  color?: string;
}

const MOCK_SBTS: Sbt[] = [
  { id: 1, title: "OG Holder", description: "Held since day one.", glyph: "★", color: "#B78CFF" },
  { id: 2, title: "First Pull", description: "First gacha pack.", glyph: "⚡", color: "#6FE8C8" },
  { id: 3, title: "Top 100", description: "Top 100 collectors.", glyph: "♛", color: "#FFC65A" },
  { id: 4, title: "Grail Owner", description: "Owns a PSA 10 grail.", glyph: "✦", color: "#FF8BA8" },
  { id: 5, title: "Set Master", description: "Completed a set.", glyph: "◆", color: "#7FB2F0" },
  { id: 6, title: "Diamond Hands", description: "Held a full cycle.", glyph: "❖", color: "#9BE8A0" },
  { id: 7, title: "Trader", description: "First on-chain trade.", glyph: "⇄", color: "#F0A87F" },
  { id: 8, title: "Curator", description: "Featured a showcase.", glyph: "✎", color: "#C7A0FF" },
  { id: 9, title: "Genesis", description: "Minted at genesis.", glyph: "✺", color: "#7FE8D8" },
];

const PALETTE = ["#B78CFF", "#6FE8C8", "#FFC65A", "#FF8BA8", "#7FB2F0", "#9BE8A0"];

export function AlbumScreen({ onClose }: { onClose: () => void }) {
  const [sbts, setSbts] = useState<Sbt[] | null>(null);
  const [fallback, setFallback] = useState(false);
  const [open, setOpen] = useState(false); // 표지 넘김 여부

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/sbt");
        const d = (await r.json()) as { sbts?: Sbt[] };
        if (r.ok && d.sbts && d.sbts.length > 0) {
          if (alive) {
            setSbts(d.sbts);
            setFallback(false);
          }
          return;
        }
      } catch {
        // 폴백
      }
      if (alive) {
        setSbts(MOCK_SBTS);
        setFallback(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ScreenShell title="Collect Book" onClose={onClose}>
      {/* 책 (원근감) */}
      <div className="relative w-[min(92vw,560px)] [perspective:1800px]">
        <div className="relative [transform-style:preserve-3d]">
          {/* 스티커 페이지 (표지 아래) */}
          <StickerPage sbts={sbts} fallback={fallback} />

          {/* 표지 — 클릭 시 왼쪽 힌지로 넘어가며(플립) 페이지가 드러남 */}
          <button
            onClick={() => setOpen(true)}
            aria-label={open ? "Collect book cover" : "Open collect book"}
            className={`absolute inset-0 origin-left [transform-style:preserve-3d] transition-transform duration-[850ms] ease-[cubic-bezier(0.42,0.1,0.2,1)] ${
              open
                ? "[transform:rotateY(-170deg)_translateZ(8px)] pointer-events-none"
                : "[transform:rotateY(0deg)_translateZ(8px)]"
            }`}
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <CoverFace hinted={!open} />
            {/* 넘어갈 때 표지에 지는 그림자 */}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-[16px] bg-black transition-opacity duration-[850ms] ${
                open ? "opacity-40" : "opacity-0"
              }`}
            />
          </button>
        </div>
      </div>
    </ScreenShell>
  );
}

// 포켓볼 표지 — 원본 빨강/검정/흰색. 브랜딩은 가운데 원 안 르네 로고로.
const COVER_TOP = "#e5392c"; // 위 (빨강)
const COVER_BAND = "#1a1a1a"; // 가운데 밴드 (검정)
const COVER_BOTTOM = "#f3f0ea"; // 아래 (흰색)
const COVER_INK = "#1a1a1a"; // 중앙 버튼 테두리

/** COLLECT BOOK 표지 (포켓볼) — 세 영역을 르네 로고색으로 */
function CoverFace({ hinted }: { hinted: boolean }) {
  return (
    <div
      className="relative w-full aspect-square rounded-[16px] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.55)] ring-1 ring-black/15"
      style={{ background: COVER_TOP }}
    >
      {/* 아래 영역 */}
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: COVER_BOTTOM }} />
      {/* 가운데 밴드 */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[9%]" style={{ background: COVER_BAND }} />
      {/* 중앙 버튼 (COLLECT BOOK) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[46%] aspect-square rounded-full bg-white border-[12px] shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
        style={{ borderColor: COVER_INK }}
      />
      {/* 왼쪽 스파인 그림자 */}
      <div aria-hidden className="absolute left-0 inset-y-0 w-3 bg-gradient-to-r from-black/25 to-transparent" />
      {/* 광택 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.2),transparent_38%)]" />
      {/* 열기 힌트 */}
      {hinted && (
        <div
          className="absolute bottom-3.5 right-4 text-[10px] font-bold bg-white/92 rounded-full px-2.5 py-1 animate-pulse"
          style={{ color: COVER_TOP }}
        >
          Tap to open →
        </div>
      )}
    </div>
  );
}

/** 스티커 페이지 — 표지와 같은 르네색 바인더(파랑→초록→노랑) + 왼쪽 링 + 슬리브 3×3 포켓 그리드 */
function StickerPage({ sbts, fallback }: { sbts: Sbt[] | null; fallback: boolean }) {
  return (
    <div className="w-full aspect-square rounded-[16px] p-3 sm:p-3.5 flex gap-2 shadow-[0_30px_70px_rgba(0,0,0,0.55)] ring-1 ring-black/15 bg-[linear-gradient(180deg,#e5392c,#c22a20)]">
      {/* 왼쪽 바인더 링 (바인딩) */}
      <div className="flex flex-col justify-around items-center py-4 -ml-0.5 shrink-0">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-3.5 h-3.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#9aa0aa_60%,#5a5f68)] shadow-[0_2px_4px_rgba(0,0,0,0.5)] ring-1 ring-black/30"
          />
        ))}
      </div>

      {/* 투명 슬리브 + 포켓 그리드 */}
      <div className="relative flex-1 min-w-0 rounded-[10px] bg-white/[0.16] border border-white/40 p-2 sm:p-2.5 overflow-hidden flex flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(118deg,transparent_35%,rgba(255,255,255,0.18)_45%,transparent_55%)]"
        />
        {fallback && (
          <div className="mb-1.5 text-center text-[9px] font-semibold text-white/90 leading-tight">
            ⚠ Sample badges — set a Renaiss profile for live SBTs
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
          {sbts === null
            ? Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-[6px] bg-white/40 animate-pulse" />
              ))
            : sbts
                .slice(0, 9)
                .map((s, i) => (
                  <Sticker key={s.id} sbt={s} index={i + 1} accent={s.color ?? PALETTE[i % PALETTE.length]} />
                ))}
        </div>
      </div>
    </div>
  );
}

/** 스티커 한 장 (포켓 안) — 번호 + 제목 + SBT 이미지 + Renaiss 푸터 */
function Sticker({ sbt, index, accent }: { sbt: Sbt; index: number; accent: string }) {
  return (
    <div className="group relative rounded-[6px] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] p-1.5 flex flex-col transition-transform duration-150 hover:-translate-y-1">
      {/* 상단: 번호 + 제목 */}
      <div className="flex items-center gap-1 min-w-0">
        <span
          className="shrink-0 text-[7px] font-bold text-neutral-900 rounded-full px-1 py-[1px] leading-none"
          style={{ background: accent }}
        >
          {String(index).padStart(3, "0")}
        </span>
        <span className="truncate text-[9px] font-bold text-neutral-800 leading-tight">{sbt.title}</span>
      </div>

      {/* SBT 이미지 (있으면 이미지, 없으면 색상+글리프 뱃지) */}
      <div className="flex-1 flex items-center justify-center py-1 min-h-0">
        {sbt.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sbt.imageUrl} alt={sbt.title} draggable={false} className="max-w-full max-h-full object-contain" />
        ) : (
          <span
            className="w-[64%] aspect-square rounded-full flex items-center justify-center text-[clamp(14px,2.6vw,24px)] font-black text-neutral-900"
            style={{
              background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.9), ${accent} 72%)`,
              boxShadow: `0 0 12px -3px ${accent}`,
            }}
          >
            {sbt.glyph ?? "◆"}
          </span>
        )}
      </div>

      {/* 푸터 */}
      <div className="text-center text-[6px] tracking-wide text-neutral-400 font-semibold">@Renaiss</div>
    </div>
  );
}
