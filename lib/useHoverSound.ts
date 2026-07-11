"use client";
import { useEffect, useRef } from "react";

// 여러 호버 사운드가 공유 — AudioContext 하나 + 디코딩된 버퍼 캐시(파일당 1회만 디코딩)
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

/**
 * 호버 반복 재생 훅 — 마우스가 올라가 있는 동안 루프 재생, 벗어나면 멈춘다.
 * Web Audio API(GainNode)로 재생해서 volume이 1을 넘어도(예: 1.6) 원본보다 더 크게 증폭할 수 있다
 * (HTMLMediaElement.volume은 0~1로 막혀있어서 그 이상은 못 키움).
 */
export function useHoverSound(src: string, hovering: boolean, volume = 0.5) {
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const wantsPlayingRef = useRef(false);

  const stop = () => {
    sourceRef.current?.stop();
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    gainRef.current?.disconnect();
    gainRef.current = null;
  };

  const start = () => {
    const buffer = bufferRef.current;
    if (!buffer || sourceRef.current) return;
    const ctx = getContext();
    if (ctx.state === "suspended") ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start(0);
    sourceRef.current = source;
    gainRef.current = gain;
  };

  useEffect(() => {
    let cancelled = false;
    bufferRef.current = null;
    loadBuffer(getContext(), src)
      .then((buffer) => {
        if (cancelled) return;
        bufferRef.current = buffer;
        if (wantsPlayingRef.current) start();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => {
    wantsPlayingRef.current = hovering;
    if (hovering) {
      start();
    } else {
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovering]);

  useEffect(() => {
    return () => {
      wantsPlayingRef.current = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
