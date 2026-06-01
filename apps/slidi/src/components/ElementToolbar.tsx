"use client";

import { Upload, Pencil, SlidersHorizontal } from "lucide-react";
import type { SelectedElement } from "@/store/slidiStore";

interface ElementToolbarProps {
  element: SelectedElement;
  /** Page coordinates (fixed) — toolbar centered on this x, above this y */
  position: { x: number; y: number };
  onReplace: () => void;
  onMore: () => void;
}

export default function ElementToolbar({
  element,
  position,
  onReplace,
  onMore,
}: ElementToolbarProps) {
  const isText = element.elementType === "text";

  if (!["icon", "image", "link", "text"].includes(element.elementType)) return null;

  return (
    <div
      className="fixed z-[9999] flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-lg"
      style={{ left: position.x, top: position.y, transform: "translateX(-50%)" }}
    >
      <button
        onClick={onReplace}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
        title={isText ? "Edit text" : "Replace"}
      >
        {isText ? (
          <Pencil size={13} className="text-slate-600" />
        ) : (
          <Upload size={13} className="text-slate-600" />
        )}
        <span className="text-[9px] text-slate-500 font-medium leading-none">
          {isText ? "Edit" : "Replace"}
        </span>
      </button>

      <div className="w-px h-7 bg-slate-200 mx-0.5" />

      <button
        onClick={onMore}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        title="More options"
      >
        <SlidersHorizontal size={13} className="text-violet-600" />
        <span className="text-[9px] text-violet-600 font-medium leading-none">More</span>
      </button>
    </div>
  );
}
