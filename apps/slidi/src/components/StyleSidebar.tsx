"use client";

import { useState } from "react";
import ThemeSidebar from "./ThemeSidebar";
import BrandingManager from "./BrandingManager";
import { Palette, Box, X } from "lucide-react";

interface StyleSidebarProps {
  onClose: () => void;
  initialTab?: "themes" | "branding";
}

export default function StyleSidebar({ onClose, initialTab = "themes" }: StyleSidebarProps) {
  const [activeTab, setActiveTab] = useState<"themes" | "branding">(initialTab);

  return (
    <aside className="w-full flex-1 bg-white flex flex-col border-r border-slate-200/60 shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.8)]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100/80 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("themes")}
            className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
              activeTab === "themes" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Palette className="w-4 h-4" /> Themes
          </button>
          <button
            onClick={() => setActiveTab("branding")}
            className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
              activeTab === "branding" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Box className="w-4 h-4" /> Branding
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all"
          title="Close Sidebar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
         {/* We wrap the child sidebars and hide their built-in headers by rendering them without the header visually, or we just render them and let them have double headers.
             Actually, a better way is to refactor ThemeSidebar and BrandingManager to NOT have the <aside> wrapper and header if used inside StyleSidebar. 
             But since we want to keep it simple, let's just let them render. However, I can pass a `hideHeader` prop. 
             Wait, I didn't add a hideHeader prop yet. Let's just render the content. 
         */}
         <div className={`absolute inset-0 overflow-y-auto ${activeTab === "themes" ? "block" : "hidden"}`}>
            <ThemeSidebar onClose={onClose} hideHeader />
         </div>
         <div className={`absolute inset-0 overflow-y-auto ${activeTab === "branding" ? "block" : "hidden"}`}>
            <BrandingManager onClose={onClose} hideHeader />
         </div>
      </div>
    </aside>
  );
}
