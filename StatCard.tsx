import { ComponentType } from "react";
import { SpotId } from "@/lib/spots";
import { CabinetScreen } from "./CabinetScreen";
import { ComputerScreen } from "./ComputerScreen";
import { PhotoScreen } from "./PhotoScreen";
import { AlbumScreen } from "./AlbumScreen";
import { NoteScreen } from "./NoteScreen";

export type ScreenComponent = ComponentType<{ onClose: () => void }>;

/**
 * 오브젝트(스팟) → 화면 컴포넌트 매핑.
 * 새 오브젝트 추가 = 파일 하나 만들고 여기 한 줄 추가 (append-only, 충돌 최소).
 * ⚠️ 이 파일과 Scene.tsx / spots.ts 는 뼈대 담당만 수정.
 */
export const SCREENS: Partial<Record<SpotId, ScreenComponent>> = {
  cabinet: CabinetScreen,
  computer: ComputerScreen,
  photo: PhotoScreen,
  album: AlbumScreen,
  note: NoteScreen,
};
