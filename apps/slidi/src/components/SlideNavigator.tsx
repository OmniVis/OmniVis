"use client";
import { Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { useSlidiStore } from "@/store/slidiStore";
import { useEffect, useState, useCallback, memo } from "react";

function SlideNavigatorInner() {
  const currentSlide = useSlidiStore((s) => s.currentSlide);
  const totalSlides = useSlidiStore((s) => s.totalSlides);
  const broadcastGoto = useSlidiStore((s) => s.broadcastGoto);
  const inspectMode = useSlidiStore((s) => s.inspectMode);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = document.getElementById("slidi-canvas-area");
    if (!target) return;

    if (!document.fullscreenElement) {
      target.requestFullscreen().catch((err) => {
        console.error("Error entering fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Error exiting fullscreen:", err);
      });
    }
  }, []);

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) broadcastGoto(currentSlide + 1);
  };

  const prevSlide = () => {
    if (currentSlide > 0) broadcastGoto(currentSlide - 1);
  };

  // Ensure totalSlides is at least 1 for display
  const displayTotal = Math.max(totalSlides, 1);
  const displayCurrent = totalSlides > 0 ? currentSlide + 1 : 1;

  const MAX_VISIBLE = 15;
  const indices = Array.from({ length: Math.min(totalSlides, MAX_VISIBLE) }, (_, i) => i);
  const overflow = totalSlides > MAX_VISIBLE ? totalSlides - MAX_VISIBLE : 0;

  return (
    <div className="flex items-center gap-4 py-3 px-6 bg-white border-t border-slate-200 shrink-0 z-[100] relative mt-auto">
      {/* Counter */}
      <div className="min-w-[70px] text-[11px] font-bold text-slate-500 tabular-nums tracking-tight">
        <span className="text-slate-900">{String(displayCurrent).padStart(2, '0')}</span>
        <span className="mx-1 text-slate-300">/</span>
        <span>{String(displayTotal).padStart(2, '0')}</span>
      </div>

      {/* Progress & Nav */}
      <div className="flex-1 flex items-center justify-center gap-4">
        {inspectMode ? (
          // Navigation is locked while the user is targeting an element to edit.
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest animate-pulse">
            Nav locked — editing
          </span>
        ) : (
          <>
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0 || totalSlides <= 1}
              className="p-1 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              title="Previous Slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              {indices.map((i) => (
                <button
                  key={i}
                  onClick={() => broadcastGoto(i)}
                  title={`Go to slide ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ease-in-out ${
                    i === currentSlide
                      ? "w-2.5 h-2.5 bg-slate-900"
                      : "w-1.5 h-1.5 bg-slate-200 hover:bg-slate-400"
                  }`}
                />
              ))}
              {overflow > 0 && (
                <span className="text-slate-400 text-[10px] font-bold">+{overflow}</span>
              )}
            </div>

            <button
              onClick={nextSlide}
              disabled={currentSlide === totalSlides - 1 || totalSlides <= 1}
              className="p-1 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              title="Next Slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer relative z-[101]"
          style={{ pointerEvents: 'auto' }}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 pointer-events-none" />
          ) : (
            <Maximize2 className="w-4 h-4 pointer-events-none" />
          )}
        </button>
      </div>
    </div>
  );
}

const SlideNavigator = memo(SlideNavigatorInner);
export default SlideNavigator;

