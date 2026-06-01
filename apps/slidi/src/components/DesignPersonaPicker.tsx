"use client";

import { DESIGN_PERSONAS, getPersonaById } from "@/lib/designPersonas";
import { useSlidiStore } from "@/store/slidiStore";
import { X } from "lucide-react";

interface DesignPersonaPickerProps {
  onClose: () => void;
  position: { right: number; bottom: number };
}

export function DesignPersonaPicker({ onClose, position }: DesignPersonaPickerProps) {
  const activePersona = useSlidiStore((s) => s.activePersona);
  const setActivePersona = useSlidiStore((s) => s.setActivePersona);

  const handleSelect = (id: string) => {
    if (activePersona === id) {
      setActivePersona(null);
    } else {
      setActivePersona(id);
    }
  };

  return (
    <div
      style={{ position: "fixed", right: position.right, bottom: position.bottom }}
      className="w-[340px] bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-[500] animate-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Design Persona</span>
          {activePersona && (
            <button
              onClick={() => setActivePersona(null)}
              className="ml-2 text-[9px] font-bold text-red-400 hover:text-red-600 uppercase tracking-wider transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {DESIGN_PERSONAS.map((persona) => {
          const isActive = activePersona === persona.id;
          return (
            <button
              key={persona.id}
              onClick={() => handleSelect(persona.id)}
              className={`relative flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-left transition-all duration-200 ${
                isActive
                  ? "border-blue-400 bg-blue-50 shadow-sm"
                  : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              {/* Colour swatch */}
              <div
                className={`w-full h-6 rounded-lg ${persona.previewClasses} flex items-center justify-center overflow-hidden`}
                style={persona.id === "adesso" ? { background: "#006ab3" } : undefined}
              >
                {persona.id === "adesso" && (
                  <svg width="16" height="20" viewBox="0 0 6 44" style={{ opacity: 0.8 }}>
                    <path d="M6 0 L0 22 L6 44" fill="none" stroke="white" strokeWidth="2.5" />
                  </svg>
                )}
                {persona.id === "neo-brutalist" && (
                  <div className="w-full h-full bg-yellow-300 border-2 border-black" style={{ boxShadow: "2px 2px 0 #000" }} />
                )}
              </div>

              {/* Label */}
              <div className="w-full">
                <p className={`text-[11px] font-black leading-tight ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                  {persona.label}
                </p>
                <p className="text-[9px] text-slate-400 font-medium leading-snug mt-0.5 line-clamp-2">
                  {persona.description}
                </p>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{ background: persona.accentHex }}
                />
              )}
            </button>
          );
        })}
      </div>

      {activePersona && (
        <div className="mt-2.5 px-1">
          <p className="text-[9px] text-slate-400 font-medium leading-snug">
            Active: <span className="font-bold text-slate-600">{getPersonaById(activePersona)?.label}</span>
            {" "}— will be applied to next generation.
          </p>
        </div>
      )}
    </div>
  );
}
