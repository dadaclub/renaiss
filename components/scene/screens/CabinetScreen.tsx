"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowsClockwise,
  Cards,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  MonitorPlay,
  PencilSimple,
  Plus,
  Trash,
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
import { CabinetGallery } from "./CabinetGallery";

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
  /** 등록 시각(Supabase created_at) — Newest/Oldest 정렬 기준. acquiredAt은 날짜만이라 동일값이 많아 순서가 안 갈림 */
  createdAt?: string;
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
  created_at?: string; // 등록 시각(정렬 기준)
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
    createdAt: r.created_at,
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

/** 저장된 날짜("YYYY.MM.DD" 또는 ISO)를 영어 표기("Jul 8, 2026")로. UI 기본 언어가 영어라서.
 *  로컬 Date(연,월,일)로 만들어 타임존 하루 밀림을 피한다. 파싱 실패 시 원문 그대로. */
function fmtDate(s: string): string {
  const m = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
  return isNaN(d.getTime())
    ? s
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/* ================= 화면 로직 ================= */

type SortKey = "newest" | "oldest" | "priceHigh" | "priceLow";
type ModalState = null | "register" | { edit: ShelfCard };

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  oldest: "Oldest",
  priceHigh: "Price high",
  priceLow: "Price low",
};

// Newest/Oldest 정렬 키 — created_at(시각 포함) 우선, 없으면 acquiredAt(날짜만).
// acquiredAt만 쓰면 같은 날 등록분이 전부 동일값이라 순서가 안 갈린다.
const orderKey = (c: ShelfCard) => c.createdAt ?? c.acquiredAt;

