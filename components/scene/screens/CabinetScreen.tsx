"use client";
import { ScreenShell } from "./ScreenShell";
import { Placeholder } from "./Placeholder";

/**
 * 카드 컬렉션 화면.  담당: (팀원 이름)
 * 👉 이 파일 안에서만 자유롭게 작업하세요. onClose = 방으로 돌아가기.
 *    ScreenShell/Placeholder는 지우고 원하는 UI로 교체해도 됩니다.
 */
export function CabinetScreen({ onClose }: { onClose: () => void }) {
  return (
    <ScreenShell title="Card Collection" onClose={onClose}>
      <Placeholder />
    </ScreenShell>
  );
}
