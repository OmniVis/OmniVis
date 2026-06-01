"use client";

import { useState } from "react";
import { useSlidiStore, Provider } from "@/store/slidiStore";
import type { UserContext } from "@/store/slidiStore";
import { Key, X, Info, Eye, EyeOff, ExternalLink, Settings, ShieldCheck, Trash2, Box, Upload, Globe, CheckCircle2, User } from "lucide-react";
import { ADESSO_MODELS, isFreeAdessoModel } from "@/lib/ai";

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = "api" | "general" | "engine" | "profile" | "about";

const PROVIDERS: {
  id: Provider;
  label: string;
  placeholder: string;
  keyUrl: string;
}[] = [
    {
      id: "openai",
      label: "OpenAI",
      placeholder: "sk-...",
      keyUrl: "https://platform.openai.com/api-keys",
    },
    {
      id: "anthropic",
      label: "Anthropic",
      placeholder: "sk-ant-...",
      keyUrl: "https://console.anthropic.com/settings/keys",
    },
    {
      id: "gemini",
      label: "Gemini",
      placeholder: "AIza...",
      keyUrl: "https://aistudio.google.com/app/apikey",
    },
    {
      id: "adesso",
      label: "adesso",
      placeholder: "sk-...",
      keyUrl: "https://portal.ai-hub.3asabc.de/dashboard",
    },
  ];



