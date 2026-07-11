import { NextRequest, NextResponse } from "next/server";
import { getPokemonPrice, getPokemonTrackerPrice, type MarketPrice } from "@/lib/api/prices";
import { curatedPrice, snapshotPrice } from "@/lib/priceSnapshot";
import { supabase } from "@/lib/supabase";

/**
 * 실물 카드 시세 조회 라우트 (서버 전용).
 *   GET /api/price?name=Charizard&franchise=Pokémon&grade=PSA%2010
 * 흐름: Supabase 24h 캐시 → 무료 API(pokemontcg.io / TCGGO) → 데모 스냅샷 폴백.
 *   - 캐시 테이블(card_prices)이 없거나 실패해도 graceful (그냥 실시간 조회).
 *   - 시세를 못 구하면 { price: null } (UI는 "—" 표시).
 * 브라우저에서 무료 API를 직접 부르지 않기 위한 프록시 + 캐시 계층.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CacheRow {
  key: string;
  price_usd: number;
  source: string;
  as_of: string;
  graded: boolean;
  fetched_at: string;
}

async function readCache(key: string): Promise<MarketPrice | null> {
  try {
    const { data, error } = await supabase
      .from("card_prices")
      .select("*")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as CacheRow;
    if (Date.now() - new Date(row.fetched_at).getTime() > CACHE_TTL_MS) return null; // 만료
    return { priceUsd: row.price_usd, source: row.source, asOf: row.as_of, graded: row.graded };
  } catch {
    return null; // 테이블 미존재/장애 → 캐시 무시
  }
}

async function writeCache(key: string, p: MarketPrice): Promise<void> {
  try {
    await supabase.from("card_prices").upsert(
      {
        key,
        price_usd: p.priceUsd,
        source: p.source,
        as_of: p.asOf,
        graded: p.graded,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  } catch {
    // 캐시 저장 실패는 무시 (조회 결과는 이미 반환)
  }
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const name = p.get("name")?.trim();
  const franchise = (p.get("franchise") ?? "").trim();
  const grade = p.get("grade")?.trim() || undefined;
  const code = p.get("code")?.trim() || undefined; // 카드 코드(OP01-016 등) — 확정값 정확 매칭용
  if (!name) return NextResponse.json({ price: null }, { status: 400 });

  const key = `${franchise}|${name}|${grade ?? ""}`.toLowerCase();

  // 0) 확정 시세(curated) — PriceCharting 확인값. 할당량/매칭과 무관하게 최우선.
  const curated = curatedPrice(name, code);
  if (curated) return NextResponse.json({ price: curated });

  // 1) 캐시
  const cached = await readCache(key);
  if (cached) return NextResponse.json({ price: cached, cached: true });

  // 2) 무료 API. 포켓몬: PokemonPriceTracker(그레이드 반영) → pokemontcg.io(raw) 순.
  //    그 외(원피스 등)는 무료 소스가 없어 스냅샷 폴백에 맡긴다.
  let price: MarketPrice | null = null;
  if (/pok[eé]?mon/i.test(franchise)) {
    price = (await getPokemonTrackerPrice(name, grade)) ?? (await getPokemonPrice(name));
  }

  // 3) 폴백 스냅샷
  if (!price) price = snapshotPrice(franchise, name);

  // 출처 링크 없으면 TCGplayer 검색으로 폴백 (포켓몬·원피스 모두 취급)
  if (price && !price.sourceUrl) {
    price.sourceUrl = `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(name)}`;
  }

  if (price) await writeCache(key, price);
  return NextResponse.json({ price });
}
