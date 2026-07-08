import { NextResponse } from "next/server";

/**
 * 이미지 프록시 — 외부 이미지(원피스 공식 카드 이미지 등)를 우리 도메인으로 다시 서빙.
 * 이유: en.onepiece-cardgame.com 이 CORP(Cross-Origin-Resource-Policy) 헤더로 크로스오리진
 *       임베드를 차단(net::ERR_BLOCKED_BY_RESPONSE.NotSameSite)해서 <img>로 바로 못 씀.
 *       서버가 받아 same-origin으로 내려주면 브라우저가 정상 렌더.
 * 보안: 오픈 프록시/SSRF 방지 위해 허용 호스트만 통과. (?url= 로 원본 주소 전달)
 */
const ALLOWED_HOSTS = new Set([
  "en.onepiece-cardgame.com",
  "asia-en.onepiece-cardgame.com",
  "www.onepiece-cardgame.com", // 일본판 — JP 전용 프로모 판본이 여기에만 있음
  "onepiece-cardgame.com",
]);

export const revalidate = 86400; // 카드 이미지는 사실상 불변

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      // 일부 서버는 Referer 없는 서버-사이드 요청을 허용
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
      next: { revalidate: 86400 },
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "fetch failed" },
      { status: 502 }
    );
  }
}
