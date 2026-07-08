"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowsClockwise,
  Cards,
  CaretDown,
  LinkSimple,
  Package,
  PencilSimple,
  Plus,
  TrendDown,
  TrendUp,
  Warning,
} from "@phosphor-icons/react";
import { ROOM_IMG } from "@/lib/spots";
import { APITCG_GAMES } from "@/lib/api/apitcgGames";
import { Chip } from "@/components/ui/Chip";
import { fmtUsd } from "@/lib/mockCards";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { supabase } from "@/lib/supabase";
import { useRoom } from "../RoomContext";

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
  tokenId?: string; // 온체인 카드만 (Renaiss tokenId)
  /** Supabase에 저장된 카드 (직접 등록) — 동기화 때 유지되고 수정/삭제 가능 */
  fromDb?: boolean;
}

/** Renaiss 쇼케이스 카드 조회.
 *  /api/showcase = 공개 프로필의 favoritedCollectibles (유저가 직접 올린 카드). 비면 빈 배열.
 *  실패(오프라인/장애) 시에만 fromFallback=true — 가짜 카드는 더 이상 채우지 않고 빈 선반 유지.
 *  참고: 공개 API엔 "지갑주소 보유 카드" 엔드포인트가 없어 유저 ID 쇼케이스만 유저 스코프. */
async function fetchOnchainCards(user?: string): Promise<{ cards: ShelfCard[]; fromFallback: boolean }> {
  try {
    const res = await fetch(`/api/showcase${user ? `?user=${encodeURIComponent(user)}` : ""}`);
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
      return {
        fromFallback: false,
        cards: cards.map((c, i) => ({
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
        })),
      };
    }
  } catch {
    // 아래 실패 처리
  }
  return { fromFallback: true, cards: [] };
}

/** Supabase showcase_cards 테이블의 행 — 직접 등록한 카드(실물/온체인)의 원격 저장분 */
interface SavedRow {
  id: string;
  name: string;
  grade: string;
  franchise: string | null;
  image_url: string | null;
  acquired_at: string;
  origin?: CardOrigin | null; // 컬럼 추가 전 행은 null → physical 취급
  token_id?: string | null;
}

function rowToCard(r: SavedRow, i: number): ShelfCard {
  return {
    id: r.id,
    name: r.name,
    grade: r.grade,
    franchise: r.franchise ?? "",
    emoji: "🃏",
    tint: TINTS[i % TINTS.length],
    imageUrl: r.image_url ?? undefined,
    acquiredAt: r.acquired_at,
    origin: r.origin === "onchain" ? "onchain" : "physical",
    tokenId: r.token_id ?? undefined,
    fromDb: true,
  };
}

/** 직접 등록한 카드 로드 (Supabase) — 해당 방(room_id)의 카드만. 테이블 미생성/장애 시 빈 배열. */
async function fetchSavedCards(roomId: string): Promise<ShelfCard[]> {
  // room_id 컬럼이 있으면 그 방 카드만, 없으면(구스키마) 전체 — 폴백 안전
  let res = await supabase
    .from("showcase_cards")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (res.error) {
    res = await supabase.from("showcase_cards").select("*").order("created_at", { ascending: true });
  }
  if (res.error || !res.data) return [];
  return (res.data as SavedRow[]).map(rowToCard);
}

/** 온체인 카드 수동 등록용 — /api/showcase?ids= 응답 카드 */
interface OnchainCardDto {
  tokenId: string;
  name: string;
  grade: string;
  franchise: string;
  priceUsd?: number;
  acquiredAt?: string;
  imageUrl?: string;
}

/** 원피스 카드 검색 결과 (apitcg 프록시 /api/opcard 응답 카드). 실물 카드 등록 시 이미지 자동 채움용. */
interface OpSearchCard {
  id: string;
  name: string;
  imageUrl: string;
  rarity?: string;
  type?: string;
  setName?: string;
  /** 전체 게임 검색 시 이 카드가 속한 게임/프랜차이즈 (서버가 채움) */
  game?: string;
  franchise?: string;
}

const TINTS = ["#38284A", "#22314A", "#1E3A38", "#46341E", "#1F3D2C"];
const today = () => new Date().toISOString().slice(0, 10).replaceAll("-", ".");

