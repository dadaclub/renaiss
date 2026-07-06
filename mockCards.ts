"use client";
import { ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** 우측 고정(데스크톱) / 바텀시트(모바일) 글래스 패널 */
export function GlassPanel({ open, onClose, children }: Props) {
  return (
    <aside
      className={[
        "fixed z-40 bg-glass border border-glassline rounded-panel backdrop-blur-xl",
        "p-6 overflow-y-auto transition-all duration-[450ms]",
        // desktop
        "md:top-1/2 md:right-[4vw] md:w-[380px] md:max-h-[82vh] md:-translate-y-1/2",
        open ? "md:translate-x-0 md:opacity-100" : "md:translate-x-8 md:opacity-0 md:pointer-events-none",
        // mobile bottom sheet
        "max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:w-full max-md:max-h-[62vh] max-md:rounded-b-none",
        open ? "max-md:translate-y-0 max-md:opacity-100" : "max-md:translate-y-10 max-md:opacity-0 max-md:pointer-events-none",
      ].join(" ")}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream/10 text-cream text-sm hover:bg-cream/20"
      >
        ✕
      </button>
      {children}
    </aside>
  );
}
