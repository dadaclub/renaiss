"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_PHOTO_URL } from "@/lib/photos";
import { HOME_ROOM_ID, Room } from "@/lib/rooms";
import { supabase } from "@/lib/supabase";

/**
 * 현재 보고 있는 방 정보 — Scene이 제공, 각 오브젝트 화면(Cabinet/Album 등)이 소비.
 * 화면 props 계약({ onClose })을 안 바꾸고 방 컨텍스트를 내려주기 위한 Context.
 */
export interface RoomContextValue {
  room: Room;
  /** 홈(내 방)인가 — false면 방문(읽기 전용) */
  isOwnRoom: boolean;
  /** 현재 방의 액자 사진. 저장값이 없거나 로딩 실패 시 기본 샘플. */
  photoUrl: string;
  /** PhotoScreen에서 저장 성공 직후 방 액자와 상세 화면을 즉시 동기화. */
  setPhotoUrl: (photoUrl: string) => void;
  /** 다른 방으로 이동 (방명록에서 유저 클릭 시) */
  visitRoom: (roomId: string) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

type RoomPhotoRow = {
  photo_url: string | null;
};

export function RoomProvider({
  room,
  isOwnRoom,
  visitRoom,
  children,
}: {
  room: Room;
  isOwnRoom: boolean;
  visitRoom: (roomId: string) => void;
  children: ReactNode;
}) {
  const [photoUrl, setPhotoUrl] = useState(DEFAULT_PHOTO_URL);

  useEffect(() => {
    let cancelled = false;
    setPhotoUrl(DEFAULT_PHOTO_URL);

    async function loadPhoto() {
      const { data, error } = await supabase
        .from("room_photos")
        .select("photo_url")
        .eq("room_id", room.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Failed to load room photo", error);
        setPhotoUrl(DEFAULT_PHOTO_URL);
        return;
      }

      const row = data as RoomPhotoRow | null;
      setPhotoUrl(row?.photo_url || DEFAULT_PHOTO_URL);
    }

    loadPhoto();
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  return (
    <RoomContext.Provider value={{ room, isOwnRoom, photoUrl, setPhotoUrl, visitRoom }}>
      {children}
    </RoomContext.Provider>
  );
}

/** 방 컨텍스트 소비 훅. Provider 밖에서 쓰이면 홈 방 기본값(단독 렌더 안전). */
export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (ctx) return ctx;
  return {
    room: { id: HOME_ROOM_ID, ownerName: HOME_ROOM_ID, renaissUser: "", avatarUrl: "" },
    isOwnRoom: true,
    photoUrl: DEFAULT_PHOTO_URL,
    setPhotoUrl: () => {},
    visitRoom: () => {},
  };
}
