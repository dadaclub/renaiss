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
  /** 방문 방을 채울 온체인 카드 tokenId 목록 (마켓플레이스 실카드, 실시세).
   *  지정하면 이 방은 온체인 카드만 표시 — 홈(dada)은 미지정(실물+확정값 사용). */
  onchainTokenIds?: string[];
  /** 레지스트리에 없는 임의 UUID로 즉석 생성된 방인지. true면 이름/아바타를 프로필에서 async 로드. */
  synthetic?: boolean;
}

export const ROOMS: Room[] = [
  {
    id: "dada",
    ownerName: "Dada",
    renaissUser: "b5250240-9661-4894-b2e4-88e48db44e07",
    avatarUrl:
      "https://ndkrschqoxoqsxke.public.blob.vercel-storage.com/user-profile-images/ccccc-1783771042774.jpg",
  },
  {
    id: "joh",
    ownerName: "joh",
    renaissUser: "7e76696c-c18b-46cd-9a51-b58c8a71a834",
    avatarUrl:
      "https://ndkrschqoxoqsxke.public.blob.vercel-storage.com/user-profile-images/melonsdo4153-1783771060693.png",
    onchainTokenIds: [
      "93590260927867236827177606824992012223206200865404424287563030473522080256529",
      "100321052499733917869013506697132039521581103605747154648989157935387654986348",
      "108112501365481237603420992855401075067616189088418159102810085351559427567541",
      "23978911313674688980445784302206134809852955825243568116924548880380372016912",
      "98240454832135494254076801441004867697046253838128989322352494703537693641381",
    ],
  },
  {
    id: "ari",
    ownerName: "ari",
    renaissUser: "daf9438f-f00a-4f67-b17b-fcbf39559ed1",
    avatarUrl: "https://8nothtoc5ds7a0x3.public.blob.vercel-storage.com/avatars/34.jpg",
    onchainTokenIds: [
      "85605463723870720314327557119231703410029182075825255448855751705944967604140",
      "58866456146623788668453413704372329964859934712409797725614604293331297992204",
      "86356534997151465785740788368568977279012204583042718398024129983750410187502",
      "108607716299715092036545764515168784196174886198485106886230630990852811346688",
      "7125934155513548605341243776969416085767685137080516637279330692931592322428",
    ],
  },
  {
    id: "kikiundo",
    ownerName: "kikiundo",
    renaissUser: "4bd8ef5f-bc91-4b9a-a7f0-346dcd6a6018",
    avatarUrl:
      "https://ndkrschqoxoqsxke.public.blob.vercel-storage.com/user-profile-images/kikiundo-1783771221371.jpg",
    onchainTokenIds: [
      "26735001016119644293269800149978273795695747903495993200330716690637980725794",
      "82116862833552490132811876373911468082411602722512118594200873547421796992135",
      "13061766542369013502407151719236473202207402648829896041259244790055509707656",
      "83772951018941864043110412685157896124463971176130861441769739806340948141561",
      "37212548751055412724037874715502493283884049133374851794831882554711905156674",
    ],
  },
];

/** 홈(내 방) = 레지스트리 첫 번째. 목 로그인은 이 방의 주인 기준. */
export const HOME_ROOM_ID = ROOMS[0].id;

export function getRoom(id: string | null | undefined): Room {
  // 앞뒤 공백·개행 제거 — ?room= 값이나 붙여넣기에 개행이 섞이면 등록된 방과 매칭이 깨지고,
  // 그 값이 방명록 owner로 저장돼 "joh\r\n" 같은 유령 글(어느 방에도 안 뜸)이 생긴다.
  const clean = id?.trim();
  if (!clean) return ROOMS[0];
  // 등록된 방: id 또는 renaissUser(UUID)로 매칭 → 예쁜 이름/카드가 있는 방으로 연결
  const found = ROOMS.find((r) => r.id === clean || r.renaissUser === clean);
  if (found) return found;
  // 미등록 UUID → 즉석 방 생성. id=UUID(방명록 owner 키), 이름/아바타는 프로필에서 async 로드.
  return { id: clean, ownerName: clean.slice(0, 6), renaissUser: clean, avatarUrl: "", synthetic: true };
}

/** 방명록 닉네임 → 방 (대소문자 무시). 알려진 유저면 그 방, 아니면 undefined(링크 없음). */
export function roomByNickname(nickname: string): Room | undefined {
  const n = nickname.trim().toLowerCase();
  return ROOMS.find((r) => r.ownerName.toLowerCase() === n || r.id.toLowerCase() === n);
}
