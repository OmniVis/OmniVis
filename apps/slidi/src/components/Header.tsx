"use client";

import { Code2, Paintbrush, Presentation, Settings2, Share2, Undo2, Redo2, Palette, History, LogOut, Trash2, Download, KeyRound, User, ChevronDown, Check, Loader2, LayoutGrid, Activity, CircleDollarSign, Save, UserPlus, MoreHorizontal, Plus, HelpCircle, Sparkles } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSlidiStore } from "@/store/slidiStore";
import { THEMES, ThemeId } from "@/lib/themes";
import { getUserId } from "@/lib/userId";
import IdentityModal from "@/components/IdentityModal";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface HeaderProps {
  activeView: "preview" | "code";
  onViewChange: (view: "preview" | "code") => void;
  onPublish: () => void;
  publishPending?: boolean;
  onSettings: () => void;
  onToggleStyles: () => void;
  showStyleSidebar: boolean;
  onNewPresentation: () => void;
  showGallery: boolean;
  onToggleGallery: () => void;
  onDownload: () => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  presentationName: string;
  onRenamePresentation: (name: string) => void;
  onSave: () => Promise<void>;
  onOpenAuth?: (screen: "entry" | "login-key") => void;
}

const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export default function Header({
  activeView,
  onViewChange,
  onPublish,
  publishPending = false,
  onSettings,
  onToggleStyles,
  showStyleSidebar,
  onNewPresentation,
  showGallery,
  onToggleGallery,
  onDownload,
  showHistory,
  onToggleHistory,
  presentationName,
  onRenamePresentation,
  onSave,
  onOpenAuth,
}: HeaderProps) {
  const { theme, setTheme, undo, redo, historyIndex, history, generatedCode, inspectMode, setInspectMode, currentVersionId, authMode, userProfile, setUserProfile, logout } = useSlidiStore();
  const currentSessionId = useSlidiStore((s) => s.currentSessionId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Overflow menu state
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showOverflow) return;
    function handleClick(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showOverflow]);

  // Profile dropdown state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showProfileMenu) return;
    function handleClick(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
        setConfirmDeleteAccount(false);
        setEditingUsername(false);
        setUsernameError("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showProfileMenu]);

  async function handleSaveUsername() {
    const trimmed = usernameDraft.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setUsernameError("Username must be 2–30 characters");
      return;
    }
    setUsernameError("");
    setIsSavingUsername(true);
    try {
      const res = await fetch(`${BASE}/api/user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: getUserId(), username: trimmed }),
      });
      if (res.ok) {
        setUserProfile({ username: trimmed });
        localStorage.setItem("slidi_username", trimmed);
        setEditingUsername(false);
      } else {
        const data = await res.json() as { error?: string };
        setUsernameError(data.error ?? "Failed to update username");
      }
    } catch {
      setUsernameError("Network error — please try again");
    } finally {
      setIsSavingUsername(false);
    }
  }

  async function handleDownloadData() {
    const userId = getUserId();
    const res = await fetch(`${BASE}/api/user/export?user_id=${userId}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slidi-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
    setShowProfileMenu(false);
  }

  async function handleDeleteAccount() {
    if (!confirmDeleteAccount) {
      setConfirmDeleteAccount(true);
      return;
    }
    setIsDeletingAccount(true);
    try {
      const res = await fetch(`${BASE}/api/user`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: getUserId() }),
      });
      if (res.ok) {
        setShowProfileMenu(false);
        logout();
      }
    } catch {
      // silent
    } finally {
      setIsDeletingAccount(false);
      setConfirmDeleteAccount(false);
    }
  }

  function handleLogout() {
    setShowProfileMenu(false);
    logout();
  }

  function startEdit() {
    setDraft(presentationName);
    setEditing(true);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed) onRenamePresentation(trimmed);
    setEditing(false);
  }

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const canUndo = mounted && historyIndex > 0;
  const canRedo = mounted && historyIndex < history.length - 1;

  const handleSave = useCallback(async () => {
    if (saveState !== "idle") return;
    setSaveState("saving");
    try {
      await onSave();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
  }, [onSave, saveState]);

  // Whether the current presentation is not yet in the local library
  const isUnsavedLocally = mounted && !!generatedCode && !currentSessionId;

  return (
    <>
    <header className="h-12 md:h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-40 gap-2">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        {pathname === "/" ? (
          <div className="flex items-center gap-2 shrink-0 cursor-default">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/branding/Combination_Mark.svg`}
              alt="Slidi logo"
              className="h-6 md:h-8 w-auto object-contain"
            />
          </div>
        ) : (
          <Link href="/" replace className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/branding/Combination_Mark.svg`}
              alt="Slidi logo"
              className="h-6 md:h-8 w-auto object-contain -translate-y-[1px]"
            />
          </Link>
        )}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="hidden lg:block text-[11px] font-semibold text-slate-700 bg-slate-50 border border-blue-300 rounded px-2 py-0.5 outline-none w-40 max-w-[180px]"
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to rename"
            className={`hidden lg:block text-[11px] font-bold px-2 py-0.5 rounded hover:bg-slate-50 active:scale-[0.98] transition-all max-w-[180px] truncate text-left ${
              (mounted ? presentationName : "") ? "text-slate-600" : "text-slate-400"
            }`}
          >
            {mounted ? (presentationName || "Untitled") : "Untitled"}
          </button>
        )}
      </div>


      {/* Centre controls */}
      <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0 justify-center">
        {/* Undo / Redo — hidden on mobile */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            className="p-1 md:p-1.5 text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
            className="p-1 md:p-1.5 text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-50 p-0.5 rounded-sm border border-slate-200/60">
          <button
            onClick={onToggleStyles}
            data-tour="styles-toggle"
            className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${
              showStyleSidebar
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Palette className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="hidden lg:inline">Styles</span>
          </button>
          <div className="w-[1px] h-3 bg-slate-200 mx-0.5" />
          <button
            onClick={() => onViewChange("preview")}
            className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${
              activeView === "preview"
                ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Presentation className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="hidden lg:inline">Canvas</span>
          </button>
          <button
            onClick={() => onViewChange("code")}
            className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-sm transition-all active:scale-[0.97] ${
              activeView === "code"
                ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Code2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="hidden lg:inline">Source</span>
          </button>
        </div>

        {/* Visual Editing Trigger */}
        {mounted && activeView === "preview" && generatedCode && (
          <button
            onClick={() => setInspectMode(!inspectMode)}
            data-tour="visual-edit"
            title={inspectMode ? "Exit edit mode" : "Direct On-Canvas Edit"}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 border transition-all active:scale-[0.97] text-[10px] md:text-xs font-bold uppercase tracking-wider ${
              inspectMode
                ? "bg-blue-600 border-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]"
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            <Paintbrush className={`w-3 h-3 md:w-3.5 md:h-3.5 ${inspectMode ? "animate-pulse" : ""}`} />
          </button>
        )}
      </div>

      {/* Right actions — overflow menu + always-visible feature buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Onboarding Tour Relauncher */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("slidi-start-onboarding"));
          }}
          title="Restart Workspace Tour"
          className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded hover:bg-slate-50"
        >
          <HelpCircle className="w-4 h-4 text-slate-400" />
        </button>

        {/* Overflow menu — contains all utility actions */}
        <div className="relative" ref={overflowRef}>
          <button
            onClick={() => setShowOverflow((v) => !v)}
            title="More options"
            className={`p-1.5 transition-colors rounded ${showOverflow ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-900"}`}
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showOverflow && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white shadow-xl border border-slate-200 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-1.5 space-y-0.5">
                {/* Library */}
                <button
                  onClick={() => { onToggleGallery(); setShowOverflow(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <LayoutGrid className="w-4 h-4 text-slate-400 shrink-0" />
                  Library
                  {showGallery && <Check className="w-3.5 h-3.5 ml-auto text-slate-900" />}
                </button>

                {/* Version History */}
                <button
                  onClick={() => { onToggleHistory(); setShowOverflow(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <History className="w-4 h-4 text-slate-400 shrink-0" />
                  Version History
                  {showHistory && <Check className="w-3.5 h-3.5 ml-auto text-slate-900" />}
                </button>

                <div className="h-[1px] bg-slate-100 my-1" />

                {/* New Presentation */}
                <button
                  onClick={() => { onNewPresentation(); setShowOverflow(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                  New Presentation
                </button>

                {/* Download */}
                <button
                  onClick={() => { onDownload(); setShowOverflow(false); }}
                  disabled={!mounted || !generatedCode}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
                >
                  <Download className="w-4 h-4 text-slate-400 shrink-0" />
                  Download HTML
                </button>

                {/* Presenter Mode */}
                <button
                  onClick={() => {
                    const channel = currentVersionId || "slidi-editor";
                    const slide = useSlidiStore.getState().currentSlide;
                    window.open(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/presenter?channel=${channel}&slide=${slide}`, "_blank", "width=800,height=600");
                    setShowOverflow(false);
                  }}
                  disabled={!mounted || !generatedCode}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
                >
                  <Presentation className="w-4 h-4 text-slate-400 shrink-0" />
                  Presenter Mode
                </button>

                {/* Restart Tour */}
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("slidi-start-onboarding"));
                    setShowOverflow(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
                  Interactive Tour
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-slate-100 mx-0.5" />

        {/* Save — visible when there's content */}
        {mounted && generatedCode && (
          <button
            onClick={handleSave}
            disabled={saveState === "saving"}
            title={isUnsavedLocally ? "Save to library & cloud" : saveState === "saved" ? "Saved!" : "Save"}
            className={`relative flex items-center gap-1.5 px-2.5 py-1 border text-xs font-semibold uppercase tracking-wider transition-all active:scale-[0.97] disabled:cursor-wait ${
              saveState === "saved"
                ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                : isUnsavedLocally
                ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            {isUnsavedLocally && saveState === "idle" && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            {saveState === "saving" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveState === "saved" ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{saveState === "saved" ? "Saved" : "Save"}</span>
          </button>
        )}

        {/* Share — always visible */}
        <button
          onClick={onPublish}
          data-tour="share-button"
          disabled={!mounted || !generatedCode || publishPending}
          title={publishPending ? "Saving…" : "Publish & Share"}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* Settings — always visible */}
        <button
          onClick={onSettings}
          className="p-1.5 text-slate-400 hover:text-slate-900 transition-all active:rotate-45"
          title="API Configuration"
          aria-label="Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {/* User badge — tablet+ only */}
        {mounted && authMode === "account" && userProfile && (
          <div className="relative hidden md:block" ref={profileMenuRef}>
            <button
              onClick={() => {
                setShowProfileMenu((v) => !v);
                setConfirmDeleteAccount(false);
                setEditingUsername(false);
                setUsernameError("");
              }}
              title={`Account: ${userProfile.username}`}
              className="flex items-center gap-1.5 px-3 py-1 md:py-1.5 bg-slate-900 hover:bg-slate-700 text-white text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors active:scale-[0.97]"
            >
              <span className="font-black">{userProfile.username.charAt(0).toUpperCase()}</span>
              <span className="hidden lg:inline max-w-[80px] truncate">{userProfile.username}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Username display / edit */}
                <div className="px-4 py-3 border-b border-slate-100">
                  {editingUsername ? (
                    <div>
                      <input
                        autoFocus
                        value={usernameDraft}
                        onChange={(e) => { setUsernameDraft(e.target.value); setUsernameError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveUsername(); if (e.key === "Escape") setEditingUsername(false); }}
                        maxLength={30}
                        className="w-full text-sm font-medium border border-slate-200 px-2.5 py-1.5 outline-none focus:border-slate-900 mb-1.5"
                      />
                      {usernameError && <p className="text-xs text-red-500 mb-1">{usernameError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => setEditingUsername(false)} className="flex-1 text-xs py-1 border border-slate-200 text-slate-500 hover:bg-slate-50">Cancel</button>
                        <button
                          onClick={handleSaveUsername}
                          disabled={isSavingUsername}
                          className="flex-1 text-xs py-1 bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {isSavingUsername ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</p>
                        <p className="text-sm font-bold text-slate-900">{userProfile.username}</p>
                      </div>
                      <button
                        onClick={() => { setUsernameDraft(userProfile.username); setEditingUsername(true); }}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-1.5">
                  <button
                    onClick={() => { setShowProfileMenu(false); setShowIdentityModal(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                    Manage identity key
                  </button>
                  <button
                    onClick={handleDownloadData}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Download className="w-4 h-4 text-slate-400 shrink-0" />
                    Download my data
                  </button>
                  <Link
                    href="/usage"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <CircleDollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                    Cost Tracker
                  </Link>
                  <Link
                    href="/status"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Activity className="w-4 h-4 text-slate-400 shrink-0" />
                    System Status
                  </Link>
                </div>

                <div className="border-t border-slate-100 p-1.5">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left ${
                      confirmDeleteAccount
                        ? "bg-red-50 text-red-600 animate-pulse"
                        : "text-slate-500 hover:bg-red-50 hover:text-red-600"
                    }`}
                  >
                    {isDeletingAccount
                      ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                      : <Trash2 className="w-4 h-4 shrink-0" />
                    }
                    {confirmDeleteAccount ? "Click again to confirm" : "Delete my account"}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 shrink-0 text-slate-400" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guest / cloud-anonymous: subtle user icon — tablet+ only */}
        {mounted && authMode === "guest" && (
          <div className="relative hidden md:block" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu((v) => !v)}
              title="Guest mode — local only"
              className="flex items-center gap-1.5 px-3 py-1 md:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors active:scale-[0.97]"
            >
              <User className="w-3.5 h-3.5 text-slate-400" shrink-0="true" />
              <span className="hidden lg:inline">Lokaler Benutzer</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                  <p className="text-sm font-bold text-slate-900">Lokaler Benutzer</p>
                </div>

                <div className="p-1.5">
                  <button
                    onClick={handleDownloadData}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Download className="w-4 h-4 text-slate-400 shrink-0" />
                    Download my data
                  </button>
                  <Link
                    href="/usage"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <CircleDollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                    Cost Tracker
                  </Link>
                  <Link
                    href="/status"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Activity className="w-4 h-4 text-slate-400 shrink-0" />
                    System Status
                  </Link>
                </div>

                <div className="border-t border-slate-100 p-1.5">
                  <button
                    onClick={() => { setShowProfileMenu(false); onOpenAuth?.("login-key"); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <KeyRound className="w-4 h-4 shrink-0 text-slate-400" />
                    Login with Key
                  </button>
                  <button
                    onClick={() => { setShowProfileMenu(false); onOpenAuth?.("entry"); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <UserPlus className="w-4 h-4 shrink-0 text-slate-400" />
                    Create Account
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>

    {showIdentityModal && (
      <IdentityModal
        onClose={() => setShowIdentityModal(false)}
        onIdentityChange={() => setShowIdentityModal(false)}
      />
    )}
    </>
  );
}
