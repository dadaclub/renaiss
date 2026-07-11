"use client";
import { useEffect, useState } from "react";

/**
 * 유저 UUID로 Renaiss 프로필의 username을 가져온다 (/api/profile).
 * 즉석 생성된 방(synthetic)의 표시 이름 해석용. 없거나 실패면 undefined → 호출부에서 fallback.
 */
export function useProfileName(userId?: string): string | undefined {
  const [name, setName] = useState<string>();
  useEffect(() => {
    if (!userId) {
      setName(undefined);
      return;
    }
    let alive = true;
    fetch(`/api/profile?user=${encodeURIComponent(userId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setName(d?.username || undefined);
      })
      .catch(() => {
        if (alive) setName(undefined);
      });
    return () => {
      alive = false;
    };
  }, [userId]);
  return name;
}