/* ================= 화면 로직 ================= */

type SortKey = "newest" | "oldest" | "priceHigh" | "priceLow";
type ModalState = null | "register" | { edit: ShelfCard };

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  oldest: "Oldest",
  priceHigh: "Price high",
  priceLow: "Price low",
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
  const { room, isOwnRoom } = useRoom(); // 현재 보는 방 — 방문 중이면 isOwnRoom=false(읽기 전용)
  const [cards, setCards] = useState<ShelfCard[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState(false); // 실시간 동기화 실패 → 목데이터로 대체됨
  const [sort, setSort] = useState<SortKey>("newest");
  const [modal, setModal] = useState<ModalState>(null);
  const [selected, setSelected] = useState<ShelfCard | null>(null);

  // 마운트 시 이 방 주인의 온체인 카드 + 등록 카드 자동 로드
  useEffect(() => {
    syncWallet();
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncWallet() {
    setSyncing(true);
    const { cards: onchain, fromFallback } = await fetchOnchainCards(room.renaissUser);
    // 직접 등록한 카드(fromDb — 실물/온체인 모두)는 동기화로 덮어쓰지 않는다
    setCards((prev) => [...onchain, ...prev.filter((c) => c.fromDb)]);
    setSyncing(false);
    setSynced(true);
    setSyncError(fromFallback);
  }

  /** Supabase에 저장해둔 등록 카드 로드 — 이 방(room.id)의 카드만, 새로고침해도 유지 */
  async function loadSaved() {
    const saved = await fetchSavedCards(room.id);
    if (saved.length === 0) return;
    setCards((prev) => [...prev.filter((c) => !c.fromDb), ...saved]);
  }

  /** Supabase에 카드 저장 후 선반에 추가 — 실물/온체인 공용 */
  async function saveCard(
    input: PhysicalInput & { origin: CardOrigin; tokenId?: string; priceUsd?: number },
    acquiredAt: string
  ) {
    // 원격 저장 (Supabase) — 실패해도 화면에는 추가하되 그 카드는 새로고침 시 사라짐
    let id = `p${Date.now()}`;
    const base = {
      name: input.name,
      grade: input.grade,
      franchise: input.franchise,
      image_url: input.imageUrl ?? null,
      acquired_at: acquiredAt,
    };
    let { data } = await supabase
      .from("showcase_cards")
      .insert({ ...base, origin: input.origin, token_id: input.tokenId ?? null, room_id: room.id })
      .select("id")
      .single();
    if (!data) {
      // origin/token_id/room_id 컬럼이 아직 없는 구스키마 — 기본 필드만으로 재시도
      ({ data } = await supabase.from("showcase_cards").insert(base).select("id").single());
    }
    if (data) id = (data as { id: string }).id;
    setCards((prev) => [
      ...prev,
      {
        ...input,
        id,
        acquiredAt,
        emoji: "🃏",
        tint: TINTS[prev.length % TINTS.length],
        fromDb: true,
      },
    ]);
    setModal(null);
  }

  async function addPhysical(card: PhysicalInput) {
    await saveCard({ ...card, origin: "physical" }, today());
  }

  /** 온체인 카드 수동 등록 — 토큰ID로 Renaiss에서 조회한 카드를 저장 */
  async function addOnchain(dto: OnchainCardDto) {
    // 이미 선반에 있는 토큰이면 중복 등록 방지
    if (cards.some((c) => c.tokenId === dto.tokenId || c.id === dto.tokenId)) {
      setModal(null);
      return;
    }
    await saveCard(
      {
        name: dto.name,
        grade: dto.grade || "Raw",
        franchise: dto.franchise,
        imageUrl: dto.imageUrl,
        origin: "onchain",
        tokenId: dto.tokenId,
        priceUsd: dto.priceUsd,
      },
      dto.acquiredAt ?? today()
    );
  }

  /** 실물 카드 정보 수정 — 검색으로 다시 고르거나 필드를 직접 고침 */
  function updatePhysical(id: string, input: PhysicalInput) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)));
    setModal(null);
    void supabase
      .from("showcase_cards")
      .update({
        name: input.name,
        grade: input.grade,
        franchise: input.franchise,
        image_url: input.imageUrl ?? null,
      })
      .eq("id", id)
      .then();
  }

  function removeCard(id: string) {
    const target = cards.find((c) => c.id === id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setSelected(null);
    if (target?.fromDb) {
      void supabase.from("showcase_cards").delete().eq("id", id).then();
    }
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
        className="fixed top-6 left-6 z-10 inline-flex items-center gap-1.5 bg-glass border border-glassline text-cream text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-md hover:border-amber hover:text-amber transition-colors"
      >
        <ArrowLeft size={14} weight="bold" aria-hidden />
        Back to room
      </button>

      <div
        className={`relative h-full flex flex-col transition-all duration-500 ${
          shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        {/* 상단 — 떠 있는 컨트롤 (타이틀 없음). 좁은 화면에선 고정 Back 버튼 아래로 내림 */}
        <div className="shrink-0 flex flex-col items-center gap-3 pt-[72px] lg:pt-6 pb-2 px-6">
          <div className="flex items-center gap-2 flex-wrap justify-center bg-glass/70 backdrop-blur-md border border-glassline rounded-full px-3 py-2">
            {/* 정렬 — 네이티브 select 대신 브랜드 Chip 토글 */}
            <div aria-label="Sort cards" className="flex items-center gap-1.5">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <Chip key={k} active={sort === k} onClick={() => setSort(k)}>
                  {SORT_LABELS[k]}
                </Chip>
              ))}
            </div>
            <span className="w-px h-4 bg-glassline" aria-hidden />
            {/* 동기화는 Add card 모달의 From Renaiss 탭으로 통일 — 여기는 상태 표시만 */}
            <span className="text-[12px] text-creamdim font-semibold px-1">
              {syncing ? "Loading…" : synced ? `${visible.length} cards` : ""}
            </span>
          </div>
          {syncError && (
            <div className="flex items-center gap-2 text-[12px] font-semibold text-creamdim bg-glass/70 backdrop-blur-md border border-glassline rounded-full px-3.5 py-1.5">
              <Warning size={13} weight="fill" className="shrink-0 text-down" aria-hidden />
              <span>Couldn&apos;t reach Renaiss. Your registered cards are still shown.</span>
              <button
                onClick={syncWallet}
                disabled={syncing}
                className="text-amber hover:brightness-110 transition disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}
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
              <Cards size={42} weight="duotone" className="text-amber/80" aria-hidden />
              <p>{isOwnRoom ? "This shelf is empty." : `${room.ownerName} hasn't added any cards yet.`}</p>
              {isOwnRoom && (
                <button
                  onClick={() => setModal("register")}
                  className="text-[12px] font-bold px-4 py-2 rounded-full bg-amber text-inkdark hover:brightness-110 transition"
                >
                  Register your first card
                </button>
              )}
            </div>
          ) : (
            // 방문 중(읽기 전용)엔 Add 슬롯 없음
            <Shelves
              cards={visible}
              onSelect={setSelected}
              onAdd={isOwnRoom ? () => setModal("register") : undefined}
            />
          )}
        </div>
      </div>

      {/* 투명 쇼케이스 유리문 — 화면 전체 사선 반사 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_28%,theme(colors.cream/4%)_36%,transparent_44%,transparent_58%,theme(colors.cream/3%)_64%,transparent_70%)]"
      />

      {modal === "register" && (
        <RegisterModal
          onSubmit={addPhysical}
          onAddOnchain={addOnchain}
          onSync={syncWallet}
          onClose={() => setModal(null)}
        />
      )}
      {modal !== null && modal !== "register" && (
        <RegisterModal
          initial={modal.edit}
          onSubmit={(c) => updatePhysical(modal.edit.id, c)}
          onAddOnchain={addOnchain}
          onSync={syncWallet}
          onClose={() => setModal(null)}
        />
      )}
      {selected && (
        <CardDetail
          card={selected}
          readOnly={!isOwnRoom}
          onRemove={removeCard}
          onEdit={(c) => {
            setSelected(null);
            setModal({ edit: c });
          }}
          onClose={() => setSelected(null)}
        />
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
  initial,
  onSubmit,
  onAddOnchain,
  onSync,
  onClose,
}: {
  /** 있으면 수정 모드 — 기존 실물 카드 값을 채워서 열고, 저장 시 그 카드를 덮어씀 */
  initial?: ShelfCard;
  onSubmit: (c: PhysicalInput) => void;
  onAddOnchain: (c: OnchainCardDto) => void;
  onSync: () => void;
  onClose: () => void;
}) {
  const editing = initial !== undefined;
  const [mode, setMode] = useState<CardOrigin>(editing ? "physical" : "onchain");
  const [name, setName] = useState(initial?.name ?? "");
  const [grade, setGrade] = useState(initial?.grade ?? "");
  const [franchise, setFranchise] = useState(initial?.franchise ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  // TCG 카드 검색 (apitcg 프록시 /api/opcard) — 기본은 전체 게임, 드롭다운으로 한정 가능
  const [gameId, setGameId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpSearchCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  // 검색 DB(영어판)에 없는 카드(일본판 프로모 등)용 — 평소엔 숨기고 요청 시에만 노출
  const [showImageInput, setShowImageInput] = useState(false);
  // 온체인 카드 토큰ID 수동 등록
  const [tokenId, setTokenId] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEscapeToClose(onClose);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(false);
    try {
      const res = await fetch(
        `/api/opcard?name=${encodeURIComponent(query.trim())}&game=${encodeURIComponent(gameId)}`
      );
      const d = (await res.json()) as { cards?: OpSearchCard[] };
      setResults(res.ok && d.cards ? d.cards : []);
    } catch {
      setResults([]);
    }
    setSearching(false);
    setSearched(true);
  }

  /** 토큰ID로 온체인 카드 조회 → 등록 (Renaiss 공개 API /v0/cards/{tokenId}) */
  async function handleAddByTokenId() {
    const id = tokenId.trim();
    if (!id) return;
    setTokenLoading(true);
    setTokenError(false);
    try {
      const res = await fetch(`/api/showcase?ids=${encodeURIComponent(id)}`);
      const d = (await res.json()) as { cards?: OnchainCardDto[] };
      if (res.ok && d.cards && d.cards.length > 0) {
        onAddOnchain(d.cards[0]);
      } else {
        setTokenError(true);
      }
    } catch {
      setTokenError(true);
    }
    setTokenLoading(false);
  }

  /** 게임 전환 — 이전 게임의 검색 결과/선택을 비운다 */
  function switchGame(id: string) {
    setGameId(id);
    setResults([]);
    setSearched(false);
    setPickedId(null);
  }

  /** 검색 결과 카드 선택 → 이름·이미지·프랜차이즈 자동 채움 (등급만 수동) */
  function pickCard(c: OpSearchCard) {
    setPickedId(c.id);
    setName(c.name);
    setImageUrl(c.imageUrl);
    setFranchise(c.franchise ?? APITCG_GAMES.find((g) => g.id === gameId)?.franchise ?? "");
  }

  const inputCls =
    "w-full bg-cream/[0.05] border border-glassline rounded-xl px-3.5 py-2.5 text-[13px] text-cream placeholder:text-creamdim/60 outline-none focus:border-amber transition-colors";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/70 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit card" : "Add a card"}
        tabIndex={-1}
        className="w-[min(92vw,420px)] bg-glass border border-glassline rounded-panel p-6 flex flex-col gap-4 outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-cream font-bold text-lg">{editing ? "Edit card" : "Add a card"}</h3>
        {!editing && (
          <div className="flex gap-2">
            <Chip active={mode === "onchain"} onClick={() => setMode("onchain")}>From Renaiss</Chip>
            <Chip active={mode === "physical"} onClick={() => setMode("physical")}>Physical card</Chip>
          </div>
        )}

        {mode === "onchain" ? (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-creamdim leading-relaxed">
              Cards you showcase on your Renaiss profile load here automatically. Refresh to pull the latest.
            </p>
            <button
              onClick={() => { onSync(); onClose(); }}
              className="inline-flex items-center justify-center gap-1.5 bg-amber text-inkdark font-bold rounded-xl px-5 py-2.5 text-sm hover:brightness-110 transition"
            >
              <ArrowsClockwise size={14} weight="bold" aria-hidden />
              Refresh from Renaiss
            </button>
            {/* 쇼케이스에 없는 온체인 카드 — Renaiss tokenId로 직접 등록 */}
            <div className="flex items-center gap-2" aria-hidden>
              <span className="flex-1 h-px bg-glassline" />
              <span className="text-[10px] font-bold text-creamdim/70 uppercase tracking-wider">
                or add one card
              </span>
              <span className="flex-1 h-px bg-glassline" />
            </div>
            <p className="text-[12px] text-creamdim leading-relaxed -mb-1">
              Paste a token ID from any Renaiss card page to pin that card to your shelf.
            </p>
            <div className="flex gap-2">
              <input
                value={tokenId}
                onChange={(e) => { setTokenId(e.target.value); setTokenError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddByTokenId()}
                placeholder="Token ID"
                className={inputCls}
              />
              <button
                onClick={handleAddByTokenId}
                disabled={tokenLoading || !tokenId.trim()}
                className="shrink-0 text-[12px] font-bold px-3.5 rounded-xl border border-glassline text-creamdim hover:text-cream transition-colors disabled:opacity-50"
              >
                {tokenLoading ? "…" : "Add"}
              </button>
            </div>
            {tokenError && (
              <p className="flex items-start gap-1.5 text-[11px] text-creamdim leading-relaxed -mt-1">
                <Warning size={13} weight="fill" className="shrink-0 mt-px text-down" aria-hidden />
                Couldn&apos;t find a card with that token ID.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* 카드 검색 — 기본 전체 게임, 드롭다운으로 한 게임만 한정 가능 */}
            <div className="flex gap-2">
              <GameSelect value={gameId} onChange={switchGame} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={
                  gameId === "all" || APITCG_GAMES.find((g) => g.id === gameId)?.codeSearch
                    ? "Card name or code (e.g. OP01-016)"
                    : "Card name"
                }
                className={inputCls}
              />
              <button
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className="shrink-0 text-[12px] font-bold px-3.5 rounded-xl border border-glassline text-creamdim hover:text-cream transition-colors disabled:opacity-50"
              >
                {searching ? "…" : "Search"}
              </button>
            </div>

            {/* 검색 결과 그리드 — 카드 클릭 시 이름·이미지 자동 채움 */}
            {results.length > 0 && (
              <div className="grid grid-cols-4 gap-2 max-h-[188px] overflow-y-auto pr-1">
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickCard(c)}
                    title={`${c.name}${c.setName ? ` · ${c.setName}` : ""}`}
                    className={`rounded-md overflow-hidden border transition ${
                      pickedId === c.id ? "border-amber ring-2 ring-amber" : "border-glassline hover:border-cream/50"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.imageUrl} alt={c.name} draggable={false} className="w-full aspect-[5/7] object-cover" />
                    {/* 카드 코드 — 같은 캐릭터 판본이 수십 장일 때 유일한 구분자.
                        일본판은 내부 id 대신 세트코드(SM8b 등)가 카드 실물 라벨과 대응 */}
                    <span className="block text-center text-[9px] font-bold text-creamdim py-0.5 truncate">
                      {c.id.startsWith("jp-") && c.setName ? c.setName : c.id}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {searched && !searching && results.length === 0 && (
              <p className="flex items-start gap-1.5 text-[11px] text-creamdim leading-relaxed -mt-1">
                <Warning size={13} weight="fill" className="shrink-0 mt-px text-down" aria-hidden />
                No cards found. You can still fill in the details manually below.
              </p>
            )}

            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Card name" className={inputCls} />
            <div className="flex gap-2">
              <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade (PSA 10)" className={inputCls} />
              <input value={franchise} onChange={(e) => setFranchise(e.target.value)} placeholder="Franchise" className={inputCls} />
            </div>
            {/* 이미지 URL은 검색에서 카드를 고르면 자동 세팅.
                검색 DB에 없는 카드(일본판 프로모 등)만 직접 URL을 붙일 수 있게 토글로 제공 */}
            {showImageInput ? (
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Card image URL"
                className={inputCls}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowImageInput(true)}
                className="self-start text-[11px] font-semibold text-creamdim hover:text-cream transition-colors"
              >
                Can&apos;t find your card? Paste an image URL
              </button>
            )}
            <button
              onClick={() =>
                name.trim() &&
                onSubmit({
                  name: name.trim(),
                  grade: grade.trim() || "Raw",
                  franchise: franchise.trim(),
                  imageUrl: imageUrl.trim() || undefined,
                })
              }
              disabled={!name.trim()}
              className="bg-amber text-inkdark font-bold rounded-xl px-5 py-2.5 text-sm hover:brightness-110 transition disabled:opacity-40"
            >
              {editing ? "Save changes" : "Add to showcase"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 게임 한정 드롭다운 — 기본 All games. 누르면 목록이 펼쳐지고, 고르면 접힘.
 *  게임 목록은 lib/api/apitcgGames.ts에서 (새 게임 추가 시 자동 반영) */
function GameSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 접기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const label = value === "all" ? "All games" : APITCG_GAMES.find((g) => g.id === value)?.label;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-full inline-flex items-center gap-1.5 text-[12px] font-bold px-3 rounded-xl bg-cream/[0.05] border border-glassline text-creamdim hover:text-cream transition-colors"
      >
        {label}
        <CaretDown
          size={12}
          weight="bold"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Search game"
          className="absolute left-0 top-[calc(100%+6px)] z-10 w-max min-w-full max-h-[220px] overflow-y-auto bg-inkdark border border-glassline rounded-xl p-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        >
          {[{ id: "all", label: "All games" }, ...APITCG_GAMES].map((g) => (
            <li key={g.id} role="option" aria-selected={g.id === value}>
              <button
                type="button"
                onClick={() => { onChange(g.id); setOpen(false); }}
                className={`w-full text-left text-[12px] font-bold px-3 py-2 rounded-lg transition-colors ${
                  g.id === value ? "text-amber bg-ambersoft" : "text-creamdim hover:text-cream hover:bg-cream/[0.05]"
                }`}
              >
                {g.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================= 카드 상세 ================= */

function CardDetail({
  card,
  readOnly = false,
  onRemove,
  onEdit,
  onClose,
}: {
  card: ShelfCard;
  /** 방문 중(남의 방) — 수정·삭제 숨김 */
  readOnly?: boolean;
  onRemove: (id: string) => void;
  onEdit: (c: ShelfCard) => void;
  onClose: () => void;
}) {
  const up = (card.delta30d ?? 0) >= 0;
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEscapeToClose(onClose);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/70 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${card.name} details`}
        tabIndex={-1}
        className="w-[min(92vw,400px)] bg-glass border border-glassline rounded-panel p-6 flex flex-col items-center gap-4 outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-[210px] drop-shadow-[0_0_35px_theme(colors.amber/30%)]">
          <GradedSlab card={card} large />
        </div>
        <div className="text-center">
          <div className="text-cream font-bold text-lg">{card.name}</div>
          <div className="text-[12px] text-creamdim font-semibold mt-0.5">
            {card.grade} · {card.franchise}
            {card.acquiredAt ? ` · ${card.acquiredAt}` : ""}
          </div>
          <div className="text-[12px] font-bold mt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ambersoft text-amber">
              {card.origin === "onchain" ? (
                <>
                  <LinkSimple size={11} weight="bold" aria-hidden />
                  On-chain
                </>
              ) : (
                <>
                  <Package size={11} weight="bold" aria-hidden />
                  Physical{card.certNumber ? ` · #${card.certNumber}` : ""}
                </>
              )}
            </span>
          </div>
        </div>
        {card.priceUsd !== undefined && (
          <div className="text-center">
            <div className="text-cream text-xl font-extrabold">{fmtUsd(card.priceUsd)}</div>
            {card.delta30d !== undefined && (
              <div
                className={`inline-flex items-center gap-1 text-[12px] font-bold ${up ? "text-up" : "text-down"}`}
              >
                {up ? (
                  <TrendUp size={12} weight="bold" aria-hidden />
                ) : (
                  <TrendDown size={12} weight="bold" aria-hidden />
                )}
                {Math.abs(card.delta30d).toFixed(1)}% · 30d
              </div>
            )}
          </div>
        )}
        {/* 직접 등록한 카드(실물/온체인 수동 등록)만 수정·삭제. 방문 중(readOnly)엔 숨김 */}
        {!readOnly && (card.origin === "physical" || card.fromDb) && (
          confirmingRemove ? (
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="text-creamdim">Remove for good?</span>
              <button
                onClick={() => onRemove(card.id)}
                className="text-down hover:brightness-110 transition"
              >
                Yes, remove
              </button>
              <button
                onClick={() => setConfirmingRemove(false)}
                className="text-creamdim hover:text-cream transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => onEdit(card)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-creamdim hover:text-amber transition-colors"
              >
                <PencilSimple size={12} weight="bold" aria-hidden />
                Edit card
              </button>
              <button
                onClick={() => setConfirmingRemove(true)}
                className="text-[11px] font-bold text-down/80 hover:text-down transition-colors"
              >
                Remove from showcase
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ================= 스킨 레이어 =================
 * 최종 진열장 아트가 나오면 아래 컴포넌트만 교체.
 * 카드 클릭 콜백/데이터 계약은 그대로 유지할 것. */

const SHELF_SIZE = 6; // 선반 한 단에 놓이는 카드 수 (넘치면 가로 스크롤)
// 카드 폭 — 화면 폭에 따라 96~140px 자동 조절 (좁은 창에서도 한 단이 들어가게)
const CARD_W = "w-[clamp(96px,11vw,140px)]";

/** 월 레지 선반 여러 단 — 얇은 선반 턱 위에 카드가 정면으로 빽빽하게 서 있음.
 *  레퍼런스: 카드샵 월 디스플레이 + 투명 쇼케이스.
 *  카드 폭이 고정이라 한 단이 화면보다 넓으면 컨테이너에서 좌우 스크롤됨. */
function Shelves({
  cards,
  onSelect,
  onAdd,
  skeleton = false,
}: {
  cards: (ShelfCard | null)[];
  onSelect: (c: ShelfCard) => void;
  /** 있으면 마지막 카드 뒤 칸에 "Add card" 슬롯을 붙인다 (선반 정렬과 일치) */
  onAdd?: () => void;
  skeleton?: boolean;
}) {
  // "add" = 마지막 카드 바로 뒤에 서는 등록 슬롯. 단이 꽉 찼으면 자연스럽게 다음 단으로 넘어감.
  const items: (ShelfCard | null | "add")[] = onAdd && !skeleton ? [...cards, "add"] : cards;
  const rows: (ShelfCard | null | "add")[][] = [];
  for (let i = 0; i < items.length; i += SHELF_SIZE) rows.push(items.slice(i, i + SHELF_SIZE));

  return (
    <div className="w-max min-w-full flex flex-col items-center">
      {/* 선반 개수 = 카드 수에 맞춤. 선반 길이는 가장 긴 단에 맞춰 전부 동일 —
          카드는 무조건 왼쪽부터 채움 (덜 찬 단도 좌측 정렬, 오른쪽이 빈 자리) */}
      <div className="w-max flex flex-col gap-7">
        {rows.map((row, r) => (
          <div key={r}>
            {/* 카드들 — 선반 턱 위에 정면으로, 왼쪽부터 서 있음 */}
            <div className="flex items-end justify-start gap-3 px-5">
              {row.map((card, i) =>
                card === "add" ? (
                  // 카드 등록 슬롯 — 카드 한 장 크기의 점선 칸, 마지막 카드 뒤에 정렬
                  <button
                    key="add"
                    onClick={onAdd}
                    aria-label="Add a card"
                    className={`${CARD_W} shrink-0 aspect-[5/7] rounded-[10px] border-2 border-dashed border-glassline text-creamdim flex flex-col items-center justify-center gap-1.5 transition-colors duration-200 hover:border-amber hover:text-amber focus-visible:border-amber focus-visible:text-amber outline-none`}
                  >
                    <Plus size={22} weight="bold" aria-hidden />
                    <span className="text-[11px] font-bold">Add card</span>
                  </button>
                ) : card && !skeleton ? (
                  <button
                    key={card.id}
                    onClick={() => onSelect(card)}
                    className={`group relative ${CARD_W} shrink-0 rounded-[10px] transition-transform duration-200 hover:-translate-y-1.5 focus-visible:-translate-y-1.5 outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
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
            {/* 선반 턱 (월 레지) — 윗면 하이라이트 + 두께감 + 네온 언더글로우로 가구처럼 */}
            <div className="h-[3px] rounded-t-[2px] bg-gradient-to-b from-cream/45 to-cream/15" />
            <div className="h-[11px] rounded-b-[3px] bg-gradient-to-b from-inkdark via-inkdark/80 to-bg border-x border-b border-glassline/60 shadow-[0_14px_32px_-4px_theme(colors.amber/35%)]" />
            {/* 선반 아래 은은한 벽 그림자 + 네온 반사광 */}
            <div className="h-5 bg-[linear-gradient(180deg,theme(colors.amber/8%),theme(colors.bg/60%)_45%,transparent)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** PSA 스타일 등급 슬랩 — 모든 카드가 같은 케이스+라벨(이름·등급) 형식.
 *  - 실물 카드: 검색 이미지(순수 카드 아트)를 그대로 아트 칸에
 *  - 온체인(Renaiss) 카드: 슬랩 렌더 사진에서 카드 부분만 잘라 아트 칸에 (사진 속 PSA 라벨은
 *    우리 라벨과 중복이라 크롭)
 *  - 이미지 없음: emoji+tint 플레이스홀더 */
function GradedSlab({ card, large = false }: { card: ShelfCard; large?: boolean }) {
  // Renaiss 이름은 "PSA 10 Gem Mint 2025 ... #132 Mienshao"처럼 길다 — 라벨엔 카드명만
  const label =
    card.origin === "onchain" ? (card.name.match(/#\d+\s+(.+)$/)?.[1] ?? card.name) : card.name;
  // 등급도 라벨 배지엔 "PSA 10"까지만 (풀 등급명은 상세에서)
  const gradeShort = card.grade.match(/^(?:PSA|BGS|CGC|SGC)\s*\d+(?:\.\d+)?/i)?.[0] ?? card.grade;

  return (
    <div className="relative rounded-[10px] border border-cream/25 bg-gradient-to-b from-cream/[0.10] to-cream/[0.03] p-[5%] shadow-[inset_0_1px_0_theme(colors.cream/20%),0_6px_18px_rgba(0,0,0,0.45)]">
      {/* 라벨 — 이름 + 등급 */}
      <div className="flex items-center justify-between gap-1 rounded-[5px] bg-inkdark border border-glassline px-[7%] py-[4%] mb-[5%]">
        <span className={`font-bold text-cream truncate ${large ? "text-[12px]" : "text-[10px]"}`}>
          {label}
        </span>
        <span
          className={`shrink-0 font-extrabold rounded-[3px] bg-amber text-inkdark px-1 ${large ? "text-[12px]" : "text-[10px]"}`}
        >
          {gradeShort}
        </span>
      </div>
      {/* 카드 아트 — 실카드 이미지 / 슬랩 렌더 크롭 / 플레이스홀더 */}
      {card.imageUrl && card.origin === "onchain" ? (
        // Renaiss 슬랩 렌더(440×440 정사각)에서 카드 창 부분(x136–306, y112–342 실측)만
        // 확대해 보여준다 — 사진 속 PSA 라벨·크롬 케이스는 우리 라벨과 중복이라 크롭
        <div className="w-full aspect-[5/7] rounded-[6px] overflow-hidden border border-cream/10 select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt={card.name}
            draggable={false}
            className="w-[268%] max-w-none -ml-[84.5%] -mt-[68%]"
          />
        </div>
      ) : card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.imageUrl}
          alt={card.name}
          draggable={false}
          className="w-full aspect-[5/7] rounded-[6px] object-cover border border-cream/10 select-none"
        />
      ) : (
        <div
          className="aspect-[5/7] rounded-[6px] overflow-hidden border border-cream/10 flex items-center justify-center"
          style={{ background: card.tint }}
        >
          <Cards size={large ? 56 : 30} weight="duotone" className="text-cream/50" aria-hidden />
        </div>
      )}
      {/* 케이스 사선 광택 */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(120deg,transparent_35%,theme(colors.cream/7%)_45%,transparent_55%)] pointer-events-none"
      />
    </div>
  );
}
