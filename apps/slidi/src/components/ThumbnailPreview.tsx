"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { buildSrcdoc } from "@/components/SrcdocPreview";
import type { ThemeId, Branding } from "@/store/slidiStore";

interface ThumbnailPreviewProps {
  code: string;
  theme: ThemeId;
  branding?: Branding | null;
}

export default function ThumbnailPreview({ code, theme, branding = null }: ThumbnailPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // LocalSessionItem's IntersectionObserver already guarantees this component
  // only mounts when the gallery card is visible — no second IO needed here.
  const srcdoc = useMemo(() => {
    if (!code) return "";
    return buildSrcdoc(code, theme, branding);
  }, [code, theme, branding]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(entry.contentRect.width / 1920);
      }
    });
    resizer.observe(el);
    return () => resizer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-video bg-slate-100 overflow-hidden relative rounded-t-xl"
    >
      {code ? (
        <iframe
          srcDoc={srcdoc}
          className="absolute border-none pointer-events-none select-none"
          style={{
            width: "1920px",
            height: "1080px",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          sandbox="allow-scripts"
          title="Slide thumbnail"
          tabIndex={-1}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/branding/Brand_Icon.svg`}
            alt=""
            className="w-8 h-8 opacity-20"
          />
        </div>
      )}
    </div>
  );
}
