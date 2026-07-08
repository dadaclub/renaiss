import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/api/renaiss";

/**
 * 진열장용 카드 피드 — Renaiss 공개 프로필의 "쇼케이스 카드"(favoritedCollectibles).
 * 유저가 프로필에 직접 올린 카드만 반환 (앨범의 favoritedSBTs 와 동일 패턴). env RENAISS_SHOWCASE_USER.
 * ⚠️ 예전엔 마켓플레이스 상위 8장을 데모로 넣었으나, 실제 소유 카드가 아니라 오해를 줘서 제거함.
 *    공개 API엔 "지갑주소 보유 카드" 엔드포인트가 없음(마켓은 owner 필터 미지원). 유저 ID 쇼케이스가 유일한 유저 스코프.
 * 비어있으면 빈 배열 → 진열장은 빈 선반(수동 등록 카드만) 표시.
 */
export interface ShowcaseCardDto {
  tokenId: string;
  name: string;
  setName: string;
  grade: string;
  franchise: string;
  year: number;
  priceUsd?: number;
  acquiredAt?: string;
  imageUrl?: string;
}

export const revalidate = 300;

export async function GET() {
  const user = process.env.RENAISS_SHOWCASE_USER;
  if (!user) return NextResponse.json({ cards: [] });

  try {
    const profile = await getUserProfile(user);
    const cards: ShowcaseCardDto[] = profile.favoritedCollectibles
      .map((c, i) => {
        const fmv = Number(c.fmvPriceInUSD);
        return {
          tokenId: String(c.tokenId ?? c.id ?? i),
          name: c.name ?? c.title ?? "Untitled card",
          setName: c.setName ?? "",
          grade: [c.gradingCompany, c.grade].filter(Boolean).join(" ").trim(),
          franchise: c.setName ?? "",
          year: 0,
          priceUsd: Number.isFinite(fmv) ? fmv : undefined,
          imageUrl: c.frontWithoutStandImageUrl ?? c.frontImageUrl ?? c.imageUrl,
        };
      })
      // 이미지나 이름이 있는 카드만
      .filter((c) => c.imageUrl || c.name !== "Untitled card");
    return NextResponse.json({ cards, source: "showcase" });
  } catch (e) {
    return NextResponse.json(
      { cards: [], error: e instanceof Error ? e.message : "unknown" },
      { status: 502 }
    );
  }
}
