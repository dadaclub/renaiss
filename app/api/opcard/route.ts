import { NextResponse } from "next/server";
import { searchTcgCards } from "@/lib/api/apitcg";
import { APITCG_GAMES, findGame } from "@/lib/api/apitcgGames";

/**
 * TCG 카드 검색 프록시 — 진열장 실물 카드 등록용.
 * 카드명(?name=)과 게임(?game=, 기본 one-piece)으로 apitcg.com을 조회해 이미지 포함 결과를 반환.
 * APITCG_API_KEY는 이 서버 라우트에서만 사용 (클라이언트로 키가 새지 않게).
 * 시세는 apitcg에 없으므로 이미지·카드정보만 내려간다.
 */
export const revalidate = 3600;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  if (!name) return NextResponse.json({ cards: [] });

  const game = findGame(params.get("game") ?? APITCG_GAMES[0].id);
  if (!game) return NextResponse.json({ error: "unknown game" }, { status: 400 });

  if (!process.env.APITCG_API_KEY) {
    return NextResponse.json({ error: "APITCG_API_KEY not configured" }, { status: 501 });
  }

  try {
    const cards = await searchTcgCards(game, name);
    // 원피스 공식 이미지 서버는 CORP로 크로스오리진 임베드를 막으므로 우리 이미지 프록시로 감싼다.
    const proxied = cards.map((c) => ({
      ...c,
      imageUrl: `/api/img?url=${encodeURIComponent(c.imageUrl)}`,
    }));
    return NextResponse.json({ cards: proxied });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 502 }
    );
  }
}
