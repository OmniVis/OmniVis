"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSlidiStore } from "@/store/slidiStore";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { buildSrcdoc } from "@/components/SrcdocPreview";
import Link from "next/link";

interface PresenterClientProps {
  channelId: string;
  initialSlide?: number;
  serverNotes?: Record<number, string>;
  serverCode?: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function PresenterClient({ channelId, initialSlide = 0, serverNotes, serverCode }: PresenterClientProps) {
  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [totalSlides, setTotalSlides] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(!!serverCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  // Tracks the slide the mini preview iframe is actually on so we can compute delta
  const prevSlideRef = useRef(-1);

  // In editor mode the store is seeded from localStorage (same origin as the
  // editor window), so generatedCode is available without any extra sync.
  const { notes: localNotes, setNote, generatedCode, theme, branding, engineVersion } = useSlidiStore();
  
  // Use server code (shared mode) or the editor's current code (editor mode)
  const previewCode = serverCode || generatedCode;
  
  // If in shared mode (serverCode exists), strictly use serverNotes (or empty).
  // Only fall back to localNotes in local editor mode.
  const notes = serverCode ? (serverNotes ?? {}) : localNotes;
  const currentNote = notes[currentSlide] ?? "";

  // Build srcdoc once — uses current theme/branding/engineVersion
  const previewSrcdoc = useMemo(
    () => (previewCode ? buildSrcdoc(previewCode, theme, branding, false, engineVersion) : ""),
    [previewCode, theme, branding, engineVersion]
  );

  // Scaling logic for the mini preview
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setPreviewScale(width / 1920);
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Sync mini preview iframe whenever currentSlide changes or iframe loads.
  useEffect(() => {
    if (!iframeLoaded) return;
    const prev = prevSlideRef.current;
    const from = prev === -1 ? 0 : prev;
    const cw = previewRef.current?.contentWindow;
    if (!cw) return;
    
    const delta = currentSlide - from;
    if (delta === 0) return;
    
    const direction = delta > 0 ? "next" : "prev";
    const count = Math.abs(delta);
    for (let i = 0; i < count; i++) {
      cw.postMessage({ type: "SLIDI_NAV", direction }, "*");
    }
    prevSlideRef.current = currentSlide;
  }, [currentSlide, iframeLoaded]);

  // Listen for sl_slide_change from the mini preview to learn totalSlides.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "sl_slide_change") {
        if (e.data.total) setTotalSlides(e.data.total);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // BroadcastChannel — syncs with the editor canvas in editor mode.
  // Retries every 2 s for up to 20 s so the presenter connects even if the
  // editor's BroadcastChannel takes a moment to mount.
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);


  useEffect(() => {
    const bc = new BroadcastChannel(channelId);
    bcRef.current = bc;
    retryCountRef.current = 0;

    bc.onmessage = (e) => {
      if (e.data.type === "SLIDI_STATE_SYNC") {
        setReady(true);
        setCurrentSlide(e.data.current);
        if (e.data.total) setTotalSlides(e.data.total);
        // Stop retrying once connected
        if (retryTimerRef.current) {
          clearInterval(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      }
    };

    // Fire immediately, then retry every 2 s for up to 20 s
    bc.postMessage({ type: "SLIDI_REQUEST_STATE" });
    retryTimerRef.current = setInterval(() => {
      retryCountRef.current += 1;
      if (retryCountRef.current >= 10) {
        clearInterval(retryTimerRef.current!);
        retryTimerRef.current = null;
        return;
      }
      bc.postMessage({ type: "SLIDI_REQUEST_STATE" });
    }, 2000);

    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
      bc.close();
    };
  }, [channelId]);

  // Fullscreen toggle
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNav = (direction: "prev" | "next") => {
    const delta = direction === "next" ? 1 : -1;
    const next = Math.max(0, Math.min(totalSlides - 1, currentSlide + delta));
    if (next === currentSlide) return;
    // setCurrentSlide triggers the useEffect which drives the mini preview iframe
    setCurrentSlide(next);

    if (serverCode) {
      // Shared mode: broadcast so any open viewer tabs follow along
      bcRef.current?.postMessage({ type: "SLIDI_GOTO_SLIDE", target: next });
    } else {
      // Editor mode: also drive the editor's main canvas so the audience sees it
      bcRef.current?.postMessage({ type: "SLIDI_REMOTE_NAV", direction });
    }
  };

  const progress = totalSlides > 1 ? currentSlide / (totalSlides - 1) : 0;

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="h-11 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <Link
          href={BASE || "/"}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${BASE}/assets/branding/Combination_Mark.svg`}
            alt="Slidi logo"
            className="h-5 w-auto object-contain"
          />
          <span className="text-slate-300 text-xs font-light">/</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Presenter
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Slide counter */}
          <div className="flex items-center gap-1 tabular-nums">
            {ready ? (
              <>
                <span className="text-sm font-black text-slate-900 leading-none">{currentSlide + 1}</span>
                <span className="text-xs text-slate-400 font-medium">/ {totalSlides}</span>
              </>
            ) : (
              <span className="text-xs text-slate-400 animate-pulse tracking-wide">Connecting…</span>
            )}
          </div>

          <div className="w-px h-4 bg-slate-200" />

          {/* Timer */}
          <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
            {formatTime(elapsed)}
          </span>

          <div className="w-px h-4 bg-slate-200" />

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="text-slate-400 hover:text-slate-900 transition-colors"
          >
            {isFullscreen
              ? <Minimize2 className="w-3.5 h-3.5" />
              : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 min-h-0">

        {/* Notes — always the primary content area */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Speaker Notes
            </p>
            {serverNotes && (
              <span className="text-[10px] text-slate-300 uppercase tracking-widest">Read-only</span>
            )}
          </div>
          <textarea
            value={currentNote}
            onChange={(e) => { if (!serverNotes) setNote(currentSlide, e.target.value); }}
            readOnly={!!serverNotes}
            placeholder={ready ? "No notes for this slide." : "Waiting for connection…"}
            className="flex-1 w-full bg-white border border-slate-200 rounded-xl p-4 text-sm leading-relaxed text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 resize-none shadow-sm"
          />
        </div>

        {/* Mini slide preview — shown whenever we have code */}
        {previewCode && (
          <div className="w-52 shrink-0 flex flex-col gap-2 min-h-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 shrink-0">
              Current Slide
            </p>
            <div 
              ref={containerRef}
              className="relative w-full aspect-video overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shrink-0"
            >
              <iframe
                ref={previewRef}
                srcDoc={previewSrcdoc}
                onLoad={() => setIframeLoaded(true)}
                sandbox="allow-scripts"
                className="absolute border-none select-none pointer-events-none"
                style={{ 
                  width: "1920px", 
                  height: "1080px", 
                  transform: `scale(${previewScale})`, 
                  transformOrigin: "top left" 
                }}
                title="Slide preview"
              />
              {/* Blocks all pointer/scroll events so the srcdoc wheel listener never fires */}
              <div className="absolute inset-0 z-10" />
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom nav ───────────────────────────────────────────── */}
      <nav className="h-14 bg-white border-t border-slate-200 flex items-center px-4 gap-4 shrink-0">
        <button
          onClick={() => handleNav("prev")}
          disabled={!ready || currentSlide === 0}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 text-[10px] font-semibold uppercase tracking-wider hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>

        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <button
          onClick={() => handleNav("next")}
          disabled={!ready || currentSlide === totalSlides - 1}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </nav>
    </div>
  );
}
