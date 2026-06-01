"use client";

import { X } from "lucide-react";
import IconPanel from "@/components/panels/IconPanel";
import ImagePanel from "@/components/panels/ImagePanel";
import LinkPanel from "@/components/panels/LinkPanel";
import TextPanel from "@/components/panels/TextPanel";
import type { SelectedElement } from "@/store/slidiStore";

interface PropertiesPanelProps {
  element: SelectedElement;
  error?: string | null;
  onClose: () => void;
  onApplyIcon: (newValue: string) => void;
  onApplyImage: (changes: { src?: string; fit?: "cover" | "contain" | "fill"; alt?: string }) => void;
  onApplyLink: (changes: { href?: string; text?: string; newTab?: boolean }) => void;
  onApplyText: (newText: string) => void;
}

const PANEL_TITLE: Record<string, string> = {
  icon: "Icon",
  image: "Image",
  link: "Link",
  text: "Text",
};

export default function PropertiesPanel({
  element,
  error,
  onClose,
  onApplyIcon,
  onApplyImage,
  onApplyLink,
  onApplyText,
}: PropertiesPanelProps) {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[9998] w-[240px] bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <span className="text-sm font-semibold text-slate-900">
          {PANEL_TITLE[element.elementType] ?? "Element"}
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-100 text-[11px] text-rose-600 font-semibold leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </div>
      )}

      {/* Panel body */}
      <div className="overflow-y-auto max-h-[520px]">
        {element.elementType === "icon" && (
          <IconPanel
            currentValue={element.currentValue}
            onApply={onApplyIcon}
          />
        )}
        {element.elementType === "image" && (
          <ImagePanel
            currentValue={element.currentValue}
            onApply={onApplyImage}
          />
        )}
        {element.elementType === "link" && (
          <LinkPanel
            currentValue={element.currentValue}
            onApply={onApplyLink}
          />
        )}
        {element.elementType === "text" && (
          <TextPanel
            currentValue={element.currentValue}
            onApply={onApplyText}
          />
        )}
      </div>
    </div>
  );
}
