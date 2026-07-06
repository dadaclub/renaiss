"use client";
import { ScreenShell } from "./ScreenShell";
import { Placeholder } from "./Placeholder";

/**
 * 앨범 — 거래내역 / 하이라이트.  담당: (팀원 이름)
 * 👉 이 파일 안에서만 자유롭게 작업하세요. onClose = 방으로 돌아가기.
 */
export function AlbumScreen({ onClose }: { onClose: () => void }) {
  return (
    <ScreenShell title="Album" onClose={onClose}>
      <Placeholder />
    </ScreenShell>
  );
}
