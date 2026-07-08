"use client";
import { createContext, useContext } from "react";
import { HOME_ROOM_ID, Room } from "@/lib/rooms";

/**
 * 현재 보고 있는 방 정보 — Scene이 제공, 각 오브젝트 화면(Cabinet/Album 등)이 소비.
 * 화면 props 계약({ onClose })을 안 바꾸고 방 컨텍스트를 내려주기 위한 Context.
 */
export interface RoomContextValue {
  room: Room;
  /** 홈(내 방)인가 — false면 방문(읽기 전용) */
  isOwnRoom: boolean;
  /** 다른 방으로 이동 (방명록에서 유저 클릭 시) */
  visitRoom: (roomId: string) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export const RoomProvider = RoomContext.Provider;

/** 방 컨텍스트 소비 훅. Provider 밖에서 쓰이면 홈 방 기본값(단독 렌더 안전). */
export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (ctx) return ctx;
  return {
    room: { id: HOME_ROOM_ID, ownerName: HOME_ROOM_ID, renaissUser: "", avatarUrl: "" },
    isOwnRoom: true,
    visitRoom: () => {},
  };
}
