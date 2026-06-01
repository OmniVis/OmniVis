"use client";

import { useState, useRef } from "react";
import { useSlidiStore } from "@/store/slidiStore";
import { DESIGN_BRIEF_TEMPLATES } from "@/lib/designBriefTemplates";
import { X, Download, Upload, ChevronDown } from "lucide-react";

const MAX_CHARS = 2000;

interface DesignBriefEditorProps {
  onClose: () => void;
  position: { right: number; bottom: number };
}

export function DesignBriefEditor({ onClose, position }: DesignBriefEditorProps) {
  const designBrief = useSlidiStore((s) => s.designBrief);
  const setDesignBrief = useSlidiStore((s) => s.setDesignBrief);

  const [draft, setDraft] = useState(designBrief ?? "");
  const [showTemplates, setShowTemplates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = draft.length;
  const isOverLimit = charCount > MAX_CHARS;
  const hasContent = draft.trim().length > 0;
  const isActive = designBrief && designBrief.trim().length > 0;

  const handleSave = () => {
    setDesignBrief(hasContent ? draft : null);
    onClose();
  };

  const handleClear = () => {
    setDraft("");
    setDesignBrief(null);
  };

  const handleLoadTemplate = (content: string) => {
    setDraft(content);
    setShowTemplates(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) setDraft(text.slice(0, MAX_CHARS * 2));
    };
    reader.readAsText(file, "utf-8");
    // Reset so same file can be re-uploaded
    e.target.value = "";
  };

  const handleDownload = () => {
    if (!draft.trim()) return;
    const blob = new Blob([draft], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{ position: "fixed", right: position.right, bottom: position.bottom }}
      className="w-[380px] bg-white border border-slate-200 rounded-2xl shadow-xl z-[500] animate-in slide-in-from-bottom-2 duration-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Design Brief</span>
          {isActive && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
              Active
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50/50">
        {/* Template selector */}
        <div className="relative">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:bg-white border border-slate-200 transition-all"
          >
            Templates
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {showTemplates && (
            <div className="absolute top-full mt-1 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-[600] animate-in slide-in-from-top-1 duration-150 max-h-[220px] overflow-y-auto">
              {DESIGN_BRIEF_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleLoadTemplate(tpl.content)}
                  className="w-full flex flex-col items-start px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="text-[10px] font-bold text-slate-800 leading-tight">{tpl.label}</span>
                  <span className="text-[9px] text-slate-400 font-medium leading-tight">{tpl.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:bg-white border border-slate-200 transition-all"
          title="Upload a .md file"
        >
          <Upload className="w-2.5 h-2.5" />
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={!hasContent}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:bg-white border border-slate-200 transition-all disabled:opacity-30"
          title="Download as design.md"
        >
          <Download className="w-2.5 h-2.5" />
          .md
        </button>

        <div className="flex-1" />

        {/* Character count */}
        <span className={`text-[9px] font-bold tabular-nums ${isOverLimit ? "text-red-500" : "text-slate-400"}`}>
          {charCount}/{MAX_CHARS}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`# My Design Brief\n\n## Typography\n- Headlines: font-black, very large\n\n## Colours\n- Primary: #006ab3\n\n## Layout Rules\n- Always two-column for data slides\n\n## Forbidden\n- No organic blob shapes`}
        className="w-full px-4 py-3 font-mono text-[11px] text-slate-700 placeholder-slate-300 resize-none outline-none leading-relaxed bg-white"
        rows={12}
        spellCheck={false}
      />

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={handleClear}
          disabled={!hasContent && !isActive}
          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-30"
        >
          Clear
        </button>
        <div className="flex gap-1.5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isOverLimit}
            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-blue-600 transition-all disabled:opacity-40"
          >
            {hasContent ? "Save Brief" : "Clear & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
