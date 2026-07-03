/** 핫스팟 좌표 설정 — 이미지(room2.webp, 1080x462) 기준 %. 좌표 수정은 이 파일에서만. */
export type SpotId = "cabinet" | "computer" | "window" | "phone" | "photo" | "album" | "note";

export interface Spot {
  id: SpotId;
  label: string;
  /** 핫스팟 영역 (이미지 대비 %) */
  area: { left: number; top: number; width: number; height: number };
  /** 줌 타깃 중심점 (0~1) 과 배율 — 현재 phone(로그인 연출)에만 사용 */
  zoom: { cx: number; cy: number; scale: number };
}

// room3(스케치) 라벨 기준 배치. 클릭 시 새 화면(ObjectScreen)이 뜨므로 좌표는 클릭 영역용.
// 아직 없는 오브젝트(과자)는 해당 기능 구현 시 추가.
export const SPOTS: Spot[] = [
  { id: "cabinet",  label: "Card storage", area: { left: 1,  top: 6,  width: 27, height: 47 }, zoom: { cx: 0.14, cy: 0.29, scale: 2.2 } },
  { id: "computer", label: "Computer",     area: { left: 48, top: 21, width: 19, height: 19 }, zoom: { cx: 0.58, cy: 0.30, scale: 2.4 } },
  { id: "photo",    label: "Photo frame",  area: { left: 69, top: 2,  width: 28, height: 23 }, zoom: { cx: 0.83, cy: 0.13, scale: 2.3 } },
  { id: "note",     label: "Guestbook",    area: { left: 5,  top: 70, width: 22, height: 22 }, zoom: { cx: 0.16, cy: 0.80, scale: 2.5 } },
  { id: "phone",    label: "Phone",        area: { left: 48, top: 72, width: 8,  height: 15 }, zoom: { cx: 0.52, cy: 0.79, scale: 3.0 } },
  { id: "album",    label: "Album",        area: { left: 62, top: 68, width: 34, height: 24 }, zoom: { cx: 0.79, cy: 0.80, scale: 2.2 } },
];

export const IMG_ASPECT = 1;
