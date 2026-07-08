import { NextResponse } from "next/server";
import { getSbtsFromContract } from "@/lib/api/bscscan";
import { getUserProfile } from "@/lib/api/renaiss";

/**
 * 앨범용 SBT 피드.
 *  1) Renaiss 공개 프로필(GET /v0/users/{id})의 favoritedSBTs — 유저가 전시용으로
 *     직접 고른 뱃지가 우선. env RENAISS_SHOWCASE_USER.
 *  2) 폴백: 온체인(BSC) — 지정 SBT 컨트랙트에서 지갑 보유 SBT의 메타데이터(이미지) 조회.
 *     env: ETHERSCAN_API_KEY(권장) 또는 BSCSCAN_API_KEY, RENAISS_SBT_CONTRACT, RENAISS_SHOWCASE_WALLET.
 *  3) 그래도 없으면 빈 배열 → 클라이언트가 목데이터로 폴백.
 */
export interface SbtDto {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
}

export const revalidate = 300;

// 데모 기본값 (env로 덮어쓰기 가능)
const SBT_CONTRACT = process.env.RENAISS_SBT_CONTRACT ?? "0x7D1B7dB704d722295fbAa284008f526634673DbF";
const WALLET = process.env.RENAISS_SHOWCASE_WALLET ?? "0x8954ac7dfe4e6e86e399f01496a7828e73cc57e5";

export async function GET(req: Request) {
  // ?user= 로 특정 방 주인의 SBT 조회 (방문 기능). 없으면 env 기본값.
  const user =
    new URL(req.url).searchParams.get("user")?.trim() || process.env.RENAISS_SHOWCASE_USER;
  // 1) Renaiss 프로필 — 유저가 전시용으로 직접 고른 뱃지(favoritedSBTs)가 우선
  if (user) {
    try {
      const profile = await getUserProfile(user);
      if (profile.favoritedSBTs.length > 0) {
        return NextResponse.json({ sbts: profile.favoritedSBTs, source: "profile" });
      }
    } catch {
      // 아래 온체인 폴백으로 진행
    }
  }

  // 2) 온체인 (BSC) 폴백 — 프로필 미설정/비어있음/장애 시 지갑 보유 SBT
  try {
    const onchain = await getSbtsFromContract(SBT_CONTRACT, WALLET);
    const usable = onchain.filter((s) => s.imageUrl || s.title);
    if (usable.length > 0) {
      const sbts: SbtDto[] = usable.map((s, i) => ({
        id: Number(s.tokenId) || i + 1,
        title: s.title ?? `SBT #${s.tokenId}`,
        description: s.description ?? "",
        imageUrl: s.imageUrl ?? "",
      }));
      return NextResponse.json({ sbts, source: "onchain" });
    }
  } catch {
    // 아래 목 폴백으로 진행
  }

  // 3) 데이터 없음 → 클라이언트 목 폴백
  return NextResponse.json({ sbts: [], error: "no-data" });
}
