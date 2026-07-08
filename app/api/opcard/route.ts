import { NextResponse } from "next/server";
import { searchTcgCards, toCardCode } from "@/lib/api/apitcg";
import { APITCG_GAMES, findGame } from "@/lib/api/apitcgGames";
import { parseJpSetQuery, searchPokemonJpCards } from "@/lib/api/pokemonJp";

/**
 * TCG 카드 검색 프록시 — 진열장 실물 카드 등록용.
 * 카드명(?name=)으로 apitcg.com을 조회해 이미지 포함 결과를 반환.
 * ?game= 미지정/"all"이면 지원 게임 전체를 병렬 검색 (원피스 카드 코드 형태면 원피스만).
 * APITCG_API_KEY는 이 서버 라우트에서만 사용 (클라이언트로 키가 새지 않게).
 * 시세는 apitcg에 없으므로 이미지·카드정보만 내려간다.
 */
export const revalidate = 3600;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  if (!name) return NextResponse.json({ cards: [] });

  const gameParam = params.get("game") ?? "all";
  let games;
  if (gameParam === "all") {
    // 카드 코드 형태(OP01-016 등)는 원피스 고유 체계 → 원피스만 조회 (호출 6배 낭비 방지)
    const codeGame = toCardCode(name) ? APITCG_GAMES.find((g) => g.codeSearch) : undefined;
    games = codeGame ? [codeGame] : APITCG_GAMES;
  } else {
    const game = findGame(gameParam);
    if (!game) return NextResponse.json({ error: "unknown game" }, { status: 400 });
    games = [game];
  }

  if (!process.env.APITCG_API_KEY) {
    return NextResponse.json({ error: "APITCG_API_KEY not configured" }, { status: 501 });
  }

  // 전체 검색은 게임당 결과 수를 줄여 응답 크기/호출 부담을 낮춘다
  const perGame = games.length > 1 ? 12 : 24;
  // 포켓몬은 apitcg(영어판)에 없는 일본 한정 프로모를 공식 일본 DB에서 추가 검색.
  // 단, 검색어가 콜렉터 번호로 끝나면(예: "rayquaza vmax 218") 일본판은 스킵 —
  // 일본 DB엔 번호 정보가 없어 이름 전체 결과가 노이즈로 쏟아진다.
  const wantsPokemonJp = games.some((g) => g.id === "pokemon") && !/\s\d+$/.test(name);
  const [settled, jpSettled] = await Promise.all([
    Promise.allSettled(games.map((g) => searchTcgCards(g, name, perGame))),
    wantsPokemonJp ? searchPokemonJpCards(name, perGame).catch(() => []) : Promise.resolve([]),
  ]);

  const jpCards = jpSettled.map((c) => ({
    ...c,
    game: "pokemon",
    franchise: "Pokémon",
    imageUrl: `/api/img?url=${encodeURIComponent(c.imageUrl)}`,
  }));

  // "necrozma sm8b"식 세트코드 검색이 정확히 매치되면 그 결과만 — 이름 검색 노이즈 제거
  const setQuery = parseJpSetQuery(name);
  if (
    setQuery &&
    jpCards.length > 0 &&
    jpCards.every((c) => c.setName?.toUpperCase() === setQuery.setCode)
  ) {
    return NextResponse.json({ cards: jpCards });
  }

  const cards = settled.flatMap((r, i) =>
    r.status === "fulfilled"
      ? r.value.map((c) => ({
          ...c,
          game: games[i].id,
          franchise: games[i].franchise,
          // 원피스 공식 이미지 서버는 CORP로 크로스오리진 임베드를 막으므로 우리 이미지 프록시로 감싼다.
          imageUrl: `/api/img?url=${encodeURIComponent(c.imageUrl)}`,
        }))
      : []
  );
  cards.push(...jpCards);

  // 전부 실패했을 때만 에러 (일부 게임 실패는 나머지 결과로 응답)
  if (cards.length === 0 && settled.every((r) => r.status === "rejected")) {
    const first = settled[0] as PromiseRejectedResult;
    return NextResponse.json(
      { error: first.reason instanceof Error ? first.reason.message : "unknown" },
      { status: 502 }
    );
  }
  return NextResponse.json({ cards });
}
