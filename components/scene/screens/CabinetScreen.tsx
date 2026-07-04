"use client";
import { useEffect, useMemo, useState } from "react";
import { ROOM_IMG } from "@/lib/spots";
import { Chip } from "@/components/ui/Chip";
import { MOCK_CARDS, fmtUsd } from "@/lib/mockCards";

/**
 * 카드 진열장 화면.
 * 👉 이 파일 안에서만 자유롭게 작업. onClose = 방으로 돌아가기.
 *
 * 레이어 분리 (디자인 미확정 대응):
 *  1. 데이터 레이어 — ShelfCard 타입 + fetchOnchainCards/lookupCert.
 *     지금은 목이지만 시그니처는 실제 API(lib/api/bscscan, lib/api/psa)와 동일하게 유지.
 *  2. 스킨 레이어 — 파일 하단 Shelves/GradedSlab. 최종 아트가 나오면
 *     이 컴포넌트들만 갈아끼우면 됨 (로직 무손상).
 *
 * 카드 아트: card.imageUrl 이 있으면 실제 카드 이미지를 슬랩 안에 렌더.
 * 없으면 emoji+tint 플레이스홀더. (실카드 예시 이미지 받으면 mockCards에 채워넣기)
 */

/* ================= 데이터 레이어 ================= */

type CardOrigin = "onchain" | "physical";

interface ShelfCard {
  id: string;
  name: string;
  grade: string;
  franchise: string;
  emoji: string; // 이미지 없을 때 썸네일 대용
  tint: string;
  imageUrl?: string; // 실제 카드 이미지 (예: PSA imageUrlFront)
  priceUsd?: number;
  delta30d?: number;
  acquiredAt: string;
  origin: CardOrigin;
  certNumber?: string; // 실물 카드(PSA)만
}

/** 온체인 보유 카드 조회.
 *  1차: Renaiss 공개 API(/api/showcase 프록시)에서 실카드+이미지 로드 (데모: 마켓 상위 8장)
 *  폴백: 오프라인/장애 시 MOCK_CARDS
 *  TODO(A): bscscan으로 지갑 보유 tokenId 확보 → /api/showcase?ids= 로 교체 */
async function fetchOnchainCards(wallet: string): Promise<ShelfCard[]> {
  void wallet;
  try {
    const res = await fetch("/api/showcase");
    if (res.ok) {
      const { cards } = (await res.json()) as {
        cards: {
          tokenId: string;
          name: string;
          grade: string;
          franchise: string;
          priceUsd?: number;
          acquiredAt?: string;
          imageUrl?: string;
        }[];
      };
      if (cards.length > 0) {
        return cards.map((c, i) => ({
          id: c.tokenId,
          name: c.name,
          grade: c.grade,
          franchise: c.franchise,
          emoji: "🎴",
          tint: TINTS[i % TINTS.length],
          imageUrl: c.imageUrl,
          priceUsd: c.priceUsd,
          acquiredAt: c.acquiredAt ?? "",
          origin: "onchain" as const,
        }));
      }
    }
  } catch {
    // 폴백으로 진행
  }
  await new Promise((r) => setTimeout(r, 600)); // 목 레이턴시
  return MOCK_CARDS.map((c) => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    franchise: c.franchise,
    emoji: c.emoji,
    tint: c.tint,
    priceUsd: c.priceUsd,
    delta30d: c.delta30d,
    acquiredAt: c.acquiredAt,
    origin: "onchain" as const,
  }));
}

/** PSA 인증번호 조회. TODO(B): lib/api/psa.getCertByNumber 연동 후 교체 */
async function lookupCert(
  certNumber: string
): Promise<{ name: string; grade: string; franchise: string; imageUrl?: string }> {
  await new Promise((r) => setTimeout(r, 700));
  // 목: 번호 끝자리로 그럴듯한 결과 생성
  const last = certNumber.charCodeAt(certNumber.length - 1) % 3;
  const pool = [
    { name: "Pikachu Illustrator", grade: "PSA 9", franchise: "Pokémon" },
    { name: "Shanks Alt Art", grade: "PSA 10", franchise: "One Piece" },
    { name: "Umbreon VMAX Alt", grade: "PSA 10", franchise: "Pokémon" },
  ];
  return pool[last];
}

