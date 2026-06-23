"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSlidiStore } from "@/store/slidiStore";
import { Sparkles, ChevronRight, ChevronLeft, X, Play, Info } from "lucide-react";

const ONBOARDING_SEEN_KEY = "slidi-onboarding-seen";

const WELCOME_TEMPLATE_CODE = `export default function Presentation() {
  const [slide, setSlide] = useState(0);
  const total = 3;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") setSlide((s) => Math.min(s + 1, total - 1));
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="w-full h-full bg-sl-bg text-sl-text flex flex-col justify-between p-20 select-none font-sans relative overflow-hidden">
      {/* Background visual element */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sl-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sl-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center z-10">
        <span className="text-[10px] font-black tracking-widest text-sl-accent uppercase">SLIDI.CORE</span>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={\`w-6 h-1 rounded-full transition-all duration-300 \${i === slide ? "bg-sl-accent w-10" : "bg-sl-accent/20"}\`} />
          ))}
        </div>
      </div>

      {/* Main Slide Content */}
      <div className="flex-1 flex flex-col justify-center gap-8 max-w-4xl z-10">
        {slide === 0 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <span className="text-sl-sub text-xs font-black uppercase tracking-[0.2em] sl-slide-up">01 . Introduction</span>
            <h1 className="text-7xl font-black tracking-tight leading-none uppercase sl-slide-up sl-delay-1">
              Create presentations<br/>
              with absolute clarity.
            </h1>
            <p className="text-sl-sub text-xl max-w-3xl leading-relaxed sl-slide-up sl-delay-2">
              Welcome to Slidi! This is a live-compiled, interactive presentation template seeded especially for your tour. Swap themes, visually edit, or write code!
            </p>
          </div>
        )}

        {slide === 1 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <span className="text-sl-sub text-xs font-black uppercase tracking-[0.2em] sl-slide-up">02 . Direct Editing</span>
            <h1 className="text-7xl font-black tracking-tight leading-none uppercase sl-slide-up sl-delay-1">
              Interactive visual<br/>
              on-canvas editing.
            </h1>
            <p className="text-sl-sub text-xl max-w-3xl leading-relaxed sl-slide-up sl-delay-2">
              Try Visual Edit Mode: toggle the Paintbrush icon in the header toolbar, and double-click or click this paragraph to change its text visually. Slidi updates the code automatically!
            </p>
          </div>
        )}

        {slide === 2 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <span className="text-sl-sub text-xs font-black uppercase tracking-[0.2em] sl-slide-up">03 . Power Features</span>
            <h1 className="text-7xl font-black tracking-tight leading-none uppercase sl-slide-up sl-delay-1">
              Share and present<br/>
              seamlessly.
            </h1>
            <p className="text-sl-sub text-xl max-w-3xl leading-relaxed sl-slide-up sl-delay-2">
              Ready to present? Tap the Share button to copy a persistent link or start a synchronized remote Speaker console with notes and timers.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center border-t border-sl-text/10 pt-8 z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-sl-sub">ONBOARDING WALKTHROUGH</span>
        <span className="text-xs font-bold text-sl-text">{slide + 1} / {total}</span>
      </div>
    </div>
  );
}
`;

interface TourStep {
  selector: string;
  title: string;
  description: string;
  tip?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="canvas-pane"]',
    title: "Isolated aspect-ratio Sandbox",
    description: "Your presentation compiles in an isolated sandbox. It automatically scales to maintain a pixel-perfect 16:9 aspect ratio at any screen size, preventing clipping on mobile or widescreen monitors.",
    tip: "You can click 'Source' at the top to inspect and modify the raw React code inside a real-time Sandpack editor.",
  },
  {
    selector: '[data-tour="chat-textarea"]',
    title: "Command AI to Build Decks",
    description: "Describe what you want to present in plain language in the command log (e.g. 'A 3-slide pitch for a carbon-capture startup'). The AI writes React code, hooks up brand styling, and compiles it live!",
    tip: "You can toggle 'Plan Mode' next to the input to have the AI interview you for specific details before writing the deck.",
  },
  {
    selector: '[data-tour="visual-edit"]',
    title: "Direct On-Canvas Editing",
    description: "Toggle this Paintbrush button to enter Visual Edit Mode. Once active, double-click or click any text directly on the slide to edit it visually. Slidi updates the underlying code automatically!",
    tip: "Tip: Try toggling the Paintbrush button now, or click 'Next' to continue.",
  },
  {
    selector: '[data-tour="styles-toggle"]',
    title: "Curated Design Themes",
    description: "Toggle the Styles sidebar to instantly switch between premium, curated layouts and typography variables (cyberpunk, brutalist, minimal) without page reloads, or manage brand assets.",
  },
  {
    selector: '[data-tour="share-button"]',
    title: "Share & Present to the World",
    description: "Click Share to generate a secure, persistent sharing link or launch a synchronized remote Speaker console with notes and timers.",
    tip: "You have completed the onboarding! Enjoy creating extraordinary presentations.",
  },
];

