/**
 * 실물 카드 시세 조회 (서버 전용) — 무료 소스 조합.
 *  - Pokémon: pokemontcg.io — 카드에 TCGplayer 시세가 내장(키 없이도 동작, 키 있으면 rate limit↑).
 *             raw/NM 마켓가라 그레이드(PSA) 반영 아님(graded=false).
 *  - One Piece 등 그 외: TCGGO / PokemonPriceTracker — eBay 실체결 기반, 그레이드 파싱 지원.
 *             키 필요(POKEMON_PRICE_TRACKER_KEY). 키 없으면 null 반환 → 라우트가 스냅샷 폴백.
 * ⚠️ 브라우저에서 직접 호출 금지 — 반드시 /api/price 라우트(서버)에서만. 결과는 Supabase에 24h 캐시.
 */

export interface MarketPrice {
  priceUsd: number;
  /** 출처 표기 — "pokemontcg.io" | "tcggo" | "snapshot" */
  source: string;
  /** 시세 기준 시각 (ISO) */
  asOf: string;
  /** eBay 표본 수 등(있으면) */
  sampleSize?: number;
  /** 그레이드(PSA 등)가 반영된 가격인지. pokemontcg.io는 raw라 false */
  graded: boolean;
  /** 시세 출처 링크 (예: TCGplayer 상품 페이지) — 없으면 라우트가 검색 URL로 채움 */
  sourceUrl?: string;
}

interface TcgPlayerPriceRow {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

/** 여러 변형(holofoil/normal/reverseHolofoil…) 중 대표가 하나 고르기 — market 우선, 없으면 mid. */
function pickMarket(prices: Record<string, TcgPlayerPriceRow | undefined>): number | null {
  const rows = Object.values(prices).filter(Boolean) as TcgPlayerPriceRow[];
  const byMarket = rows.map((r) => r.market).find((n): n is number => typeof n === "number" && n > 0);
  if (byMarket != null) return byMarket;
  const byMid = rows.map((r) => r.mid).find((n): n is number => typeof n === "number" && n > 0);
  return byMid ?? null;
}

/** Pokémon 시세 — pokemontcg.io. 이름으로 검색해 시세정보가 있는 카드의 market가를 채택. */
export async function getPokemonPrice(name: string): Promise<MarketPrice | null> {
  const key = process.env.POKEMONTCG_API_KEY; // 선택 — 있으면 rate limit 상향
  const q = encodeURIComponent(`name:"${name}"`);
  const url = `https://api.pokemontcg.io/v2/cards?q=${q}&orderBy=-set.releaseDate&pageSize=8`;
  try {
    const res = await fetch(url, {
      headers: key ? { "X-Api-Key": key } : {},
      cache: "no-store", // 라우트 레벨에서 캐시하므로 fetch 캐시는 끔
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { tcgplayer?: { url?: string; prices?: Record<string, TcgPlayerPriceRow>; updatedAt?: string } }[];
    };
    for (const c of json.data ?? []) {
      const prices = c.tcgplayer?.prices;
      if (!prices) continue;
      const market = pickMarket(prices);
      if (market != null) {
        return {
          priceUsd: Math.round(market * 100) / 100,
          source: "pokemontcg.io",
          asOf: c.tcgplayer?.updatedAt ?? new Date().toISOString(),
          graded: false,
          sourceUrl: c.tcgplayer?.url, // TCGplayer 상품 페이지
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** 카드 이름에서 그레이드 회사·숫자 제거 등 노이즈를 걷어내 검색어를 정리.
 *  예: "PSA 10 Gem Mint 2023 Ruler of the Black Flame #134 Charizard EX" → "Ruler of the Black Flame Charizard EX" */
function cleanCardName(raw: string): string {
  return raw
    .replace(/\b(PSA|CGC|BGS|SGC)\s*\d+(\.\d+)?\b/gi, "")
    .replace(/\bgem\s*mint\b/gi, "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/#\s*\d+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** grade 문자열에서 PSA 숫자만 추출 ("PSA 10 Gem Mint" → "10"). PSA가 아니면 null. */
function psaGrade(grade?: string): string | null {
  return grade?.match(/psa\s*(\d+)/i)?.[1] ?? null;
}

interface PptCard {
  prices?: { market?: number };
  ebay?: Record<string, { avg?: number } | undefined>;
  tcgPlayerId?: string | number;
}

/**
 * Pokémon 시세 — PokemonPriceTracker(포켓몬 전용). raw는 prices.market, 그레이드는 ebay.psaN.avg.
 * 키(POKEMON_PRICE_TRACKER_KEY) 필요. 없거나 실패하면 null → 라우트가 pokemontcg.io/스냅샷으로 폴백.
 * 스키마: GET /api/v2/cards?search=&includeEbay=true — data[].prices.market, data[].ebay.psa10.avg 등.
 */
export async function getPokemonTrackerPrice(name: string, grade?: string): Promise<MarketPrice | null> {
  const key = process.env.POKEMON_PRICE_TRACKER_KEY;
  if (!key) return null;
  const psa = psaGrade(grade);
  try {
    const params = new URLSearchParams({ search: cleanCardName(name) });
    if (psa) params.set("includeEbay", "true"); // 그레이드가는 eBay 실체결 데이터
    const res = await fetch(`https://www.pokemonpricetracker.com/api/v2/cards?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: PptCard[] };
    const card = json.data?.[0];
    if (!card) return null;

    let priceUsd: number | undefined;
    let graded = false;
    const gradedAvg = psa ? card.ebay?.[`psa${psa}`]?.avg : undefined;
    if (gradedAvg != null) {
      priceUsd = gradedAvg; // 요청 등급(PSA N) 실체결 평균
      graded = true;
    } else if (card.prices?.market != null) {
      priceUsd = card.prices.market; // raw 마켓가
    } else if (card.ebay?.psa10?.avg != null) {
      priceUsd = card.ebay.psa10.avg; // raw 없고 그레이드만 있으면 PSA10로 대체
      graded = true;
    }
    if (priceUsd == null) return null;

    return {
      priceUsd: Math.round(priceUsd * 100) / 100,
      source: "pokemonpricetracker",
      asOf: new Date().toISOString(),
      graded,
      sourceUrl: card.tcgPlayerId
        ? `https://www.tcgplayer.com/product/${card.tcgPlayerId}`
        : undefined,
    };
  } catch {
    return null;
  }
}