export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { keys, provider, setApiKey, clearApiKey, adessoModel, setAdessoModel, clearMessages, userContext, setUserContext, engineVersion, setEngineVersion } = useSlidiStore();

  const EngineIcon = (props: any) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );

  const [activeTab, setActiveTab] = useState<SettingsTab>("api");
  const validProvider = PROVIDERS.some((p) => p.id === provider) ? provider : "openai";
  const [selectedProvider, setSelectedProvider] = useState<Provider>(validProvider);

  const [keyInputs, setKeyInputs] = useState<Record<Provider, string>>({
    openai: keys.openai ?? "",
    anthropic: keys.anthropic ?? "",
    gemini: keys.gemini ?? "",
    adesso: keys.adesso ?? "",
  });
  const [localAdessoModel, setLocalAdessoModel] = useState(adessoModel);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Profile tab local state
  const [profileRole, setProfileRole] = useState(userContext?.role ?? "");
  const [profileDepartment, setProfileDepartment] = useState(userContext?.department ?? "");
  const [profileLanguage, setProfileLanguage] = useState(userContext?.language ?? "");
  const [profileInstructions, setProfileInstructions] = useState(userContext?.customInstructions ?? "");
  const [profileSaved, setProfileSaved] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRevealDialog, setShowRevealDialog] = useState(false);

  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider)!;
  const currentInput = keyInputs[selectedProvider];

  const handleProviderSwitch = (id: Provider) => {
    setSelectedProvider(id);
    setShowKey(false);
    setError("");
  };

  const handleInputChange = (value: string) => {
    setKeyInputs((prev) => ({ ...prev, [selectedProvider]: value }));
    setError("");
  };

  const handleSave = () => {
    const trimmed = currentInput.trim();
    if (!trimmed) {
      setError("API key cannot be empty.");
      return;
    }
    setApiKey(trimmed, selectedProvider);
    if (selectedProvider === "adesso") {
      setAdessoModel(localAdessoModel);
    }
    onClose();
  };

  const handleClearKeys = () => {
    if (confirm("Are you sure you want to clear all API keys? This cannot be undone.")) {
      clearApiKey();
      setKeyInputs({ openai: "", anthropic: "", gemini: "", adesso: "" });
      setShowKey(false);
      setError("");
    }
  };

  const handleClearMessages = () => {
    if (confirm("Clear all chat messages? This won't affect the presentation canvas.")) {
      clearMessages();
    }
  };

  const handleRevealConfirm = () => {
    setShowRevealDialog(false);
    setShowKey(true);
  };

  const hasAnySavedKey = Object.values(keys).some(Boolean);

  const TabButton = ({ id, label, icon: Icon }: { id: SettingsTab; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 md:flex-none md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-[0.97] ${activeTab === id
          ? "bg-slate-900 text-white"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center md:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="bg-white w-full max-w-2xl md:h-[580px] max-h-[92vh] flex flex-col md:flex-row shadow-2xl border-2 border-slate-900/20">

          {/* Sidebar — vertical on desktop, horizontal tab bar on mobile */}
          <div className="w-full md:w-56 bg-white border-b md:border-b-0 md:border-r-2 border-slate-900/20 flex flex-row md:flex-col md:p-6">
            {/* Desktop header */}
            <div className="hidden md:flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-slate-900 flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Settings</h2>
            </div>

            {/* Mobile: horizontal pill tabs */}
            <nav className="flex flex-row md:flex-col md:space-y-1.5 flex-1 p-2 md:p-0 gap-1 md:gap-0">
              <TabButton id="api" label="API Keys" icon={Key} />
              <TabButton id="general" label="General" icon={Settings} />
              <TabButton id="engine" label="Engine" icon={EngineIcon} />
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 md:flex-none md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-[0.97] ${activeTab === "profile"
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Profile</span>
                {userContext && (
                  <span className="hidden md:inline ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
              <TabButton id="about" label="About" icon={ShieldCheck} />
            </nav>

            <div className="hidden md:block mt-8 pt-6 border-t border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Slidi Engine <span className="text-blue-500">v1.0.1</span>
              </p>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col bg-[#FDFDFD] min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 border-b border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {activeTab === "api" ? "Bring Your Own Key" : activeTab === "profile" ? "Custom Instructions" : activeTab.toUpperCase()}
              </h3>
              <button
                onClick={onClose}
                disabled={!hasAnySavedKey && activeTab === "api"}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {activeTab === "api" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Provider</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PROVIDERS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleProviderSwitch(p.id)}
                          className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-none border transition-all active:scale-[0.96] ${selectedProvider === p.id
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {currentProvider.label} API Key
                      </label>
                      <a
                        href={currentProvider.keyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider flex items-center gap-1"
                      >
                        Get Key <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="relative group">
                      <input
                        type={showKey ? "text" : "password"}
                        value={currentInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={currentProvider.placeholder}
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 text-[13px] font-mono focus:outline-none focus:border-blue-500/50 focus:bg-white transition-all placeholder:text-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => (showKey ? setShowKey(false) : setShowRevealDialog(true))}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight ml-1">{error}</p>}
                  </div>

                  {selectedProvider === "adesso" && (
                    <div className="space-y-1.5 pt-2 animate-in fade-in duration-300">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Model Configuration</label>
                      <select
                        value={localAdessoModel}
                        onChange={(e) => setLocalAdessoModel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-[13px] font-medium focus:outline-none focus:border-blue-500/50 focus:bg-white transition-all appearance-none"
                      >
                        {ADESSO_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                      {isFreeAdessoModel(localAdessoModel) && (
                        <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-[12px] px-3.5 py-3 animate-in fade-in duration-200">
                          <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                            <span className="font-black">Free model selected.</span> Performance may be degraded and presentations are limited to <span className="font-black">5 slides</span> instead of the usual 10+.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-[14px] p-4 flex gap-3 border border-slate-100">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Keys are stored locally in your browser. They are never transmitted to our servers and are only used for direct AI requests.
                    </p>
                  </div>
                </div>
              )}



              {activeTab === "engine" && (
                <div className="space-y-8 animate-in fade-in duration-150">
                  
                  {/* Current Standard Group */}
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black tracking-widest text-slate-400 uppercase ml-1">Current Standard</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => setEngineVersion("v4")}
                        className={`text-left p-5 border rounded-2xl transition-all relative overflow-hidden flex items-start gap-4 ${
                          engineVersion === "v4" 
                          ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-500/50 shadow-[0_8px_30px_-12px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/20" 
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
                        }`}
                      >
                        <div className={`mt-0.5 shrink-0 transition-colors ${engineVersion === "v4" ? "text-blue-600" : "text-slate-300"}`}>
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="text-[15px] font-bold text-slate-900 tracking-tight">v4 – Executive & Hyper-Modern</span>
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider shadow-sm">Recommended</span>
                          </div>
                          <p className="text-[12px] text-slate-600 leading-relaxed max-w-xl">
                            The ultimate engine for high-stakes presentations. Combines top-tier consulting logic (McKinsey/BCG) with ultra-modern Apple-style Bento Grids. The AI enforces strict "one-message-per-slide" clarity, while using 60fps cinematic micro-animations to guide audience focus.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Alternative Modern Engines */}
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black tracking-widest text-slate-400 uppercase ml-1">Alternative Modes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        onClick={() => setEngineVersion("v3")}
                        className={`text-left p-4 border rounded-xl transition-all flex items-start gap-3 ${
                          engineVersion === "v3" 
                          ? "bg-slate-50 border-slate-400 shadow-sm ring-1 ring-slate-400/20" 
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5"
                        }`}
                      >
                        <div className={`mt-0.5 shrink-0 ${engineVersion === "v3" ? "text-slate-700" : "text-slate-300"}`}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-bold text-slate-900">v3 – Perfect Scale</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            The "bulletproof" engine. Renders on an absolute 1920x1080 canvas that perfectly scales up or down to fit any screen without ever shifting typography or breaking layouts. Best for complex charts.
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => setEngineVersion("v2")}
                        className={`text-left p-4 border rounded-xl transition-all flex items-start gap-3 ${
                          engineVersion === "v2" 
                          ? "bg-slate-50 border-slate-400 shadow-sm ring-1 ring-slate-400/20" 
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5"
                        }`}
                      >
                        <div className={`mt-0.5 shrink-0 ${engineVersion === "v2" ? "text-slate-700" : "text-slate-300"}`}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-bold text-slate-900">v2 – Fluid Container</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            The highly dynamic, fluid layout engine. Features aggressive 3D mouse parallax and playful spring physics. Content flows natively to fill available space.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Legacy Support */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h3 className="text-[11px] font-black tracking-widest text-slate-300 uppercase ml-1">Legacy Support</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70 hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={() => setEngineVersion("v1")}
                        className={`text-left p-3 border rounded-lg transition-all flex items-start gap-3 ${
                          engineVersion === "v1" 
                          ? "bg-slate-100 border-slate-300" 
                          : "bg-white border-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div className={`mt-0.5 shrink-0 ${engineVersion === "v1" ? "text-slate-500" : "text-slate-200"}`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px] font-bold text-slate-700">v1 – Classic</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            Clean, lightweight, and fast. Disables heavy 3D rendering and complex animations for maximum battery life and compatibility on older hardware.
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => setEngineVersion("v0")}
                        className={`text-left p-3 border rounded-lg transition-all flex items-start gap-3 ${
                          engineVersion === "v0" 
                          ? "bg-slate-100 border-slate-300" 
                          : "bg-white border-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div className={`mt-0.5 shrink-0 ${engineVersion === "v0" ? "text-slate-500" : "text-slate-200"}`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px] font-bold text-slate-700">v0 – Legacy</span>
                            <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-wider">Older</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            The original May 2026 engine. Highly rigid HTML/CSS structures. Retained exclusively to ensure exact backwards compatibility with older saved decks.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === "general" && (
                <div className="space-y-8 animate-in fade-in duration-150">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Data Management</h4>
                    <div className="space-y-3">
                      <button
                        onClick={handleClearMessages}
                        className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-none hover:border-slate-300 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                          <div className="text-left">
                            <p className="text-[11px] font-bold text-slate-900 uppercase">Clear Chat Messages</p>
                            <p className="text-[10px] text-slate-400">Removes history from the assistant panel</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={handleClearKeys}
                        className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-none hover:border-red-100 hover:bg-red-50/30 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Key className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                          <div className="text-left">
                            <p className="text-[11px] font-bold text-slate-900 group-hover:text-red-600 transition-colors uppercase">Reset All API Keys</p>
                            <p className="text-[10px] text-slate-400">Irreversibly removes all local credentials</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "profile" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-slate-50 rounded-none p-4 flex gap-3 border border-slate-100">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      The AI will apply these instructions to every presentation it generates. Leave fields blank to let the AI decide.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Role</label>
                        <input
                          type="text"
                          value={profileRole}
                          onChange={(e) => setProfileRole(e.target.value)}
                          placeholder="e.g. Sales Manager"
                          className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 text-[13px] focus:outline-none focus:border-blue-500/50 focus:bg-white transition-all placeholder:text-slate-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</label>
                        <input
                          type="text"
                          value={profileDepartment}
                          onChange={(e) => setProfileDepartment(e.target.value)}
                          placeholder="e.g. Cloud & Digital"
                          className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 text-[13px] focus:outline-none focus:border-blue-500/50 focus:bg-white transition-all placeholder:text-slate-300"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Output Language</label>
                      <input
                        type="text"
                        value={profileLanguage}
                        onChange={(e) => setProfileLanguage(e.target.value)}
                        placeholder="e.g. German — leave blank for English"
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 text-[13px] focus:outline-none focus:border-blue-500/50 focus:bg-white transition-all placeholder:text-slate-300"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Custom Instructions</label>
                        <span className="text-[9px] text-slate-400">{profileInstructions.length}/500</span>
                      </div>
                      <textarea
                        value={profileInstructions}
                        onChange={(e) => setProfileInstructions(e.target.value.slice(0, 500))}
                        placeholder="e.g. Always end with a CTA slide. Avoid acronyms unless spelled out first."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 text-[13px] focus:outline-none focus:border-blue-500/50 focus:bg-white transition-all placeholder:text-slate-300 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        const ctx: UserContext = {
                          role: profileRole.trim(),
                          department: profileDepartment.trim(),
                          language: profileLanguage.trim(),
                          customInstructions: profileInstructions.trim(),
                        };
                        setUserContext(ctx);
                        setProfileSaved(true);
                        setTimeout(() => setProfileSaved(false), 2000);
                      }}
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.97] text-white text-[11px] font-bold uppercase tracking-widest rounded-none transition-all"
                    >
                      {profileSaved ? "Saved ✓" : "Save"}
                    </button>
                    {userContext && (
                      <button
                        onClick={() => {
                          setUserContext(null);
                          setProfileRole("");
                          setProfileDepartment("");
                          setProfileLanguage("");
                          setProfileInstructions("");
                        }}
                        className="px-5 py-2.5 border border-slate-200 hover:border-red-200 hover:bg-red-50/30 text-slate-500 hover:text-red-600 text-[11px] font-bold uppercase tracking-widest rounded-none transition-all"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {userContext && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Context active — applied to all generations
                    </div>
                  )}
                </div>
              )}

              {activeTab === "about" && (
                <div className="space-y-6 animate-in fade-in duration-150 text-center py-4">
                  <div className="inline-flex w-16 h-16 bg-blue-50 rounded-none items-center justify-center mb-2 border border-blue-100 shadow-sm overflow-hidden p-3.5">
                    <img 
                      src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/branding/Brand_Icon.svg`}
                      alt="Slidi Icon"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900">Slidi Presentation Engine</h4>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">BUILD WITH ❤️ BY BATU EROL</p>
                  </div>
                  <div className="max-w-xs mx-auto text-xs text-slate-500 leading-relaxed">
                    A private-by-default AI presentation tool. By bringing your own API keys, you maintain full control over your data and costs.
                  </div>
                  <div className="pt-4 flex justify-center gap-4">
                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase">React 19</div>
                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase">Tailwind v4</div>
                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase">Next.js 16</div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 md:px-8 py-4 md:py-5 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.97] text-white text-[11px] font-bold uppercase tracking-widest rounded-none transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security reveal dialog */}
      {showRevealDialog && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl border border-amber-100/50">
            <div className="px-8 py-6 border-b border-amber-50 flex items-center gap-4 bg-amber-50/30">
              <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Security Check</h3>
            </div>
            <div className="p-8">
              <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                Revealing your API key can be dangerous. Ensure you are not sharing your screen or in a public space.
              </p>
            </div>
            <div className="px-8 py-5 border-t border-slate-50 flex justify-end gap-3 bg-slate-50/50">
              <button
                onClick={() => setShowRevealDialog(false)}
                className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
              >
                Aborted
              </button>
              <button
                onClick={handleRevealConfirm}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-100"
              >
                Reveal Key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


