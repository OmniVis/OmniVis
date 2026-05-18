"use client";

import { useState, useEffect } from "react";
import { X, Clock, RotateCcw } from "lucide-react";
import { useSlidiStore } from "@/store/slidiStore";
import { buildSrcdoc } from "@/components/SrcdocPreview";

function formatTs(ts: number): string {
  if (!ts) return "Before history";
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionHistoryDrawer({ isOpen, onClose }: VersionHistoryDrawerProps) {
  const { history, historyTimestamps, historyIndex, theme, branding, pushVersion } = useSlidiStore();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Reset preview when drawer closes
  useEffect(() => {
    if (!isOpen) setPreviewIndex(null);
  }, [isOpen]);

  const reversedEntries = history
    .map((code, i) => ({ code, ts: (historyTimestamps ?? [])[i] ?? 0, originalIndex: i }))
    .reverse();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-80 bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] z-[101] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } flex flex-col border-l border-slate-100`}
      >
        {/* Header */}
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
              Version History
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Clock className="w-6 h-6 text-slate-300 mb-3" />
              <p className="text-slate-900 font-bold text-sm mb-1">No version history yet</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Each generation is saved as a version you can restore.
              </p>
            </div>
          ) : (
            reversedEntries.map(({ code, ts, originalIndex }, i) => {
              const isCurrent = originalIndex === historyIndex;
              const versionNumber = history.length - i;
              const isPreviewing = previewIndex === originalIndex;
              return (
                <div
                  key={originalIndex}
                  className={`rounded-xl border p-3 transition-all ${
                    isCurrent
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-black text-slate-900">v{versionNumber}</span>
                      {isCurrent && (
                        <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTs(ts)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewIndex(isPreviewing ? null : originalIndex)}
                      className="flex-1 h-7 text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 rounded-lg hover:border-slate-300 transition-colors"
                    >
                      {isPreviewing ? "Hide" : "Preview"}
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => { pushVersion(code); onClose(); }}
                        className="flex-1 h-7 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                    )}
                  </div>

                  {/* Inline preview */}
                  {isPreviewing && (
                    <div className="mt-3 w-full aspect-video overflow-hidden rounded-lg border border-slate-200 relative">
                      <iframe
                        srcDoc={buildSrcdoc(code, theme, branding)}
                        sandbox="allow-scripts"
                        className="absolute inset-0 w-[300%] h-[300%] pointer-events-none"
                        style={{ transform: "scale(0.333)", transformOrigin: "top left" }}
                        title={`Version ${versionNumber} preview`}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400">
            <span className="font-black uppercase tracking-widest">{history.length}</span> of{" "}
            <span className="font-black uppercase tracking-widest">20</span> versions stored
          </p>
        </div>
      </aside>
    </>
  );
}
