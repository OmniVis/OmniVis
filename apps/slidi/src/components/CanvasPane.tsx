"use client";

import { useSlidiStore } from "@/store/slidiStore";
import type { ThemeId } from "@/store/slidiStore";
import dynamic from "next/dynamic";
import { THEME_STYLES } from "@/lib/themes";

import SrcdocPreview from "@/components/SrcdocPreview";
import SlideNavigator from "@/components/SlideNavigator";

// Sandpack must be loaded client-side only
const SandpackPreview = dynamic(() => import("./SandpackCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-xs font-mono text-slate-400 animate-pulse">
        Loading sandbox…
      </div>
    </div>
  ),
});

interface CanvasPaneProps {
  activeView: "preview" | "code";
}

import React, { useRef, useEffect, useState, useCallback, memo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import ElementToolbar from "@/components/ElementToolbar";
import PropertiesPanel from "@/components/PropertiesPanel";
import {
  patchIconInCode,
  patchImageSrc,
  patchImageFit,
  patchImageAlt,
  patchLinkHref,
  patchLinkText,
  patchLinkTarget,
  patchTextInElement,
} from "@/lib/patchJsx";

/** Shared 16:9 slide box — renders at exactly 1920x1080 and scales to fit */
function SlideBox({ children, shadow = true }: { children: React.ReactNode; shadow?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        // Reserve a small visual margin so shadow / edges are never clipped.
        // On mobile (< 768px) use 16px total, on larger screens 48px.
        const pad = width < 600 ? 16 : width < 1024 ? 32 : 48;
        const scaleX = (width - pad) / 1920;
        const scaleY = (height - pad) / 1080;
        setScale(Math.min(scaleX, scaleY));
      }
    });
    const el = containerRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // Fills the parent section absolutely so no padding box can clip the scaled content.
    <div ref={containerRef} className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
      <div
        className={shadow ? "relative shadow-2xl" : "relative"}
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

