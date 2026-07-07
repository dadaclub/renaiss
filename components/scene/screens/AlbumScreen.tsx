"use client";
import { useState } from "react";
import { useEffect } from "react";
import { ScreenShell } from "./ScreenShell";

/**
 * 앨범 — 띠부실(포켓몬 스티커) "COLLECT BOOK" 컨셉의 SBT 컬렉션북.
 * 투명 바인더(클리어 포켓 슬리브)에 스티커 카드가 4×4로 꽂힌 형태. 방 안 앨범이 펼쳐진 책이라 바로 페이지가 뜬다.
 * 스티커를 누르면 확대 상세(이름·설명)가 뜬다. 빈 포켓은 아직 안 모은 슬롯(눌러도 반응 없음).
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
  acquiredAt?: string; // 획득일(ISO). 데모 데이터 — API(SbtDto)엔 없음
}

const MOCK_SBTS: Sbt[] = [
  { id: 1, title: "OG Holder", description: "Held since day one.", glyph: "★", color: "#B78CFF", acquiredAt: "2024-01-14" },
  { id: 2, title: "First Pull", description: "First gacha pack.", glyph: "⚡", color: "#6FE8C8", acquiredAt: "2024-02-03" },
  { id: 3, title: "Top 100", description: "Top 100 collectors.", glyph: "♛", color: "#FFC65A", acquiredAt: "2024-03-21" },
  { id: 4, title: "Grail Owner", description: "Owns a PSA 10 grail.", glyph: "✦", color: "#FF8BA8", acquiredAt: "2024-04-09" },
  { id: 5, title: "Set Master", description: "Completed a set.", glyph: "◆", color: "#7FB2F0", acquiredAt: "2024-05-18" },
  { id: 6, title: "Diamond Hands", description: "Held a full cycle.", glyph: "❖", color: "#9BE8A0", acquiredAt: "2024-06-27" },
  { id: 7, title: "Trader", description: "First on-chain trade.", glyph: "⇄", color: "#F0A87F", acquiredAt: "2024-08-05" },
  { id: 8, title: "Curator", description: "Featured a showcase.", glyph: "✎", color: "#C7A0FF", acquiredAt: "2024-09-30" },
  { id: 9, title: "Genesis", description: "Minted at genesis.", glyph: "✺", color: "#7FE8D8", acquiredAt: "2024-11-11" },
];

/** ISO 날짜 → "Mar 21, 2024" 표기. 없으면 대시. */
function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const PALETTE = ["#B78CFF", "#6FE8C8", "#FFC65A", "#FF8BA8", "#7FB2F0", "#9BE8A0"];

const SLOTS = 16; // 4×4

type Picked = { sbt: Sbt; accent: string };

export function AlbumScreen({ onClose }: { onClose: () => void }) {
  const [sbts, setSbts] = useState<Sbt[] | null>(null);
  const [fallback, setFallback] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);

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
      <StickerBinder sbts={sbts} fallback={fallback} onPick={setPicked} />
      {picked && <StickerDetail picked={picked} onClose={() => setPicked(null)} />}
    </ScreenShell>
  );
}

