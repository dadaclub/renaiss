/** 핫스팟 좌표 설정 — 이미지(room2.webp, 1080x462) 기준 %. 좌표 수정은 이 파일에서만. */
export type SpotId = "cabinet" | "computer" | "window" | "phone" | "photo" | "album";

export interface Spot {
  id: SpotId;
  label: string;
  /** 핫스팟 영역 (이미지 대비 %) */
  area: { left: number; top: number; width: number; height: number };
  /** 줌 타깃 중심점 (0~1) 과 배율 — 현재 phone(로그인 연출)에만 사용 */
  zoom: { cx: number; cy: number; scale: number };
}

// room2 오브젝트 기준. 클릭 시 새 화면(ObjectScreen)이 뜨므로 좌표는 클릭 영역용.
// 아직 없는 오브젝트(노트=방명록, 과자)는 해당 기능 구현 시 추가.
export const SPOTS: Spot[] = [
  { id: "cabinet",  label: "Card storage", area: { left: 32, top: 24, width: 14, height: 40 }, zoom: { cx: 0.39, cy: 0.44, scale: 2.0 } },
  { id: "computer", label: "Computer",     area: { left: 48, top: 29, width: 11, height: 21 }, zoom: { cx: 0.53, cy: 0.40, scale: 2.4 } },
  { id: "photo",    label: "Photo frame",  area: { left: 43, top: 25, width: 7,  height: 19 }, zoom: { cx: 0.47, cy: 0.35, scale: 2.6 } },
  { id: "phone",    label: "Phone",        area: { left: 40, top: 56, width: 8,  height: 10 }, zoom: { cx: 0.45, cy: 0.61, scale: 2.8 } },
  { id: "album",    label: "Album",        area: { left: 61, top: 54, width: 10, height: 17 }, zoom: { cx: 0.66, cy: 0.62, scale: 2.6 } },
];

export const IMG_ASPECT = 1080 / 462;
