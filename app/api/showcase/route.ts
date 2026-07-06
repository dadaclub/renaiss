import { NextResponse } from "next/server";
import { listCollectibles, getCardDetail } from "@/lib/api/renaiss";

/**
 * 진열장용 카드 피드 — Renaiss 공개 API에서 실카드(이미지 포함)를 가져와 단순화해 반환.
 * 지금은 마켓플레이스 상위 목록을 데모로 사용.
 * TODO(A): bscscan으로 지갑 보유 tokenId를 구하면 그 ID들로 교체 (?ids=1,2,3)
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

const FRANCHISE_LABEL: Record<string, string> = {
  POKEMON: "Pokémon",
  ONE_PIECE: "One Piece",
  SPORTS: "Sports",
};

export async function GET() {
  try {
    const listed = await listCollectibles({ limit: 8, sortBy: "fmvPriceInUsd", sortOrder: "desc" });
    const cards: ShowcaseCardDto[] = await Promise.all(
      listed.map(async (c) => {
        let imageUrl: string | undefined;
        let franchise = c.setName;
        try {
          const d = await getCardDetail(c.tokenId);
          imageUrl = d.frontWithoutStandImageUrl ?? d.frontImageUrl;
          if (d.type && FRANCHISE_LABEL[d.type]) franchise = FRANCHISE_LABEL[d.type];
        } catch {
          // 상세 실패 시 이미지 없이 목록 정보만 사용
        }
        const fmv = Number(c.fmvPriceInUSD);
        return {
          tokenId: c.tokenId,
          name: c.name,
          setName: c.setName,
          grade: `${c.gradingCompany} ${c.grade}`.trim(),
          franchise,
          year: c.year,
          priceUsd: Number.isFinite(fmv) ? fmv : undefined,
          acquiredAt: c.ownerAcquiredAt?.slice(0, 10).replaceAll("-", "."),
          imageUrl,
        };
      })
    );
    return NextResponse.json({ cards });
  } catch (e) {
    // 네트워크/API 장애 — 클라이언트가 목데이터로 폴백
    return NextResponse.json({ cards: [], error: e instanceof Error ? e.message : "unknown" }, { status: 502 });
  }
}
