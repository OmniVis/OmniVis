"use client";

import { useState } from "react";

interface TextPanelProps {
  currentValue: string;
  onApply: (newText: string) => void;
}

export default function TextPanel({ currentValue, onApply }: TextPanelProps) {
  const [text, setText] = useState(currentValue);

  return (
    <div className="p-4 space-y-3">
      <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-widest">
        Content
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 resize-none focus:outline-none focus:border-violet-400 transition-colors"
      />
      <button
        onClick={() => onApply(text)}
        disabled={text === currentValue || !text.trim()}
        className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
      >
        Apply
      </button>
    </div>
  );
}
