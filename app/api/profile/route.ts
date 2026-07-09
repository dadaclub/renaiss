import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/api/renaiss";

/**
 * 프로필 아바타 조회 — Renaiss 공개 프로필(getUserProfile)의 avatarUrl을 유저 UUID로 가져온다.
 * 프로필 배지가 rooms.ts 하드코딩 대신 이 라우트로 아바타를 받으므로, 유저가 Renaiss에서
 * 아바타를 바꾸면 코드 수정 없이 자동 반영된다. (SBT/쇼케이스와 동일한 프로필 소스)
 */
export const revalidate = 300;

export async function GET(request: Request) {
  const user = new URL(request.url).searchParams.get("user");
  if (!user) return NextResponse.json({ avatarUrl: "" }, { status: 400 });
  try {
    const profile = await getUserProfile(user);
    return NextResponse.json({ avatarUrl: profile.avatarUrl ?? "", username: profile.username ?? "" });
  } catch {
    // 프로필 조회 실패 시에도 UI가 이니셜 fallback으로 자연스럽게 처리되도록 빈 값 반환
    return NextResponse.json({ avatarUrl: "" });
  }
}
