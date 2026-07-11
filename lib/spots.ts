/** 핫스팟 좌표 설정 — 이미지(room_dark/bright_v3.png, 16:9 가로형) 기준 %. 좌표 수정은 이 파일에서만. */
import type { Corners } from "./quad";

export type SpotId =
  | "cabinet"
  | "computer"
  | "phone"
  | "photo"
  | "album"
  | "note"
  | "figure"
  | "figure2"
  | "figure3"
  | "figure4"
  | "figure5"
  | "snack";

export interface Spot {
  id: SpotId;
  label: string;
  /** 핫스팟 영역 (이미지 대비 %) */
  area: { left: number; top: number; width: number; height: number };
  /** 줌 타깃 중심점 (0~1) 과 배율 — 현재 phone(로그인 연출)에만 사용 */
  zoom: { cx: number; cy: number; scale: number };
  /** 외부 링크 스팟 — 클릭 시 새 화면 대신 이 URL을 새 탭으로 연다 (예: 피규어 → 르네 트위터) */
  href?: string;
  /**
   * 방 배경 위에 얹는 오브젝트 이미지 (예: 액자 안에 끼운 사진).
   * 클릭 영역(area)과 별개로, 방 아트에 그려진 액자 안쪽 여백에 정밀 배치한다.
   * corners: 액자 개구부 네 꼭짓점(방 이미지 대비 %). 위·아래 변 기울기가 달라도
   *          각 모서리를 독립적으로 잡아 사다리꼴/원근으로 맞춘다. (?edit 편집기로 조정)
   */
  overlay?: { src: string; corners: Corners };
  /** 클릭·호버 영역을 area(바운딩 박스) 안에서 이 네 꼭짓점 다각형으로 좁힌다(clip-path).
   *  기울어진 작은 오브젝트(과자봉지 등)에서 사각형 히트박스가 과하게 넓어지는 걸 막음.
   *  꼭짓점은 방 이미지 대비 %(area와 같은 좌표계). */
  clip?: Corners;
  /** 호버 pop 확대 배율 (기본 1.05 = 5%). 큰 평면 오브젝트(모니터·캐비닛)는 5%면 '가운데볼록'
   *  처럼 과해 보여 1.03(3%) 등으로 낮춘다. */
  popScale?: number;
}

// 핫스팟 좌표 — room_v5(16:9) 기준 ?edit 편집기로 측정. 기울어진 오브젝트도 클릭영역은
// 코너 4점의 바운딩 박스(축정렬 사각형)로 area를 잡았다. (figure만 아직 미측정 — placeholder)
// 클릭 시 새 화면(ObjectScreen)이 뜨므로 좌표는 클릭 영역용.
export const SPOTS: Spot[] = [
  { id: "cabinet",  label: "Card storage", area: { left: 4.4,  top: 4.5,  width: 36.1, height: 62.1 }, zoom: { cx: 0.14, cy: 0.29, scale: 2.2 }, popScale: 1.03 },
  { id: "computer", label: "Computer",     area: { left: 58.1, top: 31.7, width: 15.7, height: 18.4 }, zoom: { cx: 0.58, cy: 0.30, scale: 2.4 }, popScale: 1.03 },
  // 컴퓨터 화면 quad(room_v5 측정) — 나중에 모니터에 사진 얹을 때 아래 overlay 주석을 살리고 src만 교체.
  // overlay: { src: "/picture_v1.jpg", corners: { tl: [56, 33.2], tr: [71.7, 32.8], br: [71.6, 51.2], bl: [56.2, 51.2] } }
  // 액자: 클릭하면 PhotoScreen으로 확대(사진 경로는 PhotoScreen.tsx의 PHOTO_SRC).
  // 프레임 속 오버레이 사진은 제거함 — 다시 넣으려면 아래 overlay 주석을 살리면 됨.
  // overlay: { src: "/picture_v1_cdither_g2_l4.jpg", corners: { tl: [72.1, 11.4], tr: [88.6, 11.4], br: [88.9, 26], bl: [71.9, 25.9] } }
  { id: "photo",    label: "Photo frame",  area: { left: 72.8, top: 8.6,  width: 21,   height: 17.6 }, zoom: { cx: 0.83, cy: 0.13, scale: 2.3 } },
  { id: "note",     label: "Guestbook",    area: { left: 18.6, top: 85.7, width: 17.6, height: 10.5 }, zoom: { cx: 0.16, cy: 0.80, scale: 2.5 } },
  { id: "phone",    label: "Phone",        area: { left: 65,   top: 87.7, width: 8.1,  height: 6.7 },  zoom: { cx: 0.68, cy: 0.89, scale: 2.2 } },
  { id: "album",    label: "Album",        area: { left: 77,   top: 77.7, width: 13.9, height: 8.7 },  zoom: { cx: 0.79, cy: 0.80, scale: 2.2 } },
  // 바닥 과자봉지 — 화면 없음. 호버 시 과자 먹는 소리만(클릭 연출 없음).
  { id: "snack",    label: "Snack",        area: { left: 41.9, top: 88.5, width: 7.9,  height: 8 },    zoom: { cx: 0.46, cy: 0.90, scale: 2.2 } },
  // 책상 위 피규어 5개 → 각자 외부 사이트로 이동(href 스팟, 화면 없음·zoom 미사용). 왼→오 순.
  { id: "figure",   label: "Renaiss",         area: { left: 76.2, top: 41.4, width: 3.8,  height: 12.7 }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: "https://www.renaiss.xyz/" },
  { id: "figure2",  label: "@Plus_Ultra_715", area: { left: 81.2, top: 41.3, width: 3.8,  height: 12.7 }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: "https://x.com/Plus_Ultra_715" },
  { id: "figure3",  label: "Renaiss Discord", area: { left: 85.8, top: 41.3, width: 3.8,  height: 12.7 }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: "https://discord.com/invite/renaiss" },
  { id: "figure4",  label: "@Renaiss_cmty",   area: { left: 90.2, top: 41.4, width: 3.8,  height: 12.7 }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: "https://x.com/Renaiss_cmty" },
  { id: "figure5",  label: "@vinciwld",       area: { left: 94.2, top: 42.2, width: 3.8,  height: 12.7 }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: "https://x.com/vinciwld" },
];

export const IMG_ASPECT = 1672 / 941; // room_dark_v3 / room_bright_v3 (16:9 가로형)

/**
 * 로그인 전, 어둠 속에서 켜진 핸드폰 화면 불빛의 네 꼭짓점 (방 이미지 대비 %).
 * 핸드폰은 그림상 열린 플립폰이라, 클릭영역(phone.area)과 별개로 위쪽 디스플레이에 정확히 맞춘다.
 * (?edit 편집기의 phone 스팟으로 측정)
 */
export const PHONE_GLOW: { corners: Corners } = {
  corners: { tl: [51.8, 75.7], tr: [55.1, 76], br: [54.1, 82.3], bl: [50.6, 81.6] },
};

/** 방 씬 이미지 — 상태별 두 버전(크기·위치 동일, 색만 다름).
 *  입장 전=어두운 방(room_dark), 입장/로그인/방문 후=밝은 방(room_bright). Scene이 크로스페이드로 스위치. */
export const ROOM_IMG_DARK = "/room_dark_v3.png";
export const ROOM_IMG_BRIGHT = "/room_bright_v3.png";
/** 기본(밝은) 이미지 — Hotspot 호버 복제·LoginIntro·오브젝트 화면 배경 등 로그인 후 컨텍스트가 공유. */
export const ROOM_IMG = ROOM_IMG_BRIGHT;
