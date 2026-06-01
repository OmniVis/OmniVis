"use client";

import { useState } from "react";
import { sanitizeUrl } from "@/lib/sanitizeUrl";

type Fit = "cover" | "contain" | "fill";

interface ImagePanelProps {
  currentValue: string;
  onApply: (changes: { src?: string; fit?: Fit; alt?: string }) => void;
}

export default function ImagePanel({ currentValue, onApply }: ImagePanelProps) {
  const [src, setSrc] = useState(currentValue);
  const [fit, setFit] = useState<Fit>("cover");
  const [alt, setAlt] = useState("");
  const [srcError, setSrcError] = useState<string | undefined>();
  const [srcWarning, setSrcWarning] = useState<string | undefined>();

  function handleSrcChange(val: string) {
    setSrc(val);
    setSrcError(undefined);
    setSrcWarning(undefined);
    if (val.trim()) {
      const r = sanitizeUrl(val.trim(), "image");
      if (!r.valid) setSrcError(r.warning);
      else if (r.warning) setSrcWarning(r.warning);
    }
  }

  function handleApply() {
    if (src.trim()) {
      const r = sanitizeUrl(src.trim(), "image");
      if (!r.valid) { setSrcError(r.warning); return; }
    }
    onApply({ src: src.trim() || undefined, fit, alt: alt.trim() || undefined });
  }

  const FIT_OPTIONS: Fit[] = ["cover", "contain", "fill"];

  return (
    <div className="flex flex-col gap-4 p-4">
      {currentValue && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden h-20 flex items-center justify-center">
          <img
            src={currentValue}
            alt="current"
            className="max-h-full max-w-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Image URL</p>
        <input
          type="url"
          value={src}
          onChange={(e) => handleSrcChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400"
        />
        {srcError && <p className="text-[10px] text-red-500 mt-1">{srcError}</p>}
        {srcWarning && !srcError && <p className="text-[10px] text-amber-500 mt-1">{srcWarning}</p>}
        {!srcError && !srcWarning && (
          <p className="text-[10px] text-slate-400 mt-1">https:// only · No scripts or data URIs</p>
        )}
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Fit</p>
        <div className="flex gap-2">
          {FIT_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFit(f)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer capitalize ${
                fit === f
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Alt text</p>
        <input
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-violet-400"
        />
      </div>

      <button
        onClick={handleApply}
        disabled={!!srcError}
        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2 transition-colors"
      >
        Apply
      </button>
    </div>
  );
}
