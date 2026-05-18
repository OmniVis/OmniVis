"use client";

import { useState, useMemo } from "react";
import { THEMES, ThemeId, THEME_STYLES } from "@/lib/themes";
import {
  loadCustomPalette,
  saveCustomPalette,
  removeCustomPalette,
  applyCustomTheme,
  type CustomPalette,
} from "@/lib/themes";
import { useSlidiStore } from "@/store/slidiStore";
import { Check, Palette, Sparkles, X, RotateCcw } from "lucide-react";

interface ThemeSidebarProps {
  onClose: () => void;
  hideHeader?: boolean;
}

const THEME_IDS = Object.keys(THEMES) as ThemeId[];

const CUSTOM_FIELDS: { key: keyof CustomPalette; label: string }[] = [
  { key: "bg", label: "Background" },
  { key: "text", label: "Text" },
  { key: "accent", label: "Accent" },
  { key: "subtext", label: "Subtext" },
  { key: "divider", label: "Divider" },
];

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

export default function ThemeSidebar({ onClose, hideHeader }: ThemeSidebarProps) {
  const { theme, setTheme } = useSlidiStore();

  // Custom theme editor state
  const [palette, setPalette] = useState<CustomPalette>(loadCustomPalette);
  const [raw, setRaw] = useState<Record<keyof CustomPalette, string>>(() => {
    const p = loadCustomPalette();
    return { bg: p.bg, text: p.text, accent: p.accent, subtext: p.subtext, divider: p.divider, bullet1: p.bullet1, bullet2: p.bullet2 };
  });

  const previewStyle = useMemo(() => ({
    backgroundColor: palette.bg,
    color: palette.text,
    borderTop: `3px solid ${palette.accent}`,
  }), [palette]);

  function updateField(key: keyof CustomPalette, hex: string) {
    setRaw((r) => ({ ...r, [key]: hex }));
    if (isValidHex(hex)) {
      const next = { ...palette, [key]: hex };
      if (key === "accent") { next.bullet1 = hex; next.divider = hex; }
      if (key === "subtext") { next.bullet2 = hex; }
      setPalette(next);
    }
  }

  function handleSaveCustom() {
    saveCustomPalette(palette);
    applyCustomTheme(palette);
    setTheme("custom");
  }

  function handleResetCustom() {
    removeCustomPalette();
    if (theme === "custom") setTheme("minimal");
    // Reset editor to defaults
    const defaultP = loadCustomPalette();
    setPalette(defaultP);
    setRaw({ bg: defaultP.bg, text: defaultP.text, accent: defaultP.accent, subtext: defaultP.subtext, divider: defaultP.divider, bullet1: defaultP.bullet1, bullet2: defaultP.bullet2 });
  }

  return (
    <aside className="w-full flex-1 bg-white flex flex-col border-r border-slate-200/60 shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.8)]">
      {!hideHeader && (
        <div className="px-5 py-4 border-b border-slate-100/80 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <Palette className="w-4 h-4 text-blue-500" />
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.15em]">
              Visual Themes
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

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-2xl p-4 border border-blue-100/40 mb-6 shadow-sm shadow-blue-50/20">
          <div className="flex gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-[0.15em]">Style Intelligence</span>
          </div>
          <p className="text-[11px] text-blue-800/80 leading-relaxed font-medium">
            Themes dictate the AI's aesthetic DNA. Switching will reshape the layout, colors, and typography of your next slides.
          </p>
        </div>

        <div className="grid gap-3">
          {THEME_IDS.map((id) => {
            const t = THEMES[id];
            const isActive = theme === id;
            const isCustom = id === "custom";

            return (
              <div key={id}>
                <button
                  onClick={() => setTheme(id)}
                  className={`group relative flex flex-col p-4 rounded-2xl border transition-all duration-300 w-full ${
                    isActive
                      ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                      : "bg-white border-slate-100 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 w-full">
                    <span className={`text-[11px] font-black uppercase tracking-[0.1em] ${isActive ? "text-white" : "text-slate-900"}`}>
                      {t.label}
                    </span>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center animate-in zoom-in duration-300">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: THEME_STYLES[id].bg }} />
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: THEME_STYLES[id].accent }} />
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: THEME_STYLES[id].text }} />
                  </div>

                  <div className={`mt-3 text-[10px] leading-relaxed transition-colors ${isActive ? "text-slate-400" : "text-slate-400 group-hover:text-slate-600"}`}>
                    {id === 'minimal' && "Clean, Swiss-style editorial layout with generous breathing room."}
                    {id === 'dark' && "Modern dark mode with high contrast and subtle glowing accents."}
                    {id === 'corporate' && "Professional structured layouts with blue-tinted corporate styling."}
                    {id === 'cyberpunk' && "Futuristic neon aesthetics with sharp edges and terminal vibes."}
                    {id === 'modern' && "High-end tech aesthetic with soft mesh gradients and premium typography."}
                    {id === 'sunset' && "Warm, vibrant palette with organic shapes and inviting gradients."}
                    {id === 'forest' && "Nature-inspired calm aesthetic with deep greens and soft organic forms."}
                    {id === 'blueprint' && "Technical engineering style with grid backgrounds and drafting schematics."}
                    {id === 'brutalist' && "Bold, raw, and high-contrast design with thick borders and flat colors."}
                    {id === 'custom' && "Your own color palette — edit below."}
                  </div>
                </button>

                {/* Inline custom editor — expands when Custom is active */}
                {isCustom && isActive && (
                  <div className="mt-2 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div className="p-4 space-y-3">
                      {CUSTOM_FIELDS.map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                            {label}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={palette[key]}
                              onChange={(e) => updateField(key, e.target.value)}
                              className="w-7 h-7 rounded cursor-pointer border border-slate-200 shrink-0"
                            />
                            <input
                              type="text"
                              value={raw[key]}
                              onChange={(e) => updateField(key, e.target.value)}
                              maxLength={7}
                              placeholder="#000000"
                              className={`flex-1 h-7 px-2 text-[11px] font-mono border rounded outline-none ${
                                isValidHex(raw[key])
                                  ? "border-slate-200 focus:border-blue-400 bg-white"
                                  : "border-red-300 focus:border-red-400 bg-white"
                              }`}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Live preview */}
                      <div
                        className="w-full rounded-lg overflow-hidden mt-1"
                        style={previewStyle}
                      >
                        <div className="p-3">
                          <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: palette.accent }}>
                            Preview
                          </div>
                          <div className="text-sm font-black mb-0.5">Slide Title</div>
                          <div className="text-[10px]" style={{ color: palette.subtext }}>Supporting text</div>
                        </div>
                      </div>
                    </div>

                    {/* Save / Reset */}
                    <div className="px-4 pb-4 flex gap-2">
                      <button
                        onClick={handleSaveCustom}
                        className="flex-1 h-8 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleResetCustom}
                        className="w-8 h-8 flex items-center justify-center border border-slate-200 text-slate-400 rounded-lg hover:border-red-200 hover:text-red-500 transition-colors"
                        title="Reset to defaults"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-5 border-t border-slate-50 bg-slate-50/50">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
          Changes apply to next generation
        </p>
      </div>
    </aside>
  );
}
