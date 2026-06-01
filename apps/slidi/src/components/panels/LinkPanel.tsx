"use client";

import { useState } from "react";
import { ExternalLink, Link } from "lucide-react";
import { sanitizeUrl } from "@/lib/sanitizeUrl";

interface LinkPanelProps {
  currentValue: string;
  currentText?: string;
  onApply: (changes: { href?: string; text?: string; newTab?: boolean }) => void;
}

export default function LinkPanel({ currentValue, currentText = "", onApply }: LinkPanelProps) {
  const [href, setHref] = useState(currentValue);
  const [text, setText] = useState(currentText);
  const [newTab, setNewTab] = useState(false);
  const [hrefError, setHrefError] = useState<string | undefined>();

  function handleHrefChange(val: string) {
    setHref(val);
    setHrefError(undefined);
    if (val.trim()) {
      const r = sanitizeUrl(val.trim(), "link");
      if (!r.valid) setHrefError(r.warning);
    }
  }

  function handleApply() {
    if (href.trim()) {
      const r = sanitizeUrl(href.trim(), "link");
      if (!r.valid) { setHrefError(r.warning); return; }
    }
    onApply({ href: href.trim() || undefined, text: text.trim() || undefined, newTab });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
        <Link size={13} className="text-violet-600 shrink-0" />
        <span className="text-xs text-slate-500 truncate">{currentValue || "No link"}</span>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">URL</p>
        <input
          type="url"
          value={href}
          onChange={(e) => handleHrefChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400"
        />
        {hrefError && <p className="text-[10px] text-red-500 mt-1">{hrefError}</p>}
        {!hrefError && (
          <p className="text-[10px] text-slate-400 mt-1">https://, http://, or mailto: only</p>
        )}
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Link text</p>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Link label..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-violet-400"
        />
      </div>

      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-2">
          <ExternalLink size={13} className="text-slate-500" />
          <span className="text-sm text-slate-600">Open in new tab</span>
        </div>
        <button
          onClick={() => setNewTab(!newTab)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            newTab ? "bg-violet-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              newTab ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <button
        onClick={handleApply}
        disabled={!!hrefError}
        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2 transition-colors"
      >
        Apply
      </button>
    </div>
  );
}
