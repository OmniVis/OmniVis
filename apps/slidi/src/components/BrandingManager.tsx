"use client";

import React, { useState, useEffect } from "react";
import { useSlidiStore } from "@/store/slidiStore";
import { useDebounce } from "@/hooks/useDebounce";
import { Upload, X } from "lucide-react";
import { putAsset } from "@/lib/idb";
import { useLogoUrl } from "@/hooks/useLogoUrl";

interface BrandingManagerProps {
  onClose: () => void;
  hideHeader?: boolean;
}

export default function BrandingManager({ onClose, hideHeader }: BrandingManagerProps) {
  const { branding, setBranding } = useSlidiStore();
  
  const [name, setName] = useState(branding?.name || "");
  const [logoUrl, setLogoUrl] = useState(branding?.logoUrl || "");
  const [display, setDisplay] = useState<"both" | "logo" | "name" | "none">(branding?.display ?? "both");
  const [position, setPosition] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">(branding?.position ?? "top-right");
  const [type] = useState<"pill" | "image">("pill");
  const [size] = useState<"small" | "medium" | "large">(branding?.size ?? "medium");
  const [sizePercentage, setSizePercentage] = useState<number>(branding?.sizePercentage ?? 100);
  const [padding, setPadding] = useState<number>(branding?.padding ?? 24);
  
  const resolvedLogoUrl = useLogoUrl(logoUrl) ?? logoUrl;
  const [msg, setMsg] = useState("");

  // One-time migration: if existing branding stores a base64 logo, move it to IDB
  useEffect(() => {
    const existingLogoUrl = branding?.logoUrl;
    if (existingLogoUrl?.startsWith("data:")) {
      const id = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
      putAsset(id, existingLogoUrl).then(() => {
        const idbRef = `idb://${id}`;
        setLogoUrl(idbRef);
        setBranding({ ...branding!, logoUrl: idbRef });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const id = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
      await putAsset(id, dataUrl);
      setLogoUrl(`idb://${id}`);
    };
    reader.readAsDataURL(file);
  };

  const debouncedName = useDebounce(name, 200);

  const buildBranding = () => ({ name, logoUrl, display, position, type, size, sizePercentage, padding });

  // Real-time sync for discrete property changes (no debounce needed)
  useEffect(() => {
    setBranding(buildBranding());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, logoUrl, display, position, type, size]);

  const syncSliders = () => {
    setBranding(buildBranding());
  };

  const handleClear = () => {
    setBranding(null);
    setMsg("Branding removed.");
    setTimeout(() => setMsg(""), 3000);
  };

  const DISPLAY_OPTIONS: { value: "both" | "logo" | "name" | "none"; label: string; desc: string }[] = [
    { value: "both", label: "Logo + Name", desc: "Show both" },
    { value: "logo", label: "Logo only", desc: "Icon only" },
    { value: "name", label: "Name only", desc: "Text only" },
    { value: "none", label: "Hidden", desc: "Off" },
  ];

  const POSITION_OPTIONS: { value: "top-left" | "top-right" | "bottom-left" | "bottom-right"; label: string }[] = [
    { value: "top-left", label: "Top Left" },
    { value: "top-right", label: "Top Right" },
    { value: "bottom-left", label: "Bottom Left" },
    { value: "bottom-right", label: "Bottom Right" },
  ];

  const showLogo = logoUrl && (display === "both" || display === "logo");
  const showName = name && (display === "both" || display === "name") && type === "pill";

  return (
    <aside className="w-full flex-1 bg-white flex flex-col border-r border-slate-200/60 shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.8)]">
      {!hideHeader && (
        <div className="px-5 py-4 border-b border-slate-100/80 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <img 
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/branding/Brand_Icon.svg`}
              alt="Slidi Icon"
              className="w-4 h-4 object-contain -translate-y-[0.5px]"
            />
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.15em]">
              Branding
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all"
            title="Close Sidebar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 space-y-7">
        <div className="space-y-5">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
             <p className="text-[10px] text-slate-500 leading-relaxed italic">
                For best results, upload a .png file with a transparent background. Ensure your logo contrasts with your presentation theme.
             </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Company Name</label>
              <input
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Company Logo</label>
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white p-1 shrink-0 overflow-hidden flex items-center justify-center">
                    <img src={resolvedLogoUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <label className="flex-1 cursor-pointer group">
                  <div className="w-full bg-slate-50 border border-slate-200 border-dashed rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-all flex items-center justify-center gap-2">
                    <Upload className="w-3 h-3" /> {logoUrl ? "Change Logo" : "Upload Logo"}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
          </div>


          {(type === "image" || type === "pill") && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-blue-600">Scale</label>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{sizePercentage}%</span>
                </div>
                <div className="relative flex items-center px-1">
                  <input
                    type="range"
                    min="25"
                    max="150"
                    step="5"
                    value={sizePercentage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSizePercentage(parseInt(e.target.value, 10))}
                    onMouseUp={syncSliders}
                    onTouchEnd={syncSliders}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
                    style={{
                      background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(sizePercentage - 25) / 1.25}%, #f1f5f9 ${(sizePercentage - 25) / 1.25}%, #f1f5f9 100%)`
                    }}
                  />
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-[8px] font-bold text-slate-300 uppercase">25%</span>
                  <span className="text-[8px] font-bold text-slate-300 uppercase">150%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-blue-600">Edge Padding</label>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{padding}px</span>
                </div>
                <div className="relative flex items-center px-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="4"
                    value={padding}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPadding(parseInt(e.target.value, 10))}
                    onMouseUp={syncSliders}
                    onTouchEnd={syncSliders}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
                    style={{
                      background: `linear-gradient(to right, #2563eb 0%, #2563eb ${padding}%, #f1f5f9 ${padding}%, #f1f5f9 100%)`
                    }}
                  />
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-[8px] font-bold text-slate-300 uppercase">Flush</span>
                  <span className="text-[8px] font-bold text-slate-300 uppercase">100px</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Position</label>
            <div className="grid grid-cols-2 gap-2">
              {POSITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPosition(opt.value)}
                  className={`py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${position === opt.value
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {type === "pill" && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Badge Display</label>
              <div className="grid grid-cols-2 gap-2">
                {DISPLAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDisplay(opt.value)}
                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl border text-center transition-all ${display === opt.value
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(showLogo || showName) && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preview</span>
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm ml-2">
                {showLogo && (
                  <img
                    src={resolvedLogoUrl}
                    alt=""
                    className="w-auto object-contain"
                    style={{ height: type === 'image' ? (size === 'small' ? '24px' : size === 'medium' ? '40px' : '60px') : '16px' }}
                  />
                )}
                {showName && <span className="text-[9px] font-black tracking-wider text-slate-800">{name}</span>}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={handleClear} className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all">
              Clear Branding
            </button>
          </div>
          {msg && <p className="text-[10px] text-blue-600 font-bold uppercase text-center">{msg}</p>}
        </div>
      </div>
    </aside>
  );
}
