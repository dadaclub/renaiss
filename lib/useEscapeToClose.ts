"use client";
import { useEffect } from "react";

/** 열려있는 다이얼로그/화면 중 가장 위(가장 나중에 열린) 것만 Escape로 닫히게 하는 스택.
 *  모달 위에 모달이 떠 있어도 Esc 한 번에 하나씩만 닫힌다. */
const closeStack: (() => void)[] = [];
let listening = false;

function ensureListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || closeStack.length === 0) return;
    closeStack[closeStack.length - 1]();
  });
}

/** active가 true인 동안 onClose를 Escape 스택에 등록. */
export function useEscapeToClose(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    ensureListener();
    closeStack.push(onClose);
    return () => {
      const i = closeStack.lastIndexOf(onClose);
      if (i !== -1) closeStack.splice(i, 1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
