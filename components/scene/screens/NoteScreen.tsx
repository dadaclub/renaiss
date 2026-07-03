"use client";
import { ScreenShell } from "./ScreenShell";
import { Placeholder } from "./Placeholder";

/**
 * 노트 — 방명록 남기기.  담당: (팀원 이름 / 저장은 Upstash·Neon)
 * 👉 이 파일 안에서만 자유롭게 작업하세요. onClose = 방으로 돌아가기.
 */
export function NoteScreen({ onClose }: { onClose: () => void }) {
  return (
    <ScreenShell title="Guestbook" onClose={onClose}>
      <Placeholder label="Guestbook coming soon" />
    </ScreenShell>
  );
}
