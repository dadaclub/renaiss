"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

interface ViewportScaleProps {
  children: ReactNode;
  className?: string;
}

interface Size {
  width: number;
  height: number;
}

function getInnerSize(el: HTMLElement): Size {
  const style = getComputedStyle(el);
  const xPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const yPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  return {
    width: Math.max(0, el.clientWidth - xPadding),
    height: Math.max(0, el.clientHeight - yPadding),
  };
}

/**
 * Scales a fixed-size popup down to fit the visible viewport without changing
 * its normal size on larger screens. CSS transforms preserve pointer targets.
 */
export function ViewportScale({ children, className = "" }: ViewportScaleProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Size>({ width: 0, height: 0 });
  const [content, setContent] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const frameEl = frameRef.current;
    const contentEl = contentRef.current;
    if (!frameEl || !contentEl) return;

    const update = () => {
      setFrame(getInnerSize(frameEl));
      setContent({
        width: contentEl.offsetWidth,
        height: contentEl.offsetHeight,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(frameEl);
    ro.observe(contentEl);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  const scale =
    frame.width > 0 && frame.height > 0 && content.width > 0 && content.height > 0
      ? Math.min(1, frame.width / content.width, frame.height / content.height)
      : 1;

  return (
    <div ref={frameRef} className={`w-full h-full min-h-0 flex items-center justify-center ${className}`}>
      <div
        className="relative shrink-0"
        style={{
          width: content.width ? content.width * scale : undefined,
          height: content.height ? content.height * scale : undefined,
        }}
      >
        <div
          ref={contentRef}
          className="w-max max-w-none"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