export default function SlidiOnboardingTour() {
  const { generatedCode, pushVersion, setPresentationName, inspectMode } = useSlidiStore();
  const [mounted, setMounted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Read seen state on mount and register manual restart event listener
  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
    let timer: NodeJS.Timeout;
    if (!seen) {
      timer = setTimeout(() => {
        setShowWelcome(true);
      }, 1500);
    }

    const handleRestart = () => {
      setActiveStep(0);
      setShowWelcome(false);
    };

    window.addEventListener("slidi-start-onboarding", handleRestart);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("slidi-start-onboarding", handleRestart);
    };
  }, []);

  // Sync action gate for visual edit mode
  useEffect(() => {
    if (activeStep === 2 && inspectMode) {
      setActiveStep(3);
    }
  }, [inspectMode, activeStep]);

  // Handle mobile bottom tab switches programmatically to prevent broken overlays
  useEffect(() => {
    if (activeStep === null) return;
    const step = TOUR_STEPS[activeStep];
    
    if (step.selector === '[data-tour="chat-textarea"]') {
      const chatTab = document.querySelector('button[aria-label="View Chat"]');
      if (chatTab) (chatTab as HTMLButtonElement).click();
    } else {
      const canvasTab = document.querySelector('button[aria-label="View Canvas"]');
      if (canvasTab) (canvasTab as HTMLButtonElement).click();
    }
  }, [activeStep]);

  // Handle target bounding rect updates
  useEffect(() => {
    if (activeStep === null) {
      setRect(null);
      return;
    }

    const step = TOUR_STEPS[activeStep];
    const el = document.querySelector(step.selector);

    if (!el) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      setRect(el.getBoundingClientRect());
    };

    updateRect();

    // Attach listeners
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    const observer = new ResizeObserver(updateRect);
    observer.observe(el);
    resizeObserverRef.current = observer;

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      observer.disconnect();
      resizeObserverRef.current = null;
    };
  }, [activeStep]);

  const handleStartTour = () => {
    setShowWelcome(false);
    if (!generatedCode || generatedCode.trim() === "") {
      setPresentationName("Welcome to Slidi");
      pushVersion(WELCOME_TEMPLATE_CODE);
    }
    setActiveStep(0);
  };

  const handleSkipTour = () => {
    setShowWelcome(false);
    setActiveStep(null);
    localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
  };

  const handleNext = () => {
    if (activeStep === null) return;
    if (activeStep < TOUR_STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      setActiveStep(null);
      localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    }
  };

  const handleBack = () => {
    if (activeStep === null) return;
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  if (!mounted) return null;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 160,
      };
    }

    const padding = 16;
    const tooltipWidth = 340;
    const tooltipHeight = 240;

    let top = rect.bottom + padding;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }

    // If the highlighted element fills most of the screen (e.g. full-screen canvas),
    // center the tooltip vertically instead of positioning relative to the element.
    const elementFillsScreen = rect.height > window.innerHeight * 0.6;
    if (elementFillsScreen) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: `${tooltipWidth}px`,
        zIndex: 160,
      };
    }

    if (top + tooltipHeight > window.innerHeight - padding) {
      top = rect.top - tooltipHeight - padding;
    }
    // Keep tooltip below the header (~64px) to avoid overlap
    if (top < 64) top = 64;

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 160,
    };
  };

  return (
    <>
      {/* ── Welcome Toast Card ── */}
      {showWelcome && (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-[200] max-w-sm w-[calc(100vw-3rem)] rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(15,23,42,0.12)] p-6 sm:p-7 flex flex-col gap-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-400/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(139,92,246,0.2)] animate-pulse">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[9px] font-black text-violet-600 uppercase tracking-widest leading-none">Welcome to Slidi</span>
              <h4 className="text-slate-900 font-bold text-base mt-1 tracking-tight leading-snug">Create the Extraordinary.</h4>
              <p className="text-slate-500 text-[12px] leading-relaxed mt-2 font-medium">
                Ready to learn how to generate, style, and present gorgeous interactive decks in less than a minute? Take our quick tour!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={handleStartTour}
              className="flex-1 py-3 px-4 bg-slate-900 hover:bg-violet-600 text-white font-bold text-[10px] tracking-wider uppercase rounded-xl transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.15)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Tour
            </button>
            <button
              onClick={handleSkipTour}
              className="py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-[10px] tracking-wider uppercase rounded-xl border border-slate-200 transition-all active:scale-[0.97]"
            >
              Skip
            </button>
          </div>

          <button
            onClick={handleSkipTour}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-950 transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Active Tour Walkthrough Overlay ── */}
      {activeStep !== null && (
        <div className="fixed inset-0 z-[150] pointer-events-none">
          {/* Even-odd path Spotlight backdrop (blocks external clicks except inside cutout) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-auto">
            {rect ? (
              <path
                d={`M 0 0 h ${window.innerWidth} v ${window.innerHeight} h -${window.innerWidth} Z 
                    M ${rect.left - 6} ${rect.top - 6} 
                    h ${rect.width + 12} 
                    v ${rect.height + 12} 
                    h -${rect.width + 12} Z`}
                fill="rgba(15, 23, 42, 0.45)"
                fillRule="evenodd"
                className="transition-all duration-300 ease-out"
              />
            ) : (
              <rect
                width="100%"
                height="100%"
                fill="rgba(15, 23, 42, 0.45)"
              />
            )}
          </svg>

          {/* Floating Tooltip Card */}
          <div
            style={getTooltipStyle()}
            className="pointer-events-auto rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(15,23,42,0.12)] p-6 flex flex-col justify-between min-h-[220px] transition-all duration-300 animate-in zoom-in-95 ease-out"
          >
            <div>
              {/* Step progress bar */}
              <div className="flex gap-1 mb-4">
                {TOUR_STEPS.map((step, i) => (
                  <div
                    key={step.title}
                    className={`h-1.5 transition-all duration-300 flex-1 rounded-full ${
                      i <= activeStep ? "bg-violet-500" : "bg-slate-100"
                    }`}
                  />
                ))}
              </div>

              <span className="block text-[8px] font-black text-violet-500 uppercase tracking-widest">
                Step {activeStep + 1} of {TOUR_STEPS.length}
              </span>

              <h4 className="text-slate-900 font-bold text-base mt-1 tracking-tight leading-snug">
                {TOUR_STEPS[activeStep].title}
              </h4>

              <p className="text-slate-600 text-[12px] leading-relaxed mt-2 font-medium">
                {TOUR_STEPS[activeStep].description}
              </p>

              {TOUR_STEPS[activeStep].tip && (
                <div className="flex items-start gap-2 bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl mt-3">
                  <Info className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                  <span className="text-slate-500 text-[10px] font-medium leading-normal">
                    {TOUR_STEPS[activeStep].tip}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
              <button
                onClick={handleSkipTour}
                className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                Skip Tour
              </button>

              <div className="flex items-center gap-2">
                {activeStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="w-9 h-9 rounded-xl border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-all active:scale-90"
                    title="Back"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="h-9 rounded-xl border border-slate-900 bg-slate-900 hover:bg-violet-600 text-white px-4 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-[0.93] shadow-[0_4px_12px_rgba(15,23,42,0.15)]"
                >
                  {activeStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
