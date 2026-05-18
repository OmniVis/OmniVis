"use client";

import { useState } from "react";
import { X, Copy, Check, KeyRound, RefreshCw, LogIn } from "lucide-react";
import { getUserId, setUserId, resetUserId } from "@/lib/userId";

interface IdentityModalProps {
  onClose: () => void;
  onIdentityChange: () => void;
}

export default function IdentityModal({ onClose, onIdentityChange }: IdentityModalProps) {
  const [currentId, setCurrentId] = useState(() => getUserId());
  const [inputKey, setInputKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(currentId);
      } else {
        const el = document.createElement("textarea");
        el.value = currentId;
        el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
    } catch {
      // ignore clipboard errors — still show feedback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignIn = () => {
    setError("");
    const ok = setUserId(inputKey);
    if (!ok) {
      setError("Not a valid identity key. Keys look like: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx");
      return;
    }
    setCurrentId(inputKey.trim());
    setInputKey("");
    onIdentityChange();
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    const newId = resetUserId();
    setCurrentId(newId);
    setConfirmReset(false);
    onIdentityChange();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-[32px] shadow-2xl max-w-sm w-full p-8 flex flex-col gap-6 animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Cloud Identity</h2>
              <p className="text-[10px] text-slate-400 font-medium">Your cross-device access key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current key */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
            Your identity key
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-slate-700 break-all leading-relaxed">
              {currentId}
            </code>
            <button
              onClick={handleCopy}
              title="Copy key"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                : <Copy className="w-3.5 h-3.5 text-slate-400" />
              }
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
            Copy this key to access your cloud presentations from another browser or device.
          </p>
        </div>

        {/* Sign in with different key */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
            Sign in with a different key
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => { setInputKey(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              placeholder="Paste your identity key…"
              className="flex-1 text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-300 transition-all"
            />
            <button
              onClick={handleSignIn}
              disabled={!inputKey.trim()}
              className="shrink-0 h-9 px-3 flex items-center gap-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <LogIn className="w-3 h-3" />
              Apply
            </button>
          </div>
          {error && (
            <p className="text-[10px] text-red-500 leading-relaxed">{error}</p>
          )}
        </div>

        {/* Reset */}
        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={handleReset}
            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              confirmReset ? "text-red-500 hover:text-red-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            {confirmReset ? "Click again to confirm — this will hide your existing cloud presentations" : "Generate a new identity key"}
          </button>
        </div>
      </div>
    </div>
  );
}
