/**
 * Renaiss 공개 API 래퍼 (read-only, 서버 전용)
 * 공식 npm CLI 'renaiss'가 사용하는 공개 엔드포인트 — https://api.renaiss.xyz
 * 스키마 출처: renaiss@0.0.3-beta.2 의 openapi 생성 타입 (github.com/Renaiss-Protocol/renaiss-cli)
 * 카드 이미지는 목록엔 없고 상세(/v0/cards/{tokenId})에만 있음 → 목록 후 상세 N회 조회.
 */
const BASE = process.env.RENAISS_API_URL ?? "https://api.renaiss.xyz";

export interface RenaissListedCard {
  tokenId: string;
  name: string;
  setName: string;
  cardNumber: string;
  pokemonName: string;
  ownerAddress: string;
  askPriceInUSDT: string; // "NO-ASK-PRICE" 가능
  fmvPriceInUSD: string; // "NO-FMV-PRICE" 가능
  gradingCompany: string;
  grade: string;
  year: number;
  ownerAcquiredAt?: string;
  owner: { username: string } | null;
}

export interface RenaissCardDetail extends RenaissListedCard {
  frontImageUrl?: string;
  backImageUrl?: string;
  frontWithoutStandImageUrl?: string;
  type?: "POKEMON" | "ONE_PIECE" | "SPORTS";
}

export async function listCollectibles(
  opts: {
    limit?: number;
    categoryFilter?: "POKEMON" | "ONE_PIECE";
    search?: string;
    sortBy?: "fmvPriceInUsd" | "year" | "grade" | "name" | "listDate" | "mintDate";
    sortOrder?: "asc" | "desc";
  } = {}
): Promise<RenaissListedCard[]> {
  const q = new URLSearchParams();
  if (opts.limit) q.set("limit", String(opts.limit));
  if (opts.categoryFilter) q.set("categoryFilter", opts.categoryFilter);
  if (opts.search) q.set("search", opts.search);
  if (opts.sortBy) q.set("sortBy", opts.sortBy);
  if (opts.sortOrder) q.set("sortOrder", opts.sortOrder);
  const res = await fetch(`${BASE}/v0/marketplace?${q}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Renaiss API ${res.status}`);
  const data = (await res.json()) as { collection: RenaissListedCard[] };
  return data.collection ?? [];
}

export async function getCardDetail(tokenId: string): Promise<RenaissCardDetail> {
  const res = await fetch(`${BASE}/v0/cards/${encodeURIComponent(tokenId)}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Renaiss API ${res.status}`);
  const data = (await res.json()) as { collectible: RenaissCardDetail };
  return data.collectible;
}

/** SBT 뱃지 — 공개 프로필의 favoritedSBTs (유저가 전시용으로 고른 온체인 업적 뱃지) */
export interface RenaissSbt {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
}

/** 카드(컬렉터블) 쇼케이스 — 유저가 공개 프로필에 직접 올린 카드. 필드는 방어적으로(응답 스키마 확정 전) */
export interface RenaissFavoritedCollectible {
  id?: number | string;
  tokenId?: string;
  title?: string;
  name?: string;
  setName?: string;
  grade?: string;
  gradingCompany?: string;
  fmvPriceInUSD?: string | number;
  imageUrl?: string;
  frontImageUrl?: string;
  frontWithoutStandImageUrl?: string;
}

export interface RenaissUserProfile {
  id: string;
  username: string;
  avatarUrl: string;
  favoritedSBTs: RenaissSbt[];
  favoritedCollectibles: RenaissFavoritedCollectible[];
}

/** 공개 유저 프로필 조회 (GET /v0/users/{id}) — SBT 뱃지 + 쇼케이스 카드 + 프로필. id = username 또는 uuid */
export async function getUserProfile(id: string): Promise<RenaissUserProfile> {
  const res = await fetch(`${BASE}/v0/users/${encodeURIComponent(id)}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Renaiss API ${res.status}`);
  const data = (await res.json()) as RenaissUserProfile;
  return {
    ...data,
    favoritedSBTs: data.favoritedSBTs ?? [],
    favoritedCollectibles: data.favoritedCollectibles ?? [],
  };
}
