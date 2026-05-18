"use client";

import { useRef, useState, useEffect } from "react";

/**
 * ViewerSlideBox — scales a 1920×1080 slide to fit any container using
 * ResizeObserver, identical to the editor's SlideBox. This is needed because
 * CSS aspect-ratio + maxHeight on flex children is unreliable on mobile and
 * narrow viewports across browsers.
 *
 * The outer container fills the available space (flex-1). A ResizeObserver
 * measures it and computes the uniform scale factor so the 1920×1080 inner
 * div always fits without overflow and without empty space on either axis.
 */
export default function ViewerSlideBox({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        const scaleX = width / 1920;
        const scaleY = height / 1080;
        setScale(Math.min(scaleX, scaleY));
      }
    });

    const el = containerRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    /* Outer: fills all available space, clips the inner box */
    <div
      ref={containerRef}
      className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
    >
      {/* Inner: fixed at 1920×1080, scaled down to fit */}
      <div
        className="relative shadow-2xl"
        style={{
          width: "1920px",
          height: "1080px",
          transform: `scale(${scale})`,
          transformOrigin: "center",
          flexShrink: 0,
          WebkitFontSmoothing: "subpixel-antialiased",
        }}
      >
        {children}
      </div>
    </div>
  );
}
