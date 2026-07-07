"use client";
import { useEffect, useState, type RefObject } from "react";

/** 요소의 렌더 크기(px)를 추적. 리사이즈 시 갱신(오버레이 matrix3d 재계산용). */
export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
