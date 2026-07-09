"use client";
import { useEffect, useState } from "react";

/**
 * 유저 UUID로 Renaiss 프로필 아바타 URL을 가져온다 (/api/profile).
 * 없거나 조회 실패면 undefined → 호출부에서 이니셜 fallback 처리.
 */
export function useAvatar(userId?: string): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!userId) {
      setUrl(undefined);
      return;
    }
    let alive = true;
    fetch(`/api/profile?user=${encodeURIComponent(userId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setUrl(d?.avatarUrl || undefined);
      })
      .catch(() => {
        if (alive) setUrl(undefined);
      });
    return () => {
      alive = false;
    };
  }, [userId]);
  return url;
}