/** 투명 바인더 — 왼쪽 링 + 클리어 포켓 슬리브 4×4 그리드 (방 배경이 비쳐 보임). */
function StickerBinder({
  sbts,
  fallback,
  onPick,
}: {
  sbts: Sbt[] | null;
  fallback: boolean;
  onPick: (p: Picked) => void;
}) {
  const cells = Array.from({ length: SLOTS }, (_, i) => sbts?.[i] ?? null);

  return (
    <div className="w-[min(92vw,540px)]">
      {/* 폴백 배너는 흐름 밖(상단 고정)으로 빼서 바인더가 화면 정중앙에 오게 함 */}
      {fallback && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-20 text-center text-[10px] font-semibold text-cream/80 whitespace-nowrap">
          ⚠ Sample badges — set a Renaiss profile for live SBTs
        </div>
      )}

      {/* 투명 바인더 본체 — 프로스티드 클리어 플라스틱 (backdrop-blur로 방이 비침) */}
      <div className="relative flex gap-2.5 rounded-[18px] p-3 sm:p-3.5 bg-white/[0.08] border border-white/25 backdrop-blur-md shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        {/* 광택 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[18px] bg-[linear-gradient(122deg,rgba(255,255,255,0.22),transparent_40%)]"
        />

        {/* 왼쪽 바인더 링 */}
        <div className="relative z-10 flex flex-col justify-around items-center py-3 -ml-0.5 shrink-0">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-3.5 h-3.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#c3c8d0_60%,#8a8f98)] shadow-[0_2px_4px_rgba(0,0,0,0.45)] ring-1 ring-black/20"
            />
          ))}
        </div>

        {/* 클리어 포켓 4×4 그리드 */}
        <div className="relative z-10 flex-1 min-w-0 grid grid-cols-4 gap-1.5 sm:gap-2">
          {cells.map((s, i) => {
            const accent = s?.color ?? PALETTE[i % PALETTE.length];
            return (
              <Pocket key={i}>
                {sbts === null ? (
                  <div className="h-full w-full rounded-[5px] bg-white/40 animate-pulse motion-reduce:animate-none" />
                ) : s ? (
                  <button
                    type="button"
                    onClick={() => onPick({ sbt: s, accent })}
                    aria-label={`${s.title} — view details`}
                    className="group h-full w-full rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-amber transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.03]"
                  >
                    <StickerCard sbt={s} accent={accent} />
                  </button>
                ) : null}
              </Pocket>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 클리어 포켓(슬리브) — 반투명, 방 배경이 살짝 비침. 안에 스티커 카드가 꽂힘. */
function Pocket({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative aspect-square rounded-[6px] bg-white/[0.07] border border-white/20 p-[3px] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(125deg,rgba(255,255,255,0.28),transparent_42%)]"
      />
      {children}
    </div>
  );
}

/** 색상+글리프 뱃지 (이미지 없을 때). size로 글리프 크기 조절. */
function BadgeGlyph({ glyph, accent, className }: { glyph: string; accent: string; className?: string }) {
  return (
    <span
      className={`aspect-square rounded-full flex items-center justify-center font-black text-neutral-900 ${className ?? ""}`}
      style={{
        background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.9), ${accent} 72%)`,
        boxShadow: `0 0 10px -3px ${accent}`,
      }}
    >
      {glyph}
    </span>
  );
}

/** 스티커 카드 (포켓 안) — 완전한 원형 뱃지(비율 유지, 가용 높이에 맞춰 축소) + 아래 이름 (안 겹침) */
function StickerCard({ sbt, accent }: { sbt: Sbt; accent: string }) {
  return (
    <div className="relative h-full w-full rounded-[5px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.28)] p-1 flex flex-col gap-0.5">
      {/* 뱃지 — 남은 높이에 맞춰 축소된 완전한 원 (잘라내기 없음) */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        {sbt.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sbt.imageUrl} alt={sbt.title} draggable={false} className="max-h-full max-w-full object-contain" />
        ) : (
          <BadgeGlyph glyph={sbt.glyph ?? "◆"} accent={accent} className="h-full max-w-full text-[clamp(14px,3vw,26px)]" />
        )}
      </div>

      {/* 이름 (뱃지 아래, 겹치지 않음) */}
      <div className="shrink-0 text-center text-[7px] font-bold text-neutral-800 truncate leading-tight">{sbt.title}</div>
    </div>
  );
}

/** 스티커 확대 상세 — 클릭한 스티커를 크게 + 이름·설명. 배경은 블러 포커스, 클릭/X로 닫음. */
function StickerDetail({ picked, onClose }: { picked: Picked; onClose: () => void }) {
  const { sbt, accent } = picked;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${sbt.title} details`}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(84vw,300px)] rounded-[20px] bg-white p-5 shadow-[0_30px_80px_rgba(0,0,0,0.6)] animate-[popIn_200ms_ease-out]"
      >
        {/* 닫기 */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 transition-colors flex items-center justify-center text-sm leading-none"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
          {/* 큰 뱃지/이미지 */}
          <div className="w-40 h-40 flex items-center justify-center">
            {sbt.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sbt.imageUrl} alt={sbt.title} draggable={false} className="max-w-full max-h-full object-contain" />
            ) : (
              <BadgeGlyph glyph={sbt.glyph ?? "◆"} accent={accent} className="w-full text-6xl" />
            )}
          </div>

          {/* 이름 + 설명 */}
          <div>
            <div className="text-neutral-900 font-black text-lg leading-tight">{sbt.title}</div>
            <p className="mt-1.5 text-neutral-500 text-sm leading-snug">{sbt.description}</p>
          </div>

          {/* 획득 날짜 */}
          <div className="mt-1 flex flex-col items-center gap-0.5 border-t border-neutral-100 pt-3 w-full">
            <span className="text-[10px] tracking-[0.22em] text-neutral-400 font-semibold uppercase">Acquired</span>
            <span className="text-neutral-700 text-sm font-medium">{formatDate(sbt.acquiredAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