/** 정렬. 가격 미상(실물 미평가) 카드는 금액 정렬에서 맨 뒤로 */
function sortCards(cards: ShelfCard[], sort: SortKey): ShelfCard[] {
  const arr = [...cards];
  switch (sort) {
    case "newest":
      return arr.sort((a, b) => orderKey(b).localeCompare(orderKey(a)));
    case "oldest":
      return arr.sort((a, b) => orderKey(a).localeCompare(orderKey(b)));
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
  // 상세로 연 카드는 id로 추적 — 정렬(visible) 안에서 앞/뒤로 이동하기 위해 인덱스를 매번 새로 계산
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gallery, setGallery] = useState(false); // 전시(갤러리) 모드 — 순수 감상용 풀스크린

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

  // 삭제는 수정 모달 안에서 실행 → 상세·모달 모두 닫는다
  function removeCard(id: string) {
    const target = cards.find((c) => c.id === id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setSelectedId(null);
    setModal(null);
    if (target?.fromDb) {
      void supabase.from("showcase_cards").delete().eq("id", id).then();
    }
  }

  const visible = useMemo(() => sortCards(cards, sort), [cards, sort]);

  // 상세로 연 카드의 현재 정렬 내 위치 — 좌우 이동/양끝 판정의 기준
  const selectedIndex = selectedId ? visible.findIndex((c) => c.id === selectedId) : -1;
  const selectedCard = selectedIndex >= 0 ? visible[selectedIndex] : null;

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

      {/* 전시(갤러리) 모드 진입 — 카드가 있을 때만. 순수 감상용 풀스크린 */}
      {visible.length > 0 && (
        <button
          onClick={() => setGallery(true)}
          // 모바일: 우상단. 데스크톱(넓은 16:9)에선 Back 버튼 옆으로 붙여 둘이 멀어지지 않게
          className="fixed top-6 right-6 lg:right-auto lg:left-[152px] z-10 inline-flex items-center gap-1.5 bg-glass border border-glassline text-cream text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-md hover:border-amber hover:text-amber transition-colors"
        >
          <MonitorPlay size={14} weight="bold" aria-hidden />
          Gallery
        </button>
      )}

      <div
        className={`relative h-full flex flex-col transition-all duration-500 ${
          shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        {/* 상단 — 떠 있는 컨트롤 (타이틀 없음). 좁은 화면에선 고정 Back 버튼 아래로 내림 */}
        <div className="shrink-0 flex flex-col items-center gap-3 pt-[72px] lg:pt-6 pb-2 px-6">
          <div className="flex items-center gap-2 flex-wrap justify-center bg-glass/70 backdrop-blur-md border border-glassline rounded-full px-3 py-2">
            {/* 정렬 — 2개 토글 칩. 날짜(Newest↑⇄Oldest↓), 가격(high↑⇄low↓). 탭하면 방향 반전 */}
            <div aria-label="Sort cards" className="flex items-center gap-1.5">
              {/* 날짜 */}
              <Chip
                active={sort === "newest" || sort === "oldest"}
                onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
              >
                <span className="inline-flex items-center gap-1">
                  {sort === "oldest" ? SORT_LABELS.oldest : SORT_LABELS.newest}
                  {sort === "oldest" ? (
                    <CaretDown size={11} weight="bold" aria-hidden />
                  ) : (
                    <CaretUp size={11} weight="bold" aria-hidden />
                  )}
                </span>
              </Chip>
              {/* 가격 */}
              <Chip
                active={sort === "priceHigh" || sort === "priceLow"}
                onClick={() => setSort(sort === "priceHigh" ? "priceLow" : "priceHigh")}
              >
                <span className="inline-flex items-center gap-1">
                  {sort === "priceLow" ? SORT_LABELS.priceLow : SORT_LABELS.priceHigh}
                  {sort === "priceLow" ? (
                    <CaretDown size={11} weight="bold" aria-hidden />
                  ) : (
                    <CaretUp size={11} weight="bold" aria-hidden />
                  )}
                </span>
              </Chip>
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

        {/* 진열장 본체 — 세로 스크롤. 카드 수는 폭에 맞춰 자동이라 가로 넘침 없음. 모바일은 좌우 여백 축소 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 pt-5 pb-10">
          {syncing && cards.length === 0 ? (
            <Shelves
              cards={Array.from({ length: SHELF_MAX * 2 }, () => null)}
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
              onSelect={(c) => setSelectedId(c.id)}
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
          onRemove={removeCard}
          onClose={() => setModal(null)}
        />
      )}
      {selectedCard && (
        <CardDetail
          card={selectedCard}
          readOnly={!isOwnRoom}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < visible.length - 1}
          onPrev={() => selectedIndex > 0 && setSelectedId(visible[selectedIndex - 1].id)}
          onNext={() =>
            selectedIndex < visible.length - 1 && setSelectedId(visible[selectedIndex + 1].id)
          }
          onEdit={(c) => {
            setSelectedId(null);
            setModal({ edit: c });
          }}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* 전시(갤러리) 모드 — 풀스크린 오버레이(z-[60]). 순수 감상용 */}
      {gallery && <CabinetGallery cards={visible} onExit={() => setGallery(false)} />}
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
  onRemove,
  onClose,
}: {
  /** 있으면 수정 모드 — 기존 실물 카드 값을 채워서 열고, 저장 시 그 카드를 덮어씀 */
  initial?: ShelfCard;
  onSubmit: (c: PhysicalInput) => void;
  onAddOnchain: (c: OnchainCardDto) => void;
  onSync: () => void;
  /** 수정 모드에서 이 카드를 삭제 (상세의 삭제 버튼을 여기로 통합) */
  onRemove?: (id: string) => void;
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
  // 수정 모드 삭제 확인 (한 번 더 눌러야 실제 삭제)
  const [confirmingRemove, setConfirmingRemove] = useState(false);
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
        className="w-[min(92vw,420px)] max-h-[90dvh] overflow-y-auto bg-glass border border-glassline rounded-panel p-6 flex flex-col gap-4 outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
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
            {/* 삭제 — 수정 모드에서만. 상세 화면의 삭제 버튼을 여기로 통합. 한 번 더 확인 후 삭제 */}
            {editing && onRemove && initial && (
              <div className="flex items-center justify-center pt-1">
                {confirmingRemove ? (
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="text-creamdim">Remove this card?</span>
                    <button
                      onClick={() => onRemove(initial.id)}
                      className="inline-flex items-center gap-1 text-down hover:brightness-110 transition"
                    >
                      <Trash size={12} weight="bold" aria-hidden />
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirmingRemove(false)}
                      className="text-creamdim hover:text-cream transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingRemove(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-down/80 hover:text-down transition-colors"
                  >
                    <Trash size={12} weight="bold" aria-hidden />
                    Remove from showcase
                  </button>
                )}
              </div>
            )}
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
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onEdit,
  onClose,
}: {
  card: ShelfCard;
  /** 방문 중(남의 방) — 수정·삭제 숨김 */
  readOnly?: boolean;
  /** 정렬순 앞/뒤 카드 존재 여부 — 없으면 해당 화살표 비활성 */
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** 수정 화면 열기 — 삭제도 그 안에서 (상세 화면엔 연필 하나로 통일) */
  onEdit: (c: ShelfCard) => void;
  onClose: () => void;
}) {
  const up = (card.delta30d ?? 0) >= 0;
  const panelRef = useRef<HTMLDivElement>(null);

  useEscapeToClose(onClose);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // ←/→ 키로도 이동
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onPrev, onNext]);

  // 직접 등록한 카드(실물/온체인 수동 등록)만 수정·삭제 가능. 방문 중(readOnly)엔 숨김
  const editable = !readOnly && (card.origin === "physical" || card.fromDb);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/70 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${card.name} details`}
        tabIndex={-1}
        className="relative w-[min(92vw,400px)] bg-glass border border-glassline rounded-panel p-6 flex flex-col items-center gap-4 outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 좌우 이동 — 카드 양옆(패널 안쪽 여백)에 붙여 카드 뷰어의 일부처럼. 끝이면 흐리게 비활성 */}
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          disabled={!hasPrev}
          aria-label="Previous card"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full bg-inkdark/60 border border-glassline text-cream backdrop-blur-md transition-colors hover:border-amber hover:text-amber disabled:opacity-20 disabled:pointer-events-none"
        >
          <CaretLeft size={18} weight="bold" aria-hidden />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          disabled={!hasNext}
          aria-label="Next card"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full bg-inkdark/60 border border-glassline text-cream backdrop-blur-md transition-colors hover:border-amber hover:text-amber disabled:opacity-20 disabled:pointer-events-none"
        >
          <CaretRight size={18} weight="bold" aria-hidden />
        </button>

        {/* 상단 한 줄 — 출처(좌) · 콜렉션명(중앙, 가장 큼) · 수정(우). 모두 세로 중앙 정렬로 줄 맞춤 */}
        <div className="relative w-full flex items-center justify-center min-h-8">
          {/* 출처(실물/온체인) — 좌측, 콜렉션명과 같은 줄. 아이콘 없이 텍스트만 */}
          <span className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-full bg-cream/[0.06] border border-glassline text-creamdim">
            {card.origin === "onchain"
              ? "On-chain"
              : `Physical${card.certNumber ? ` · #${card.certNumber}` : ""}`}
          </span>
          {/* 콜렉션(프랜차이즈) — 중앙, 라벨 위계 최상단이라 가장 크게 */}
          {card.franchise && (
            <span className="px-14 text-center text-amber text-[13px] font-bold uppercase tracking-[0.2em]">
              {card.franchise}
            </span>
          )}
          {/* 수정(삭제 포함) — 우측 연필 하나. 편집 가능한 카드에만 */}
          {editable && (
            <button
              onClick={() => onEdit(card)}
              aria-label="Edit card"
              className="absolute right-0 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-creamdim hover:text-amber hover:bg-cream/[0.06] transition-colors"
            >
              <PencilSimple size={15} weight="bold" aria-hidden />
            </button>
          )}
        </div>

        {/* 카드 — 이름·등급은 슬랩 라벨에 이미 있으니 아래에 반복하지 않음.
            zoomable: 아트에 마우스를 올리면 돋보기로 확대해 디자인을 자세히 볼 수 있음 */}
        <div className="w-[210px] drop-shadow-[0_0_35px_theme(colors.amber/30%)]">
          <GradedSlab card={card} large zoomable />
        </div>

        {/* 카드 밑 — 취득 날짜만 (영어 표기) */}
        {card.acquiredAt && (
          <div className="text-[12px] text-creamdim font-semibold">{fmtDate(card.acquiredAt)}</div>
        )}

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

      </div>
    </div>
  );
}

/* ================= 스킨 레이어 =================
 * 최종 진열장 아트가 나오면 아래 컴포넌트만 교체.
 * 카드 클릭 콜백/데이터 계약은 그대로 유지할 것. */

// 선반 한 단 카드 수 — 컨테이너 실제 폭을 재서 자동 결정 (모바일 좁으면 줄여 가로 넘침 방지)
const SHELF_MAX = 8; // 데스크톱 한 단 최대 (16:9 넓은 화면을 활용 — 모바일은 폭이 좁아 SHELF_MIN에 걸려 영향 없음)
const SHELF_MIN = 3; // 모바일 한 단 최소
const CARD_TARGET = 108; // 카드 목표 폭(px) — 이 폭 기준으로 몇 장 들어갈지 계산
const SHELF_GAP = 12; // 카드 사이 간격(gap-3)
const ROW_PAD = 8; // 카드 줄 좌우 여백(px-2) — 선반 턱이 카드보다 살짝 넓게 나오도록

/** 컨테이너 폭(마운트 시 + 창 크기 변경 시)을 재서 한 단에 올릴 카드 수를 정한다.
 *  카드는 grid로 칸을 꽉 채우므로 이 수만큼이 항상 가로 넘침 없이 들어간다.
 *  ResizeObserver 대신 window resize만 듣는다 — 세로 스크롤바 등장/사라짐과의 루프를 피하려고. */
function useFitColumns() {
  const ref = useRef<HTMLDivElement>(null);
  // cols = 한 단 최대 카드 수, cardW = 그 수로 컨테이너를 꽉 채우는 카드 폭(px).
  // 덜 찬 단은 이 cardW를 그대로 유지한 채 가운데 정렬돼, 선반이 카드 수만큼만 길어진다.
  const [dims, setDims] = useState<{ cols: number; cardW: number }>({
    cols: SHELF_MAX,
    cardW: CARD_TARGET,
  });
  useEffect(() => {
    const calc = () => {
      const w = ref.current?.clientWidth ?? 0;
      if (!w) return;
      const cols = Math.max(
        SHELF_MIN,
        Math.min(SHELF_MAX, Math.floor((w + SHELF_GAP) / (CARD_TARGET + SHELF_GAP)))
      );
      // 좌우 여백 + 카드 사이 gap을 빼고 남은 폭을 cols장이 균등 분배 → 꽉 찬 단은 폭에 딱 맞고
      // 넘치지 않는다. floor로 내려 반올림 오차에 의한 가로 넘침을 막는다.
      const cardW = Math.floor((w - ROW_PAD * 2 - (cols - 1) * SHELF_GAP) / cols);
      setDims({ cols, cardW });
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return [ref, dims.cols, dims.cardW] as const;
}

// 돋보기(loupe) — 카드 상세에서 아트에 마우스를 올리면 커서를 따라다니는 확대 렌즈 (액자 PhotoScreen과 동일 방식)
const LOUPE = 116; // 렌즈 지름(px)
const LOUPE_ZOOM = 1.2; // 확대 배율
// 온체인 슬랩 렌더 크롭 상수 — 아래 GradedSlab의 아트 className(w-268% / -ml-84.5% / -mt-68%)과 반드시 일치
const OC_SCALE = 2.68;
const OC_OFF_X = 0.845;
const OC_OFF_Y = 0.68;

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
  const [rootRef, cols, cardW] = useFitColumns();
  // "add" = 마지막 카드 바로 뒤에 서는 등록 슬롯. 단이 꽉 찼으면 자연스럽게 다음 단으로 넘어감.
  const items: (ShelfCard | null | "add")[] = onAdd && !skeleton ? [...cards, "add"] : cards;
  const rows: (ShelfCard | null | "add")[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));

  return (
    <div ref={rootRef} className="w-full max-w-[1120px] mx-auto flex flex-col gap-4">
      {/* 한 단 카드 수 = cols(컨테이너 폭 기준 자동, 가로 넘침 없음).
          카드는 고정 폭(cardW) + 가운데 정렬. 선반 턱은 항상 풀 너비(고정) —
          단마다 선반 길이가 달라 보이던 문제를 없애고, 덜 찬 단은 카드만 가운데로 모인다. */}
      <div className="flex flex-col gap-4">
        {rows.map((row, r) => (
          <div key={r}>
            {/* 카드들 — 선반 턱 위에 정면으로, 가운데 정렬. 고정 폭이라 카드 크기는 단마다 동일 */}
            <div className="flex items-end justify-center gap-3 px-2 mb-1.5">
                {row.map((card, i) => (
                  <div
                    key={card === "add" ? "add" : card ? card.id : `s${i}`}
                    style={{ width: cardW }}
                    className={`shrink-0 ${card === "add" ? "self-stretch" : ""}`}
                  >
                    {card === "add" ? (
                      // 카드 등록 슬롯 — 래퍼 self-stretch + h-full로 옆 카드 높이에 맞춤
                      <button
                        onClick={onAdd}
                        aria-label="Add a card"
                        className="w-full h-full min-h-[128px] rounded-[10px] border-2 border-dashed border-glassline text-creamdim flex flex-col items-center justify-center gap-1.5 transition-colors duration-200 hover:border-amber hover:text-amber focus-visible:border-amber focus-visible:text-amber outline-none"
                      >
                        <Plus size={22} weight="bold" aria-hidden />
                        <span className="text-[11px] font-bold">Add card</span>
                      </button>
                    ) : card && !skeleton ? (
                      <button
                        onClick={() => onSelect(card)}
                        className="group relative w-full rounded-[10px] transition-transform duration-200 hover:-translate-y-1.5 focus-visible:-translate-y-1.5 outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
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
                        className={`w-full aspect-[5/7] rounded-[6px] ${
                          skeleton ? "bg-cream/[0.04] border border-glassline animate-pulse" : ""
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              {/* 선반 턱 (월 레지) — 윗면 하이라이트 + 두께감 + 네온 언더글로우로 가구처럼 */}
              <div className="h-[3px] rounded-t-[2px] bg-glassline" />
              {/* 선반 가운데 — 상단 "13 cards" 바와 동일한 glass 색(어두운 보라 + 블러) */}
              <div className="h-[9px] rounded-b-[3px] bg-glass/70 border-x border-b border-glassline backdrop-blur-md shadow-[0_14px_32px_-6px_rgba(0,0,0,0.5)]" />
              {/* 선반 아래 은은한 벽 그림자 */}
              <div className="h-2 bg-[linear-gradient(180deg,theme(colors.cream/8%),theme(colors.bg/55%)_45%,transparent)]" />
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
function GradedSlab({
  card,
  large = false,
  zoomable = false,
}: {
  card: ShelfCard;
  large?: boolean;
  /** 카드 상세용 — 아트에 마우스를 올리면 돋보기 렌즈로 확대 */
  zoomable?: boolean;
}) {
  // Renaiss 이름은 "PSA 10 Gem Mint 2025 ... #132 Mienshao"처럼 길다 — 라벨엔 카드명만
  const label =
    card.origin === "onchain" ? (card.name.match(/#\d+\s+(.+)$/)?.[1] ?? card.name) : card.name;
  // 등급도 라벨 배지엔 "PSA 10"까지만 (풀 등급명은 상세에서)
  const gradeShort = card.grade.match(/^(?:PSA|BGS|CGC|SGC)\s*\d+(?:\.\d+)?/i)?.[0] ?? card.grade;

  const [lens, setLens] = useState<{ x: number; y: number; bgSize: string; bgPos: string } | null>(
    null
  );
  const canZoom = zoomable && !!card.imageUrl;

  // 돋보기 위치 계산 — 온체인은 아트가 슬랩 렌더의 크롭(w-268%/-ml-84.5%/-mt-68%)이라
  // 렌즈 배경도 같은 스케일·오프셋으로 맞춰야 표시 화면과 일치한다.
  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!canZoom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const oc = card.origin === "onchain";
    const dispW = oc ? rect.width * OC_SCALE : rect.width;
    const dispH = oc ? rect.width * OC_SCALE : rect.height; // 온체인 렌더는 정사각
    const offX = oc ? rect.width * OC_OFF_X : 0;
    const offY = oc ? rect.width * OC_OFF_Y : 0;
    setLens({
      x: cx,
      y: cy,
      bgSize: `${dispW * LOUPE_ZOOM}px ${dispH * LOUPE_ZOOM}px`,
      // 커서 지점이 렌즈 중앙에 오도록 배경을 이동
      bgPos: `${LOUPE / 2 - (cx + offX) * LOUPE_ZOOM}px ${LOUPE / 2 - (cy + offY) * LOUPE_ZOOM}px`,
    });
  }

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
      {/* 카드 아트 — 공통 래퍼(overflow-hidden)로 통일. zoomable이면 돋보기 렌즈를 얹는다.
          실카드 이미지 / 슬랩 렌더 크롭 / 플레이스홀더 세 경우 모두 이 래퍼 안에 렌더 */}
      <div
        onMouseMove={handleMove}
        onMouseLeave={() => setLens(null)}
        className={`relative w-full aspect-[5/7] rounded-[6px] overflow-hidden border border-cream/10 select-none ${
          canZoom ? "cursor-none" : ""
        }`}
        style={card.imageUrl ? undefined : { background: card.tint }}
      >
        {card.imageUrl && card.origin === "onchain" ? (
          // Renaiss 슬랩 렌더(440×440 정사각)에서 카드 창 부분만 확대해 보여준다
          // (사진 속 PSA 라벨·크롬 케이스는 우리 라벨과 중복이라 크롭)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt={card.name}
            draggable={false}
            className="w-[268%] max-w-none -ml-[84.5%] -mt-[68%]"
          />
        ) : card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt={card.name}
            draggable={false}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Cards size={large ? 56 : 30} weight="duotone" className="text-cream/50" aria-hidden />
          </div>
        )}

        {/* 돋보기 렌즈 — 커서를 따라다니며 그 부분을 확대. overflow-hidden에 카드 가장자리에서 잘림 */}
        {lens && card.imageUrl && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-20 rounded-full border-2 border-cream shadow-[0_6px_20px_rgba(0,0,0,0.55)]"
            style={{
              width: LOUPE,
              height: LOUPE,
              left: lens.x - LOUPE / 2,
              top: lens.y - LOUPE / 2,
              backgroundImage: `url(${card.imageUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: lens.bgSize,
              backgroundPosition: lens.bgPos,
            }}
          />
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
