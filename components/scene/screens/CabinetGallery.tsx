"use client";
import { useEffect, useMemo, useState } from "react";

/** 전시모드가 필요로 하는 카드 최소 형태 (ShelfCard의 부분집합). */
interface GalleryCard {
  id: string;
  name: string;
  emoji: string;
  tint: string;
  imageUrl?: string;
}

const HOLD_MS = 4500; // 한 장 감상 시간 (globals.css의 gallery-spotlight 4.5s와 동기)

/**
 * 진열장 전시(갤러리) 모드 — 순수 감상용.
 * 검은 화면 중앙에 카드 한 장을 크게 스포트라이트(Ken Burns 줌)로 보여주고,
 * 배경엔 다른 카드들이 흐릿하게 천천히 흐른다(앰비언스). 정보/UI 없음.
 * 아무 데나 탭하거나 Esc로 나가면 진열장으로 복귀.
 */
export function CabinetGallery({ cards, onExit }: { cards: GalleryCard[]; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [hintGone, setHintGone] = useState(false);

  // 스포트라이트 자동 전환
  useEffect(() => {
    if (cards.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % cards.length), HOLD_MS);
    return () => clearInterval(t);
  }, [cards.length]);

  // 안내 문구는 잠깐 뒤 사라짐 (스크린세이버처럼)
  useEffect(() => {
    const t = setTimeout(() => setHintGone(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Esc로 갤러리만 닫기(진열장은 유지) — capture로 먼저 잡아 Scene의 Esc 핸들러 전파 차단
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onExit]);

  const card = cards[index] ?? cards[0];
  // 배경 드리프트용 — 카드가 적어도 줄이 차게 반복
  const driftRow = useMemo(() => {
    if (!cards.length) return [];
    const out: GalleryCard[] = [];
    while (out.length < 10) out.push(...cards);
    return out.slice(0, 10);
  }, [cards]);

  if (!card) return null;

  return (
    <div
      onClick={onExit}
      role="dialog"
      aria-label="Card gallery"
      className="fixed inset-0 z-[60] bg-black overflow-hidden cursor-pointer select-none"
    >
      {/* 배경 드리프트 — 흐릿하게 천천히 흐르는 카드들 (주인공 방해 안 하게 어둡게) */}
      <div aria-hidden className="absolute inset-0 opacity-[0.16] blur-[3px] motion-reduce:hidden">
        <div className="absolute top-[10%] left-0 flex gap-10 w-max animate-[gallery-drift_70s_linear_infinite]">
          {driftRow.concat(driftRow).map((c, i) => (
            <DriftThumb key={"a" + i} card={c} />
          ))}
        </div>
        <div className="absolute bottom-[10%] left-0 flex gap-10 w-max animate-[gallery-drift_90s_linear_infinite_reverse]">
          {driftRow.concat(driftRow).map((c, i) => (
            <DriftThumb key={"b" + i} card={c} />
          ))}
        </div>
      </div>

      {/* 비네트 — 가장자리 어둡게 해 주인공에 집중 */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_58%_68%_at_50%_50%,transparent_38%,rgba(0,0,0,0.9))]"
      />

      {/* 스포트라이트 — 주인공 카드 한 장 (key로 전환마다 애니메이션 재생) */}
      <div className="absolute inset-0 grid place-items-center p-8">
        <div
          key={index}
          // 폭·높이 둘 다 뷰포트 안에 맞춘다: 폭은 90vw 이하 + 높이(aspect)로 환산해도 72vh 이하.
          // (예전엔 높이 기준만이라 세로로 긴 모바일에서 카드 폭이 화면 폭을 넘어 잘렸음)
          className="relative w-[min(90vw,calc(72vh*63/88))] max-w-[400px] aspect-[63/88] animate-[gallery-spotlight_4.5s_ease-in-out_both] motion-reduce:animate-[gallery-fade_4.5s_ease-in-out_both]"
        >
          {/* 네온 글로우 */}
          <div
            aria-hidden
            className="absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,theme(colors.amber/35%),transparent_70%)] blur-2xl"
          />
          <CardArt card={card} />
        </div>
      </div>

      {/* 나가기 힌트 — 잠깐 뒤 페이드아웃 */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-cream/70 text-[11px] font-semibold uppercase tracking-[0.28em] transition-opacity duration-1000 ${
          hintGone ? "opacity-0" : "opacity-100"
        }`}
      >
        Tap anywhere to exit
      </div>
    </div>
  );
}

function CardArt({ card }: { card: GalleryCard }) {
  if (card.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={card.imageUrl}
        alt={card.name}
        draggable={false}
        className="w-full h-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.75)]"
      />
    );
  }
  return (
    <div
      className="w-full h-full rounded-2xl grid place-items-center border border-cream/15 shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
      style={{ background: card.tint }}
    >
      <span className="text-8xl">{card.emoji}</span>
    </div>
  );
}

function DriftThumb({ card }: { card: GalleryCard }) {
  return (
    <span
      className="block h-[22vh] aspect-[63/88] rounded-lg overflow-hidden shrink-0"
      style={card.imageUrl ? undefined : { background: card.tint }}
    >
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageUrl} alt="" draggable={false} className="w-full h-full object-cover" />
      ) : (
        <span className="grid place-items-center h-full text-4xl">{card.emoji}</span>
      )}
    </span>
  );
}
