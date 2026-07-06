/** 핫스팟 좌표 설정 — 이미지(room4.png, 정사각) 기준 %. 좌표 수정은 이 파일에서만. */
export type SpotId = "cabinet" | "computer" | "phone" | "photo" | "album" | "note" | "figure";

/** 르네시스 트위터(X) — 피규어 클릭 시 이동 */
export const RENE_TWITTER_URL = "https://x.com/renaissxyz";

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
   * 좌표는 방 이미지 대비 % (position: absolute 로 띄운 투명 박스).
   * skewY: 액자 개구부가 양옆은 세로로 곧고 위·아래 변만 기운 평행사변형이라,
   *        박스를 세로 방향으로 전단(shear)해 프레임 기울기에 맞춘다(도, 아래로 +).
   */
  overlay?: { src: string; left: number; top: number; width: number; height: number; skewY?: number };
}

// room4 라벨 기준 배치. 클릭 시 새 화면(ObjectScreen)이 뜨므로 좌표는 클릭 영역용.
// 아직 없는 오브젝트(과자)는 해당 기능 구현 시 추가.
export const SPOTS: Spot[] = [
  { id: "cabinet",  label: "Card storage", area: { left: 1,  top: 6,  width: 27, height: 47 }, zoom: { cx: 0.14, cy: 0.29, scale: 2.2 } },
  { id: "computer", label: "Computer",     area: { left: 48, top: 21, width: 19, height: 19 }, zoom: { cx: 0.58, cy: 0.30, scale: 2.4 } },
  { id: "photo",    label: "Photo frame",  area: { left: 69, top: 2,  width: 28, height: 23 }, zoom: { cx: 0.83, cy: 0.13, scale: 2.3 },
    // 벽 액자 안쪽 개구부(평행사변형)에 사진을 끼워 넣음(skewY로 기울기 맞춤). 클릭하면 PhotoScreen으로 확대.
    overlay: { src: "/picture_test.jpg", left: 72.1, top: 5.7, width: 24.4, height: 16.6, skewY: 7 } },
  { id: "note",     label: "Guestbook",    area: { left: 5,  top: 70, width: 22, height: 22 }, zoom: { cx: 0.16, cy: 0.80, scale: 2.5 } },
  { id: "phone",    label: "Phone",        area: { left: 48, top: 72, width: 8,  height: 15 }, zoom: { cx: 0.52, cy: 0.79, scale: 3.0 } },
  { id: "album",    label: "Album",        area: { left: 62, top: 68, width: 34, height: 24 }, zoom: { cx: 0.79, cy: 0.80, scale: 2.2 } },
  // 오른쪽 선반 가운데 피규어 → 르네 트위터(외부 링크). zoom은 미사용(href 스팟).
  { id: "figure",   label: "Rene on X",    area: { left: 84, top: 26, width: 8,  height: 9  }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: RENE_TWITTER_URL },
];

export const IMG_ASPECT = 1;

/** 방 씬 이미지 경로 — Scene(배경)과 Hotspot(호버 팝 복제)이 공유 */
export const ROOM_IMG = "/room4.png";