function CanvasPaneInner({ activeView }: CanvasPaneProps): React.ReactElement {
  const generatedCode = useSlidiStore((s) => s.generatedCode);
  const theme = useSlidiStore((s) => s.theme);
  const isGenerating = useSlidiStore((s) => s.isGenerating);
  const inspectMode = useSlidiStore((s) => s.inspectMode);
  const setInspectMode = useSlidiStore((s) => s.setInspectMode);
  const streamingPreview = useSlidiStore((s) => s.streamingPreview);
  const branding = useSlidiStore((s) => s.branding);
  const selectedElement = useSlidiStore((s) => s.selectedElement);
  const setSelectedElement = useSlidiStore((s) => s.setSelectedElement);
  const currentSlide = useSlidiStore((s) => s.currentSlide);
  const pushVersion = useSlidiStore((s) => s.pushVersion);

  const [showPanel, setShowPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const [slideScale, setSlideScale] = useState(1);

  // Track slide scale (mirrors SlideBox ResizeObserver logic)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      const pad = width < 600 ? 16 : width < 1024 ? 32 : 48;
      setSlideScale(Math.min((width - pad) / 1920, (height - pad) / 1080));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Close panel when selection is cleared externally
  useEffect(() => {
    if (!selectedElement) {
      setShowPanel(false);
      setError(null);
    }
  }, [selectedElement]);

  function getToolbarPosition(el: typeof selectedElement) {
    if (!el || !canvasRef.current) return { x: 0, y: 0 };
    const container = canvasRef.current.getBoundingClientRect();
    const boxW = 1920 * slideScale;
    const boxH = 1080 * slideScale;
    const boxLeft = container.left + (container.width - boxW) / 2;
    const boxTop = container.top + (container.height - boxH) / 2;
    const elCenterX = boxLeft + (el.rect.left + el.rect.width / 2) * slideScale;
    const elTop = boxTop + el.rect.top * slideScale;
    return { x: elCenterX, y: Math.max(elTop - 58, container.top + 8) };
  }

  function applyPatch(patched: string | null) {
    if (!patched) {
      // Patch failed — keep the properties panel open and display the error
      setError("This element's structure is too complex to edit automatically. Try editing it directly in the 'Code' tab.");
      return;
    }
    setError(null);
    setShowPanel(false);
    setSelectedElement(null);
    setInspectMode(false);
  }

  const handleApplyIcon = useCallback((newValue: string) => {
    if (!selectedElement) return;
    const patched = patchIconInCode(generatedCode, currentSlide, selectedElement.currentValue, newValue);
    applyPatch(patched);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement, generatedCode, currentSlide]);

  const handleApplyImage = useCallback((changes: { src?: string; fit?: "cover" | "contain" | "fill"; alt?: string }) => {
    if (!selectedElement) return;
    let code = generatedCode;
    if (changes.src) {
      const p = patchImageSrc(code, currentSlide, selectedElement.currentValue, changes.src);
      if (p) code = p;
    }
    if (changes.fit) {
      const srcToUse = changes.src ?? selectedElement.currentValue;
      const p = patchImageFit(code, currentSlide, srcToUse, changes.fit);
      if (p) code = p;
    }
    if (changes.alt !== undefined) {
      const srcToUse = changes.src ?? selectedElement.currentValue;
      const p = patchImageAlt(code, currentSlide, srcToUse, changes.alt);
      if (p) code = p;
    }
    applyPatch(code !== generatedCode ? code : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement, generatedCode, currentSlide]);

  const handleApplyText = useCallback((newText: string) => {
    if (!selectedElement) return;
    const patched = patchTextInElement(
      generatedCode,
      currentSlide,
      selectedElement.tagName,
      selectedElement.currentValue,
      newText
    );
    applyPatch(patched);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement, generatedCode, currentSlide]);

  const handleApplyLink = useCallback((changes: { href?: string; text?: string; newTab?: boolean }) => {
    if (!selectedElement) return;
    let code = generatedCode;
    if (changes.href) {
      const p = patchLinkHref(code, currentSlide, selectedElement.currentValue, changes.href);
      if (p) code = p;
    }
    if (changes.text) {
      const hrefNow = changes.href ?? selectedElement.currentValue;
      const p = patchLinkText(code, currentSlide, hrefNow, changes.text);
      if (p) code = p;
    }
    if (changes.newTab !== undefined) {
      const hrefNow = changes.href ?? selectedElement.currentValue;
      const p = patchLinkTarget(code, currentSlide, hrefNow, changes.newTab);
      if (p) code = p;
    }
    applyPatch(code !== generatedCode ? code : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement, generatedCode, currentSlide]);

  // Debounce streaming preview so the iframe remounts at most ~7×/sec
  // instead of on every AI token. Committed code (generatedCode) is never
  // debounced — it only changes after the 300ms CodeSyncBack gate.
  const debouncedStreamingPreview = useDebounce(streamingPreview, 150);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Once the code tab is visited for the first time, keep the Sandpack editor
  // mounted permanently (hidden via CSS when not active). This prevents the
  // SandpackProvider from being destroyed and recreated on every tab switch,
  // which previously caused a brief flash of the empty state when returning
  // to preview mode.
  const [codeEditorEverShown, setCodeEditorEverShown] = useState(false);
  useEffect(() => {
    if (activeView === "code") setCodeEditorEverShown(true);
  }, [activeView]);

  const hasContent = mounted && generatedCode && !isGenerating;

  return (
    <section ref={canvasRef} id="slidi-canvas-area" data-tour="canvas-pane" className="flex-1 relative bg-slate-100 flex flex-col overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Inspect Mode Overlay */}
      {inspectMode && (
        <div className="absolute inset-0 z-50 pointer-events-none animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-blue-500/5 ring-inset ring-8 ring-blue-500/20 active:ring-blue-500/40 transition-all" />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 shadow-lg rounded-full">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                Target Mode: Click an element to edit
              </span>
              <button
                onClick={() => setInspectMode(false)}
                className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                title="Cancel"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {isGenerating ? (
        debouncedStreamingPreview ? (
          // Live streaming preview — 16:9 constrained, debounced to ~7fps
          <SlideBox>
            <SrcdocPreview code={debouncedStreamingPreview} theme={theme} branding={branding} />
          </SlideBox>
        ) : (
          // No streaming yet — animated skeleton at 16:9
          <SlideBox>
            <GeneratingSkeleton theme={theme} />
          </SlideBox>
        )
      ) : hasContent ? (
        <>
          {/* Preview tab — always mounted so the iframe is never destroyed on tab
              switch. Hidden with display:none when the code tab is active. */}
          <div
            className="absolute inset-0 z-10"
            style={{ display: activeView === "preview" ? "block" : "none" }}
          >
            <SlideBox>
              <SandpackPreview activeView="preview" />
            </SlideBox>
          </div>

          {/* Code editor tab — lazily mounted on first visit, then kept alive
              (hidden) so Sandpack state and syntax highlighting are preserved. */}
          {codeEditorEverShown && (
            <div
              className="absolute inset-0 z-10 flex flex-col p-4 md:p-6"
              style={{ display: activeView === "code" ? "flex" : "none" }}
            >
              <div className="flex-1 min-h-0">
                <SandpackPreview activeView="code" />
              </div>
            </div>
          )}
        </>
      ) : (
        // Empty state — centered card with its own aspect-ratio
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 md:p-8 lg:p-12 z-10">
          <EmptyState theme={mounted ? theme : "minimal"} />
        </div>
      )}

      {/* Slide Navigator — shown in preview mode when deck has multiple slides */}
      {!isGenerating && activeView === "preview" && <SlideNavigator />}

      {/* Floating element toolbar */}
      {selectedElement && inspectMode && (
        <ElementToolbar
          element={selectedElement}
          position={getToolbarPosition(selectedElement)}
          onReplace={() => {
            setError(null);
            setShowPanel(true);
          }}
          onMore={() => {
            setError(null);
            setShowPanel(true);
          }}
        />
      )}

      {/* Properties panel */}
      {selectedElement && showPanel && inspectMode && (
        <PropertiesPanel
          element={selectedElement}
          error={error}
          onClose={() => {
            setShowPanel(false);
            setError(null);
          }}
          onApplyIcon={handleApplyIcon}
          onApplyImage={handleApplyImage}
          onApplyLink={handleApplyLink}
          onApplyText={handleApplyText}
        />
      )}
    </section>
  );
}

const CanvasPane = memo(CanvasPaneInner);
export default CanvasPane;

function GeneratingSkeleton({ theme }: { theme: ThemeId }) {
  const s = THEME_STYLES[theme];
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(8);

  const stages = [
    { label: "Planning structure", icon: "◈" },
    { label: "Generating layout", icon: "⬡" },
    { label: "Rendering slides", icon: "◉" },
  ];

  useEffect(() => {
    // Cycle through stages every ~2.5s
    const stageTimer = setInterval(() => {
      setStage((p) => (p + 1) % stages.length);
    }, 2500);

    // Smoothly grow the progress bar, slowing near 90%
    const progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p + 0.3;
        if (p >= 70) return p + 0.8;
        return p + 2;
      });
    }, 200);

    return () => {
      clearInterval(stageTimer);
      clearInterval(progressTimer);
    };
  // stages.length is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accentRgb = s.accent; // e.g. "#6366f1"

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ backgroundColor: s.bg }}
    >
      {/* Shimmer sweep across the whole slide */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${s.accent}12 50%, transparent 60%)`,
          animation: "sl-sk-shimmer 2.4s ease-in-out infinite",
          backgroundSize: "200% 100%",
        }}
      />

      {/* Accent top bar — animated fill */}
      <div className="relative h-[6px] w-full overflow-hidden" style={{ backgroundColor: `${s.accent}22` }}>
        <div
          className="absolute top-0 left-0 h-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(progress, 98)}%`,
            background: `linear-gradient(to right, ${s.accent}, ${s.accent}cc)`,
            boxShadow: `0 0 12px ${s.accent}88`,
          }}
        />
      </div>

      {/* Slide content area */}
      <div className="flex-1 flex flex-col justify-center px-10 md:px-20 gap-5 md:gap-8 z-10">
        {/* Eyebrow shimmer line */}
        <div
          className="rounded overflow-hidden relative"
          style={{ width: 110, height: 10 }}
        >
          <div className="w-full h-full" style={{ backgroundColor: `${s.text}18` }} />
          <div className="absolute inset-0" style={{ animation: "sl-sk-bar 1.8s ease-in-out infinite", background: `linear-gradient(to right, transparent, ${s.text}28, transparent)` }} />
        </div>

        {/* Title blocks */}
        <div className="flex flex-col gap-3">
          {["68%", "50%"].map((w, i) => (
            <div
              key={i}
              className="rounded overflow-hidden relative"
              style={{ width: w, height: 36, animationDelay: `${i * 180}ms` }}
            >
              <div className="w-full h-full" style={{ backgroundColor: `${s.text}${i === 0 ? "22" : "16"}` }} />
              <div
                className="absolute inset-0"
                style={{
                  animation: `sl-sk-bar 1.8s ease-in-out ${i * 300}ms infinite`,
                  background: `linear-gradient(to right, transparent, ${s.text}28, transparent)`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Accent divider with pulse */}
        <div
          style={{
            width: 56,
            height: 5,
            backgroundColor: s.accent,
            opacity: 0.5,
            animation: "sl-sk-pulse 2s ease-in-out infinite",
            borderRadius: 99,
          }}
        />

        {/* Body lines with stagger */}
        <div className="flex flex-col gap-2.5">
          {[80, 65, 72].map((w, i) => (
            <div
              key={i}
              className="rounded overflow-hidden relative"
              style={{ width: `${w}%`, height: 12 }}
            >
              <div className="w-full h-full" style={{ backgroundColor: `${s.text}18` }} />
              <div
                className="absolute inset-0"
                style={{
                  animation: `sl-sk-bar 1.8s ease-in-out ${i * 220}ms infinite`,
                  background: `linear-gradient(to right, transparent, ${s.text}28, transparent)`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Card placeholders */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded overflow-hidden relative"
              style={{ height: 60 }}
            >
              <div className="w-full h-full" style={{ backgroundColor: `${s.text}0e` }} />
              <div
                className="absolute inset-0"
                style={{
                  animation: `sl-sk-bar 1.8s ease-in-out ${i * 400}ms infinite`,
                  background: `linear-gradient(to right, transparent, ${s.text}18, transparent)`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom status bar */}
      <div
        className="flex items-center justify-between px-6 py-4 z-10"
        style={{ borderTop: `1px solid ${s.text}10` }}
      >
        {/* Animated stage label */}
        <div className="flex items-center gap-2">
          <span
            className="text-[18px] leading-none"
            style={{ color: s.accent, animation: "sl-sk-pulse 1.6s ease-in-out infinite" }}
          >
            {stages[stage].icon}
          </span>
          <span
            key={stage}
            className="font-mono text-[9px] tracking-widest uppercase"
            style={{ color: s.accent, animation: "sl-sk-fadein 0.4s ease both" }}
          >
            {stages[stage].label}
          </span>
        </div>

        {/* Dot progress indicator */}
        <div className="flex gap-1.5 items-center">
          {stages.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === stage ? 16 : 6,
                height: 6,
                backgroundColor: i === stage ? s.accent : `${s.text}22`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Keyframes injected here — scoped inside the component render */}
      <style>{`
        @keyframes sl-sk-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes sl-sk-bar {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes sl-sk-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes sl-sk-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ theme }: { theme: ThemeId }) {
  const s = THEME_STYLES[theme];
  return (
    <div
      className="w-full max-w-4xl aspect-video shadow-2xl relative flex flex-col p-6 sm:p-10 md:p-16"
      style={{
        backgroundColor: s.bg,
        borderTop: `8px solid ${s.accent}`,
      }}
    >
      <div className="flex justify-between items-start mb-auto">
        <span
          className="font-mono text-xs md:text-sm tracking-widest"
          style={{ color: s.subtext }}
        >
          SLIDI.CORE
        </span>
        <div className="text-right">
          <span
            className="font-mono text-xs md:text-sm font-bold"
            style={{ color: s.text }}
          >
            01
          </span>
          <span
            className="font-mono text-xs md:text-sm"
            style={{ color: s.subtext }}
          >
            {" "}/ 01
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-3xl">
        <h1
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase animate-in slide-in-from-bottom-4 duration-1000 ease-out"
          style={{ color: s.text }}
        >
          Structural
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-current to-slate-400">Clarity.</span>
        </h1>
        <div
          className="w-12 md:w-24 h-1.5 md:h-2 mt-6 md:mt-10 mb-5 md:mb-8"
          style={{ backgroundColor: s.divider }}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
          <p
            className="text-sm md:text-base lg:text-lg leading-snug font-medium"
            style={{ color: s.subtext }}
          >
            Describe your presentation in the command log on the left to begin
            generating interactive slides.
          </p>
          <ul
            className="space-y-2 md:space-y-3 font-mono text-xs md:text-sm"
            style={{ color: s.subtext }}
          >
            <li className="flex items-center gap-2 md:gap-3">
              <span
                className="w-1.5 h-1.5 block shrink-0"
                style={{ backgroundColor: s.bullet1 }}
              />
              Programmatic Layouts
            </li>
            <li className="flex items-center gap-2 md:gap-3">
              <span
                className="w-1.5 h-1.5 block shrink-0"
                style={{ backgroundColor: s.bullet2 }}
              />
              AI-Generated React
            </li>
            <li className="flex items-center gap-2 md:gap-3">
              <span
                className="w-1.5 h-1.5 block shrink-0"
                style={{ backgroundColor: s.bullet2 }}
              />
              Live Preview
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