const TINTS = ["#38284A", "#22314A", "#1E3A38", "#46341E", "#1F3D2C"];
const today = () => new Date().toISOString().slice(0, 10).replaceAll("-", ".");

/* ================= 화면 로직 ================= */

type SortKey = "newest" | "oldest" | "priceHigh" | "priceLow";
type ModalState = null | "register";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  priceHigh: "Price: high → low",
  priceLow: "Price: low → high",
};

/** 정렬. 가격 미상(실물 미평가) 카드는 금액 정렬에서 맨 뒤로 */
function sortCards(cards: ShelfCard[], sort: SortKey): ShelfCard[] {
  const arr = [...cards];
  switch (sort) {
    case "newest":
      return arr.sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt));
    case "oldest":
      return arr.sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt));
    case "priceHigh":
      return arr.sort((a, b) => (b.priceUsd ?? -1) - (a.priceUsd ?? -1));
    case "priceLow":
      return arr.sort(
        (a, b) => (a.priceUsd ?? Number.MAX_SAFE_INTEGER) - (b.priceUsd ?? Number.MAX_SAFE_INTEGER)
      );
  }
}

interface PhysicalInput {
  name: string;
  grade: string;
  franchise: string;
  certNumber?: string;
  imageUrl?: string;
}

export function CabinetScreen({ onClose }: { onClose: () => void }) {
  const [cards, setCards] = useState<ShelfCard[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [modal, setModal] = useState<ModalState>(null);
  const [selected, setSelected] = useState<ShelfCard | null>(null);

  // 폰 로그인(목)을 이미 통과한 상태라는 전제 — 마운트 시 지갑 카드 자동 로드
  useEffect(() => {
    syncWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncWallet() {
    setSyncing(true);
    const onchain = await fetchOnchainCards("0xMOCK");
    setCards((prev) => [...onchain, ...prev.filter((c) => c.origin === "physical")]);
    setSyncing(false);
    setSynced(true);
  }

  function addPhysical(card: PhysicalInput) {
    // TODO: 새로고침하면 사라짐 — API 라우트 + 원격 저장소(Upstash/Neon) 붙일 것 (localStorage 금지)
    setCards((prev) => [
      ...prev,
      {
        ...card,
        id: `p${Date.now()}`,
        origin: "physical",
        acquiredAt: today(),
        emoji: "🃏",
        tint: TINTS[prev.length % TINTS.length],
      },
    ]);
    setModal(null);
  }

  function removeCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    setSelected(null);
  }

  const visible = useMemo(() => sortCards(cards, sort), [cards, sort]);

  // 패널 페이드인 연출용
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-bg">
      {/* 배경 = 메인 방. 최종 디자인은 "베이스 방(오브젝트 없음) + 오브젝트 컷아웃 레이어"
          구조라, 여기엔 베이스 방만 깔린다 (진열장 열림 = 캐비닛 오브젝트는 안 보임).
          아직 레이어 에셋이 없어 임시로 통짜 스케치(ROOM_IMG)를 사용 —
          베이스 방 이미지가 나오면 spots.ts의 이미지 상수만 갈아끼우면 됨. */}
      <RoomBackdrop />

      <button
        onClick={onClose}
        className="fixed top-6 left-6 z-10 bg-glass border border-glassline text-cream text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-md hover:border-amber hover:text-amber transition-colors"
      >
        ← Back to room
      </button>

      <div
        className={`relative h-full flex flex-col transition-all duration-500 ${
          shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        {/* 상단 — 작은 타이틀 + 떠 있는 컨트롤 (박스 없음) */}
        <div className="shrink-0 flex flex-col items-center gap-3 pt-6 pb-2 px-6">
          <h2 className="font-hand text-[32px] text-cream text-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            Card Showcase
          </h2>
          <div className="flex items-center gap-2 flex-wrap justify-center bg-glass/70 backdrop-blur-md border border-glassline rounded-full px-3 py-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort cards"
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-full border border-glassline bg-transparent text-creamdim hover:text-cream transition-colors outline-none cursor-pointer [&>option]:bg-inkdark [&>option]:text-cream"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
            <span className="text-[11px] text-creamdim font-semibold px-1">
              {syncing ? "Syncing wallet…" : synced ? `${visible.length} cards` : ""}
            </span>
            <button
              onClick={syncWallet}
              disabled={syncing}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-glassline text-creamdim hover:text-cream transition-colors disabled:opacity-50"
            >
              ⟳ Sync
            </button>
            <button
              onClick={() => setModal("register")}
              className="text-[11px] font-bold px-3.5 py-1.5 rounded-full bg-amber text-inkdark hover:brightness-110 transition"
            >
              + Add card
            </button>
          </div>
        </div>

        {/* 진열장 본체 — 화면 전체가 선반 벽 (상하 + 좌우 스크롤) */}
        <div className="flex-1 min-h-0 overflow-auto px-8 pt-8 pb-20">
          {syncing && cards.length === 0 ? (
            <Shelves
              cards={Array.from({ length: SHELF_SIZE * 2 }, () => null)}
              skeleton
              onSelect={() => {}}
            />
          ) : visible.length === 0 ? (
            <div className="h-[52vh] flex flex-col items-center justify-center gap-3 text-creamdim text-sm">
              <span className="text-3xl">🗄️</span>
              <p>This shelf is empty.</p>
              <button
                onClick={() => setModal("register")}
                className="text-[12px] font-bold px-4 py-2 rounded-full bg-amber text-inkdark hover:brightness-110 transition"
              >
                Register your first card
              </button>
            </div>
          ) : (
            <Shelves cards={visible} onSelect={setSelected} />
          )}
        </div>
      </div>

      {/* 투명 쇼케이스 유리문 — 화면 전체 사선 반사 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_28%,theme(colors.cream/4%)_36%,transparent_44%,transparent_58%,theme(colors.cream/3%)_64%,transparent_70%)]"
      />

      {modal === "register" && (
        <RegisterModal onSubmit={addPhysical} onSync={syncWallet} onClose={() => setModal(null)} />
      )}
      {selected && (
        <CardDetail card={selected} onRemove={removeCard} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/** 메인 방 배경. spots.ts의 ROOM_IMG를 그대로 읽음 → 이미지 교체 시 자동 반영.
 *  최종 레이어 구조가 오면 "베이스 방(오브젝트 없음)" 이미지를 가리키게 됨. */
function RoomBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ROOM_IMG}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover select-none blur-[3px] scale-[1.03]"
      />
      {/* 가독성 딤 — 선반이 배경 위에 바로 올라가므로 조금 더 어둡게 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_45%,theme(colors.bg/55%),theme(colors.bg/85%))]" />
    </div>
  );
}

/* ================= 등록 모달 ================= */

function RegisterModal({
  onSubmit,
  onSync,
  onClose,
}: {
  onSubmit: (c: PhysicalInput) => void;
  onSync: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<CardOrigin>("onchain");
  const [cert, setCert] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [franchise, setFranchise] = useState("Pokémon");
  const [imageUrl, setImageUrl] = useState("");
  const [looking, setLooking] = useState(false);

  async function handleLookup() {
    if (!cert.trim()) return;
    setLooking(true);
    const found = await lookupCert(cert.trim());
    setName(found.name);
    setGrade(found.grade);
    setFranchise(found.franchise);
    if (found.imageUrl) setImageUrl(found.imageUrl);
    setLooking(false);
  }

  const inputCls =
    "w-full bg-cream/[0.05] border border-glassline rounded-xl px-3.5 py-2.5 text-[13px] text-cream placeholder:text-creamdim/60 outline-none focus:border-amber transition-colors";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[min(92vw,420px)] bg-glass border border-glassline rounded-panel p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-cream font-bold text-lg">Add a card</h3>
        <div className="flex gap-2">
          <Chip active={mode === "onchain"} onClick={() => setMode("onchain")}>From wallet</Chip>
          <Chip active={mode === "physical"} onClick={() => setMode("physical")}>Physical card</Chip>
        </div>

        {mode === "onchain" ? (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-creamdim leading-relaxed">
              Cards in your Renaiss wallet are loaded automatically. Hit sync to refresh from chain.
            </p>
            <button
              onClick={() => { onSync(); onClose(); }}
              className="bg-amber text-inkdark font-bold rounded-xl px-5 py-2.5 text-sm hover:brightness-110 transition"
            >
              ⟳ Sync from wallet
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={cert}
                onChange={(e) => setCert(e.target.value)}
                placeholder="PSA cert number"
                className={inputCls}
              />
              <button
                onClick={handleLookup}
                disabled={looking || !cert.trim()}
                className="shrink-0 text-[12px] font-bold px-3.5 rounded-xl border border-glassline text-creamdim hover:text-cream transition-colors disabled:opacity-50"
              >
                {looking ? "…" : "Look up"}
              </button>
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Card name" className={inputCls} />
            <div className="flex gap-2">
              <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade (PSA 10)" className={inputCls} />
              <input value={franchise} onChange={(e) => setFranchise(e.target.value)} placeholder="Franchise" className={inputCls} />
            </div>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Card image URL (optional)"
              className={inputCls}
            />
            <button
              onClick={() =>
                name.trim() &&
                onSubmit({
                  name: name.trim(),
                  grade: grade.trim() || "Raw",
                  franchise: franchise.trim(),
                  certNumber: cert.trim() || undefined,
                  imageUrl: imageUrl.trim() || undefined,
                })
              }
              disabled={!name.trim()}
              className="bg-amber text-inkdark font-bold rounded-xl px-5 py-2.5 text-sm hover:brightness-110 transition disabled:opacity-40"
            >
              Add to showcase
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= 카드 상세 ================= */

function CardDetail({
  card,
  onRemove,
  onClose,
}: {
  card: ShelfCard;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const up = (card.delta30d ?? 0) >= 0;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[min(92vw,400px)] bg-glass border border-glassline rounded-panel p-6 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-[210px] drop-shadow-[0_0_35px_theme(colors.amber/30%)]">
          <GradedSlab card={card} large />
        </div>
        <div className="text-center">
          <div className="text-cream font-bold text-lg">{card.name}</div>
          <div className="text-[12px] text-creamdim font-semibold mt-0.5">
            {card.grade} · {card.franchise} · {card.acquiredAt || "—"}
          </div>
          <div className="text-[11px] font-bold mt-1.5">
            <span className="px-2 py-0.5 rounded-full bg-ambersoft text-amber">
              {card.origin === "onchain" ? "⛓ On-chain" : `📦 Physical${card.certNumber ? ` · #${card.certNumber}` : ""}`}
            </span>
          </div>
        </div>
        {card.priceUsd !== undefined && (
          <div className="text-center">
            <div className="text-cream text-xl font-extrabold">{fmtUsd(card.priceUsd)}</div>
            {card.delta30d !== undefined && (
              <div className={`text-[11px] font-bold ${up ? "text-up" : "text-down"}`}>
                {up ? "▲" : "▼"} {Math.abs(card.delta30d).toFixed(1)}% · 30d
              </div>
            )}
          </div>
        )}
        {card.origin === "physical" && (
          <button
            onClick={() => onRemove(card.id)}
            className="text-[11px] font-bold text-down/80 hover:text-down transition-colors"
          >
            Remove from showcase
          </button>
        )}
      </div>
    </div>
  );
}

/* ================= 스킨 레이어 =================
 * 최종 진열장 아트가 나오면 아래 컴포넌트만 교체.
 * 카드 클릭 콜백/데이터 계약은 그대로 유지할 것. */

const SHELF_SIZE = 4; // 선반 한 단에 놓이는 카드 수 (넘치면 가로 스크롤)
const CARD_W = "w-[160px]"; // 카드 고정 폭 — 선반이 화면보다 넓어지면 좌우 스크롤

/** 월 레지 선반 여러 단 — 얇은 선반 턱 위에 카드가 정면으로 빽빽하게 서 있음.
 *  레퍼런스: 카드샵 월 디스플레이 + 투명 쇼케이스.
 *  카드 폭이 고정이라 한 단이 화면보다 넓으면 컨테이너에서 좌우 스크롤됨. */
function Shelves({
  cards,
  onSelect,
  skeleton = false,
}: {
  cards: (ShelfCard | null)[];
  onSelect: (c: ShelfCard) => void;
  skeleton?: boolean;
}) {
  const rows: (ShelfCard | null)[][] = [];
  for (let i = 0; i < cards.length; i += SHELF_SIZE) rows.push(cards.slice(i, i + SHELF_SIZE));

  return (
    <div className="w-max min-w-full flex flex-col items-center">
      {/* 선반 개수 = 카드 수에 맞춤. 선반 길이는 가장 긴 단에 맞춰 전부 동일 —
          덜 찬 단은 같은 길이 선반 위에서 중앙 정렬 (가구처럼 위아래 폭 일치) */}
      <div className="w-max flex flex-col gap-7">
        {rows.map((row, r) => (
          <div key={r}>
            {/* 카드들 — 선반 턱 위에 정면으로 서 있음 */}
            <div className="flex items-end justify-center gap-5 px-6">
              {row.map((card, i) =>
                card && !skeleton ? (
                  <button
                    key={card.id}
                    onClick={() => onSelect(card)}
                    className={`group relative ${CARD_W} shrink-0 transition-transform duration-200 hover:-translate-y-1.5 focus-visible:-translate-y-1.5 outline-none`}
                  >
                    {/* 스포트라이트 */}
                    <span
                      aria-hidden
                      className="absolute -inset-x-2 -top-3 -bottom-1 bg-[radial-gradient(ellipse_at_bottom,theme(colors.amber/14%),transparent_68%)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    />
                    <GradedSlab card={card} />
                  </button>
                ) : (
                  <div
                    key={i}
                    className={`${CARD_W} shrink-0 aspect-[5/7] rounded-[6px] ${
                      skeleton ? "bg-cream/[0.04] border border-glassline animate-pulse" : ""
                    }`}
                  />
                )
              )}
            </div>
            {/* 얇은 선반 턱 (월 레지) — 카드 너비에 맞춰 끝남 */}
            <div className="h-[3px] bg-cream/30 rounded-t-[1px]" />
            <div className="h-[7px] rounded-b-[2px] bg-gradient-to-b from-inkdark to-bg shadow-[0_12px_24px_-6px_theme(colors.amber/20%)]" />
            {/* 선반 아래 은은한 벽 그림자 */}
            <div className="h-4 bg-[linear-gradient(180deg,theme(colors.bg/70%),transparent)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** PSA 스타일 등급 슬랩 — 라벨(이름+등급) + 카드 아트.
 *  imageUrl 있으면 실카드 이미지, 없으면 emoji+tint 플레이스홀더 */
function GradedSlab({ card, large = false }: { card: ShelfCard; large?: boolean }) {
  return (
    <div className="relative rounded-[10px] border border-cream/25 bg-gradient-to-b from-cream/[0.10] to-cream/[0.03] p-[5%] shadow-[inset_0_1px_0_theme(colors.cream/20%),0_6px_18px_rgba(0,0,0,0.45)]">
      {/* 라벨 */}
      <div className="flex items-center justify-between gap-1 rounded-[5px] bg-inkdark border border-glassline px-[7%] py-[4%] mb-[5%]">
        <span className={`font-bold text-cream truncate ${large ? "text-[11px]" : "text-[9px]"}`}>
          {card.name}
        </span>
        <span
          className={`shrink-0 font-extrabold rounded-[3px] bg-amber text-inkdark px-1 ${large ? "text-[11px]" : "text-[9px]"}`}
        >
          {card.grade}
        </span>
      </div>
      {/* 카드 아트 */}
      <div
        className="aspect-[5/7] rounded-[6px] overflow-hidden border border-cream/10 flex items-center justify-center"
        style={card.imageUrl ? undefined : { background: card.tint }}
      >
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <span className={large ? "text-6xl" : "text-3xl"}>{card.emoji}</span>
        )}
      </div>
      {/* 케이스 사선 광택 */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(120deg,transparent_35%,theme(colors.cream/7%)_45%,transparent_55%)] pointer-events-none"
      />
    </div>
  );
}
