"use client";
import { ScreenShell } from "./ScreenShell";
import { Placeholder } from "./Placeholder";

/**
 * 액자 — 사진 확대 보기.  담당: (팀원 이름)
 * 👉 이 파일 안에서만 자유롭게 작업하세요. onClose = 방으로 돌아가기.
 */
export function PhotoScreen({ onClose }: { onClose: () => void }) {
  return (
    <ScreenShell title="Photo" onClose={onClose}>
      <Placeholder />
    </ScreenShell>
  );
}
