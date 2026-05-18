"use client";

import { useSlidiStore } from "@/store/slidiStore";

/**
 * Horizontal strip of avatar circles showing who is currently in the collab session.
 * Displayed in the Header when `isCollabActive` is true.
 *
 * When collab is active but no guests have joined yet, shows a "waiting" indicator
 * instead of being invisible — so the user knows collab actually started.
 */
export default function PresenceBar() {
  const collaborators = useSlidiStore((s) => s.collaborators);
  const isCollabActive = useSlidiStore((s) => s.isCollabActive);

  if (!isCollabActive) return null;

  if (collaborators.length === 0) {
    return (
      <div
        className="flex items-center gap-1 px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-full"
        title="Collab active — waiting for guests to join"
        aria-label="Collab active, waiting for guests"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Waiting</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" aria-label="Active collaborators">
      {collaborators.map((c) => {
        const initials = c.username
          ? c.username.slice(0, 2).toUpperCase()
          : "?";
        return (
          <div
            key={c.sub}
            title={`${c.username ?? "Anonymous"} — slide ${c.cursorSlide + 1}`}
            className="relative flex items-center justify-center w-6 h-6 rounded-full text-white text-[9px] font-black ring-2 ring-white shrink-0 cursor-default select-none"
            style={{ backgroundColor: c.color }}
          >
            {initials}
            {/* Slide indicator dot */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[6px] font-bold leading-none"
              style={{ color: c.color }}
            >
              {c.cursorSlide + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}
