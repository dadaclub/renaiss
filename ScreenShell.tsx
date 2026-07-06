"use client";
import { ScreenShell } from "./ScreenShell";
import { Placeholder } from "./Placeholder";

/**
 * 컴퓨터 화면 (미니게임 — 피카츄 배구).  담당: (팀원 이름)
 * 👉 이 파일 안에서만 자유롭게 작업하세요. onClose = 방으로 돌아가기.
 */
export function ComputerScreen({ onClose }: { onClose: () => void }) {
  return (
    <ScreenShell title="Computer" onClose={onClose}>
      <Placeholder label="Game coming soon" />
    </ScreenShell>
  );
}
