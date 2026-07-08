/**
 * apitcg.com이 지원하는 TCG 목록 — 진열장 실물 카드 검색의 게임 선택지.
 * 새 게임 추가 = 여기 한 줄 (id는 apitcg URL 경로: https://www.apitcg.com/api/<id>/cards).
 * 클라이언트(등록 모달)와 서버(검색 래퍼·이미지 프록시)가 공유 — 비밀값 넣지 말 것.
 */
export interface ApiTcgGame {
  /** apitcg API 경로 조각 (예: "one-piece", "pokemon") */
  id: string;
  /** UI 칩 라벨 */
  label: string;
  /** 등록 시 franchise 필드에 자동 입력되는 값 */
  franchise: string;
  /** 이 게임 카드 이미지 호스트 — 이미지 프록시(/api/img) 허용 목록에 합류 */
  imageHosts: string[];
  /** 원피스식 카드 코드 검색(OP01-016) + 공식 사이트 판본(_pN) 프로빙 지원 여부 */
  codeSearch?: boolean;
}

export const APITCG_GAMES: ApiTcgGame[] = [
  {
    id: "one-piece",
    label: "One Piece",
    franchise: "One Piece",
    imageHosts: [
      "en.onepiece-cardgame.com",
      "asia-en.onepiece-cardgame.com",
      "www.onepiece-cardgame.com", // 일본판 — JP 전용 프로모 판본이 여기에만 있음
      "onepiece-cardgame.com",
    ],
    codeSearch: true,
  },
  { id: "pokemon", label: "Pokémon", franchise: "Pokémon", imageHosts: ["images.pokemontcg.io"] },
  {
    id: "digimon",
    label: "Digimon",
    franchise: "Digimon",
    imageHosts: ["images.digimoncard.io", "world.digimoncard.com", "en.digimoncard.com"],
  },
  {
    id: "dragon-ball-fusion",
    label: "Dragon Ball",
    franchise: "Dragon Ball",
    imageHosts: ["www.dbs-cardgame.com"],
  },
  {
    id: "union-arena",
    label: "Union Arena",
    franchise: "Union Arena",
    imageHosts: ["www.unionarena-tcg.com"],
  },
  { id: "gundam", label: "Gundam", franchise: "Gundam", imageHosts: ["www.gundam-gcg.com"] },
];

export function findGame(id: string | null | undefined): ApiTcgGame | undefined {
  return APITCG_GAMES.find((g) => g.id === id);
}
