/**
 * 실물 시세 API 래퍼 (담당: B)
 * PokemonPriceTracker / TCGGO — eBay 실체결가 기반, 포켓몬+원피스 커버
 * 무료 티어: 일 100건 — 캐싱 필수
 */
export interface MarketPrice {
  median: number;
  sampleSize: number;
  currency: "USD";
}

export async function getMarketPrice(cardName: string, grade: string): Promise<MarketPrice> {
  // TODO: parse-title 엔드포인트 + confidence 점수 활용
  throw new Error("not implemented — mock delta 사용");
}
