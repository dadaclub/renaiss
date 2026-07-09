/**
 * 방 레지스트리 — 방문 가능한 유저 방 목록 (하드코딩 데모).
 * 방명록에서 유저를 누르면 그 방(?room=<id>)으로 이동하고, 방마다 SBT·카드가 다르게 뜬다.
 * 새 방 추가 = 여기 한 줄 (renaissUser = 공개 프로필 UUID, 공개 식별자라 비밀 아님).
 * 첫 번째 방 = 홈(내 방). 나머지는 읽기 전용 방문 대상.
 */
export interface Room {
  /** URL의 ?room= 값 + 방명록 매칭 키 */
  id: string;
  /** 방문 배너·방명록 링크·프로필 배지에 쓰는 표시 이름 */
  ownerName: string;
  /** Renaiss 공개 프로필 UUID — /api/sbt, /api/showcase 조회용 */
  renaissUser: string;
  /** 프로필 아바타 (방 좌하단 배지용) — Renaiss 공개 프로필 avatarUrl */
  avatarUrl: string;
}

export const ROOMS: Room[] = [
  {
    id: "dada",
    ownerName: "Jada",
    renaissUser: "b5250240-9661-4894-b2e4-88e48db44e07",
    avatarUrl: "https://8nothtoc5ds7a0x3.public.blob.vercel-storage.com/avatars/25.jpg",
  },
  {
    id: "ari",
    ownerName: "joh",
    renaissUser: "7e76696c-c18b-46cd-9a51-b58c8a71a834",
    avatarUrl: "https://8nothtoc5ds7a0x3.public.blob.vercel-storage.com/avatars/38.jpg",
  },
];

/** 홈(내 방) = 레지스트리 첫 번째. 목 로그인은 이 방의 주인 기준. */
export const HOME_ROOM_ID = ROOMS[0].id;

export function getRoom(id: string | null | undefined): Room {
  return ROOMS.find((r) => r.id === id) ?? ROOMS[0];
}

/** 방명록 닉네임 → 방 (대소문자 무시). 알려진 유저면 그 방, 아니면 undefined(링크 없음). */
export function roomByNickname(nickname: string): Room | undefined {
  const n = nickname.trim().toLowerCase();
  return ROOMS.find((r) => r.ownerName.toLowerCase() === n || r.id.toLowerCase() === n);
}
