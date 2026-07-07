"use client";
import { useCallback, useEffect, useRef } from "react";

// 여러 핫스팟이 같은 클릭음을 공유 — AudioContext 하나 + 디코딩된 버퍼 캐시(파일당 1회만 디코딩)
let sharedCtx: AudioContext | null = null;
const bufferCache = new Map<string, Promise<AudioBuffer>>();

function getContext() {
  if (!sharedCtx) sharedCtx = new AudioContext();
  return sharedCtx;
}

function loadBuffer(ctx: AudioContext, src: string) {
  let promise = bufferCache.get(src);
  if (!promise) {
    promise = fetch(src)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data));
    bufferCache.set(src, promise);
  }
  return promise;
}

/** 클릭 효과음 재생 훅 — Web Audio API로 미리 디코딩해두고 재생 시 seek/디코딩 지연 없이 바로 튼다. */
export function useClickSound(src: string, volume = 0.5) {
  const bufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBuffer(getContext(), src)
      .then((buffer) => {
        if (!cancelled) bufferRef.current = buffer;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  return useCallback(() => {
    const buffer = bufferRef.current;
    if (!buffer) return;
    const ctx = getContext();
    if (ctx.state === "suspended") ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start(0);
  }, [volume]);
}
