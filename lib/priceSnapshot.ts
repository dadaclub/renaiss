import type { MarketPrice } from "@/lib/api/prices";

/**
 * 데모 폴백 시세 스냅샷 — 무료 API가 실패/미매칭/오프라인일 때만 사용.
 * 발표 중 항상 숫자가 보이도록 하는 안전망(친구가 말한 "하드코딩"을 폴백으로만 씀).
 * 값은 고정 예시라 실시간 아님 — 실제 시세는 /api/price가 무료 API에서 먼저 시도한다.
 *
 * 키: `${franchise소문자}|${카드이름 소문자 일부}` 로 느슨 매칭(이름에 키가 포함되면 히트).
 * 새 데모 카드 추가 = 한 줄. 매칭 안 되면 null → UI는 "—" 표시.
 */
interface SnapshotEntry {
  franchise: string; // 소문자 프랜차이즈 (예: "one piece", "pokémon")
  nameIncludes: string; // 카드 이름에 이 문자열이 포함되면 매칭 (소문자)
  priceUsd: number;
}

const SNAPSHOT: SnapshotEntry[] = [
  // One Piece
  { franchise: "one piece", nameIncludes: "luffy", priceUsd: 42.0 },
  { franchise: "one piece", nameIncludes: "zoro", priceUsd: 28.5 },
  { franchise: "one piece", nameIncludes: "nami", priceUsd: 19.0 },
  { franchise: "one piece", nameIncludes: "shanks", priceUsd: 65.0 },
  { franchise: "one piece", nameIncludes: "ace", priceUsd: 33.0 },
  // Pokémon (무료 API가 대개 잡으므로 대표값만 예비로)
  { franchise: "pokémon", nameIncludes: "charizard", priceUsd: 320.0 },
  { franchise: "pokemon", nameIncludes: "pikachu", priceUsd: 24.0 },
];

/** 폴백 시세 조회 — 매칭 없으면 null. */
export function snapshotPrice(franchise: string, name: string): MarketPrice | null {
  const f = franchise.trim().toLowerCase();
  const n = name.trim().toLowerCase();
  const hit = SNAPSHOT.find((e) => (f.includes(e.franchise) || e.franchise.includes(f)) && n.includes(e.nameIncludes));
  if (!hit) return null;
  return { priceUsd: hit.priceUsd, source: "snapshot", asOf: "static", graded: false };
}

/**
 * 확정 시세(curated) — PriceCharting에서 직접 확인한 그레이드 실값 + 출처 링크.
 * 라이브 API보다 **우선** 적용해 할당량/매칭 문제와 무관하게 정확한 값·링크를 보장한다.
 * 매칭: 원피스는 카드 코드(OP01-016 등, 이미지 URL에서 추출)로 정확 매칭 —
 *       같은 이름(예: "Nami (JP promo)")이 여러 장이라 이름만으론 구분 불가.
 *       포켓몬은 이름 포함으로 매칭.
 */
interface CuratedEntry {
  /** 원피스 카드 코드 (대문자, 예: "OP01-016"). 있으면 코드로 매칭 */
  code?: string;
  /** 포켓몬 등 코드 없는 카드 — 이름 포함(소문자)으로 매칭 */
  nameIncludes?: string;
  priceUsd: number;
  url: string; // PriceCharting 출처 링크
}

const CURATED: CuratedEntry[] = [
  // Pokémon — 이름 매칭
  { nameIncludes: "eevee", priceUsd: 340, url: "https://www.pricecharting.com/game/pokemon-brilliant-stars/eevee-tg11" },
  { nameIncludes: "pikachu on the ball", priceUsd: 967.39, url: "https://www.pricecharting.com/game/pokemon-promo/pikachu-on-the-ball-1?q=pikachu+on+the+ball+1" },
  { nameIncludes: "meowth", priceUsd: 194, url: "https://www.pricecharting.com/game/pokemon-phantasmal-flames/meowth-106" },
  // One Piece — 카드 코드 매칭 (같은 이름 여러 장 구분)
  { code: "ST16-001", priceUsd: 719.36, url: "https://www.pricecharting.com/game/one-piece-japanese-starter-deck-16-uta/uta-storage-box-set-gold-st16-001" }, // Uta (JP promo)
  { code: "ST01-007", priceUsd: 1700.43, url: "https://www.pricecharting.com/game/one-piece-japanese-starter-deck-1-straw-hat-crew/nami-storage-box-set-gold-st01-007" }, // Nami (JP promo)
  { code: "OP10-005", priceUsd: 1560.25, url: "https://www.pricecharting.com/game/one-piece-japanese-promo/sanji-flagship-battle-op10-005" }, // Sanji (Alt art)
  { code: "OP01-016", priceUsd: 803.62, url: "https://www.pricecharting.com/game/one-piece-romance-dawn/nami-special-alternate-art-op01-016" }, // Nami
  { code: "ST13-003", priceUsd: 1596.29, url: "https://www.pricecharting.com/game/one-piece-ultra-deck-the-three-brothers/monkeydluffy-bvb-promo-st13-003" }, // Monkey.D.Luffy
  { code: "OP05-067", priceUsd: 945.0, url: "https://www.pricecharting.com/game/one-piece-awakening-of-the-new-era/zoro-juurou-sp-foil-op05-067" }, // Zoro-Juurou
  { code: "OP08-106", priceUsd: 416.39, url: "https://www.pricecharting.com/game/one-piece-japanese-two-legends/nami-promotion-pack-ex-op08-106" }, // Nami (JP promo)
  { code: "OP07-051", priceUsd: 3250, url: "https://www.pricecharting.com/game/one-piece-500-years-in-the-future/boa-hancock-alternate-art-manga-op07-051" }, // Boa Hancock
];

/** 확정 시세 조회 — 매칭 없으면 null. 라우트에서 캐시·API보다 먼저 확인한다.
 *  code(이미지에서 추출한 카드 코드)가 있으면 코드 우선 매칭, 없으면 이름 포함 매칭. */
export function curatedPrice(name: string, code?: string): MarketPrice | null {
  const n = name.trim().toLowerCase();
  const cc = code?.trim().toUpperCase();
  const hit = CURATED.find((e) =>
    e.code ? cc === e.code : e.nameIncludes ? n.includes(e.nameIncludes) : false
  );
  if (!hit) return null;
  return { priceUsd: hit.priceUsd, source: "pricecharting", asOf: "verified", graded: true, sourceUrl: hit.url };
}
