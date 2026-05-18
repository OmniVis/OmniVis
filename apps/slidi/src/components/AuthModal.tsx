"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Copy, Download, AlertTriangle, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { useSlidiStore } from "@/store/slidiStore";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type AuthScreen =
  | "entry"
  | "create-username"
  | "save-key"
  | "login-key"
  | "login-checking"
  | "login-no-account"
  | "guest-confirm"
  | "create-username-with-pasted-key";

interface AuthModalProps {
  isOpen: boolean;
  initialScreen?: AuthScreen;
  onComplete: () => void;
}

/** crypto.randomUUID() requires HTTPS; fall back to Math.random on plain HTTP. */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const USERNAME_RE = /^[\w\s-]{2,30}$/;

/** Progress dots for the create-account flow: positions 1-3 */
function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < step
              ? "w-2 h-2 bg-slate-900"
              : i === step
              ? "w-2.5 h-2.5 bg-slate-900"
              : "w-2 h-2 bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function AuthModal({ isOpen, initialScreen = "entry", onComplete }: AuthModalProps) {
  const { setAuthMode, setUserProfile } = useSlidiStore();

  // Detect if the user had a key before this modal opened
  const [hadKey] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("slidi_user_id");
  });
  const [provisionalKey] = useState<string>(() => {
    if (typeof window === "undefined") return generateUUID();
    return localStorage.getItem("slidi_user_id") || generateUUID();
  });

  const [screen, setScreen] = useState<AuthScreen>(initialScreen);

  // Reset to initialScreen whenever the modal opens
  useEffect(() => {
    if (isOpen) setScreen(initialScreen);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Username screen state
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");

  // Save-key gauntlet state
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyDownloaded, setKeyDownloaded] = useState(false);
  const [keyWarningChecked, setKeyWarningChecked] = useState(false);
  const [keyConfirmInput, setKeyConfirmInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Login-key screen state
  const [pastedKey, setPastedKey] = useState("");
  const [pastedKeyError, setPastedKeyError] = useState("");

  // Async operation state
  const [isWorking, setIsWorking] = useState(false);
  const [workError, setWorkError] = useState("");

  // login-no-account: the key that was looked up but has no account
  const lookedUpKeyRef = useRef<string>("");

  const gauntletPassed =
    keyCopied &&
    keyDownloaded &&
    keyWarningChecked &&
    keyConfirmInput.toLowerCase() === provisionalKey.slice(-8).toLowerCase();

  function validateUsername(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length < 2) return "Username must be at least 2 characters";
    if (trimmed.length > 30) return "Username must be 30 characters or fewer";
    if (!USERNAME_RE.test(trimmed)) return "Only letters, numbers, spaces, underscores, and hyphens";
    return "";
  }

  function handleCopyKey() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(provisionalKey).catch(() => {});
    } else {
      const el = document.createElement("textarea");
      el.value = provisionalKey;
      el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(el);
      el.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(el);
    }
    setKeyCopied(true);
  }

  function handleDownloadKey() {
    const content = [
      "SLIDI ACCOUNT KEY",
      "=================",
      "",
      "Keep this file somewhere safe. This key is the only way to access your Slidi account.",
      "Slidi cannot recover it if you lose it.",
      "",
      "Your key:",
      provisionalKey,
      "",
      `Generated: ${new Date().toISOString()}`,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slidi-key.txt";
    a.click();
    URL.revokeObjectURL(url);
    setKeyDownloaded(true);
  }

  async function handleRegister(keyToUse: string, usernameValue: string): Promise<boolean> {
    setIsWorking(true);
    setWorkError("");
    try {
      const res = await fetch(`${BASE}/api/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: keyToUse, username: usernameValue.trim() }),
      });
      if (res.ok) return true;
      const data = await res.json() as { error?: string };
      setWorkError(data.error ?? "Registration failed");
      return false;
    } catch {
      setWorkError("Network error — please try again");
      return false;
    } finally {
      setIsWorking(false);
    }
  }

  async function finishWithAccount(keyToUse: string, usernameValue: string) {
    // Persist the key (may already be persisted for existing users)
    localStorage.setItem("slidi_user_id", keyToUse);
    setAuthMode("account");
    setUserProfile({ username: usernameValue.trim() });
    localStorage.setItem("slidi_username", usernameValue.trim());
    onComplete();
  }

  // === Entry screen handlers ===

  function handleCreateAccount() {
    setScreen("create-username");
  }

  function handleIHaveKey() {
    setPastedKey("");
    setPastedKeyError("");
    setScreen("login-key");
  }

  function handleUseLocally() {
    // Don't persist the key
    setAuthMode("guest");
    setScreen("guest-confirm");
  }

  function handleContinueWithCloud() {
    // Existing user — keep their key, just set mode
    localStorage.setItem("slidi_user_id", provisionalKey);
    setAuthMode("cloud-anonymous");
    onComplete();
  }

  function handleUseLocallyExisting() {
    // Clear key for existing user choosing guest mode
    localStorage.removeItem("slidi_user_id");
    setAuthMode("guest");
    setScreen("guest-confirm");
  }

  // === Create-username screen handlers ===

  async function handleContinueFromUsername() {
    const error = validateUsername(username);
    if (error) { setUsernameError(error); return; }
    setUsernameError("");

    if (!hadKey) {
      // New user: show gauntlet before registering
      setScreen("save-key");
    } else {
      // Existing user: register immediately
      const ok = await handleRegister(provisionalKey, username);
      if (ok) await finishWithAccount(provisionalKey, username);
    }
  }

  // === Save-key gauntlet handlers ===

  async function handleCreateAccountAfterGauntlet() {
    const ok = await handleRegister(provisionalKey, username);
    if (ok) await finishWithAccount(provisionalKey, username);
  }

  // === Login-key screen handlers ===

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function handleLoginWithKey() {
    const trimmed = pastedKey.trim();
    if (!UUID_RE.test(trimmed)) {
      setPastedKeyError("Please enter a valid key (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)");
      return;
    }
    setPastedKeyError("");
    setScreen("login-checking");
    lookedUpKeyRef.current = trimmed;

    try {
      const res = await fetch(`${BASE}/api/user?user_id=${trimmed}`);
      const data = await res.json() as { exists: boolean; username?: string };
      if (data.exists && data.username) {
        localStorage.setItem("slidi_user_id", trimmed);
        setAuthMode("account");
        setUserProfile({ username: data.username });
        localStorage.setItem("slidi_username", data.username);
        onComplete();
      } else {
        setScreen("login-no-account");
      }
    } catch {
      setWorkError("Network error — please try again");
      setScreen("login-key");
    }
  }

  // === Login-no-account screen handlers ===

  function handleCreateWithLookedUpKey() {
    // They pasted a valid key with no account — take them through username creation
    // Set the provisional key state is immutable, but we can override via lookedUpKeyRef
    setUsername("");
    setUsernameError("");
    // We'll use a flag to signal: use lookedUpKeyRef.current as the key
    setScreen("create-username-with-pasted-key");
  }

  async function handleContinueCloudWithLookedUpKey() {
    const key = lookedUpKeyRef.current;
    localStorage.setItem("slidi_user_id", key);
    setAuthMode("cloud-anonymous");
    onComplete();
  }

  // === Screens ===

  // "create-username-with-pasted-key" is an internal variant of create-username
  // that uses lookedUpKeyRef.current as the key instead of provisionalKey.
  const isPastedKeyFlow = screen === ("create-username-with-pasted-key" as AuthScreen);
  const effectiveKey = isPastedKeyFlow ? lookedUpKeyRef.current : provisionalKey;

  async function handleContinueFromUsernameEffective() {
    const error = validateUsername(username);
    if (error) { setUsernameError(error); return; }
    setUsernameError("");

    if (isPastedKeyFlow || hadKey) {
      // Register immediately — key already saved or about to be
      const ok = await handleRegister(effectiveKey, username);
      if (ok) await finishWithAccount(effectiveKey, username);
    } else {
      // New user: show gauntlet first
      setScreen("save-key");
    }
  }

  if (!isOpen) return null;

  const isCreateUsernameScreen = screen === "create-username" || isPastedKeyFlow;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden">

        {/* ── ENTRY SCREEN ── */}
        {screen === "entry" && (
          <div className="p-8">
            <div className="flex justify-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BASE}/assets/branding/Brand_Icon.svg`}
                alt="Slidi"
                className="w-10 h-10 object-contain"
              />
            </div>
            {hadKey ? (
              <>
                <h2 className="text-xl font-black text-slate-900 text-center mb-1">Welcome back</h2>
                <p className="text-sm text-slate-500 text-center mb-8">
                  You have an existing cloud identity. What would you like to do?
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleCreateAccount}
                    className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors"
                  >
                    Create a full account with my key
                  </button>
                  <button
                    onClick={handleContinueWithCloud}
                    className="w-full py-3 px-4 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Continue with cloud access only
                  </button>
                  <button
                    onClick={handleUseLocallyExisting}
                    className="w-full py-3 px-4 text-slate-400 rounded-xl font-medium text-sm hover:text-slate-600 transition-colors"
                  >
                    Use locally only
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-black text-slate-900 text-center mb-1">Welcome to Slidi</h2>
                <p className="text-sm text-slate-500 text-center mb-8">
                  Create an account to save your presentations to the cloud, or continue locally.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleCreateAccount}
                    className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors"
                  >
                    Create an account
                  </button>
                  <button
                    onClick={handleIHaveKey}
                    className="w-full py-3 px-4 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    I already have a key
                  </button>
                  <button
                    onClick={handleUseLocally}
                    className="w-full py-3 px-4 text-slate-400 rounded-xl font-medium text-sm hover:text-slate-600 transition-colors"
                  >
                    Use locally — no account
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CREATE USERNAME SCREEN ── */}
        {isCreateUsernameScreen && (
          <div className="p-8">
            <ProgressDots step={0} total={hadKey || isPastedKeyFlow ? 1 : 2} />
            <h2 className="text-xl font-black text-slate-900 text-center mb-1">Choose a username</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              This is how you'll appear in Slidi.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Username
              </label>
              <input
                autoFocus
                value={username}
                onChange={(e) => { setUsername(e.target.value); setUsernameError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleContinueFromUsernameEffective(); }}
                placeholder="e.g. alex_designs"
                maxLength={30}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
              {usernameError && (
                <p className="text-xs text-red-500 font-medium mt-1.5">{usernameError}</p>
              )}
            </div>

            {/* Key preview */}
            <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your account key</p>
              <p className="text-xs font-mono text-slate-500 break-all">
                {effectiveKey.slice(0, 8)}••••••••••••••••••••••••••••{effectiveKey.slice(-4)}
              </p>
            </div>

            {workError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                {workError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setScreen("entry"); setWorkError(""); }}
                className="px-4 py-3 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleContinueFromUsernameEffective}
                disabled={isWorking || !username.trim()}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-wait transition-colors flex items-center justify-center gap-2"
              >
                {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {hadKey || isPastedKeyFlow ? "Create account" : "Continue"}
              </button>
            </div>
          </div>
        )}

        {/* ── SAVE KEY GAUNTLET SCREEN ── */}
        {screen === "save-key" && (
          <div className="p-8">
            <ProgressDots step={1} total={2} />
            <h2 className="text-xl font-black text-slate-900 text-center mb-1">Save your key</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              This key is your account. Slidi cannot recover it. Complete all steps to continue.
            </p>

            {/* Key display */}
            <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your key</p>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="font-mono text-sm text-slate-700 break-all select-all">
                {showKey
                  ? provisionalKey
                  : provisionalKey.slice(0, 8) + "••••••••••••••••••••" + provisionalKey.slice(-8)}
              </p>
            </div>

            {/* Gate 1: Copy */}
            <div className={`mb-3 p-3 rounded-xl border transition-colors ${keyCopied ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {keyCopied
                    ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <Copy className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                  <span className="text-sm font-medium text-slate-700">Copy key to clipboard</span>
                </div>
                <button
                  onClick={handleCopyKey}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    keyCopied
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-slate-900 text-white hover:bg-blue-600"
                  }`}
                >
                  {keyCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Gate 2: Download */}
            <div className={`mb-3 p-3 rounded-xl border transition-colors ${keyDownloaded ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {keyDownloaded
                    ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <Download className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                  <span className="text-sm font-medium text-slate-700">Download key file</span>
                </div>
                <button
                  onClick={handleDownloadKey}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    keyDownloaded
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-slate-900 text-white hover:bg-blue-600"
                  }`}
                >
                  {keyDownloaded ? "Downloaded" : "Download"}
                </button>
              </div>
            </div>

            {/* Gate 3: Warning checkbox */}
            <label className={`mb-3 p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${keyWarningChecked ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <input
                type="checkbox"
                checked={keyWarningChecked}
                onChange={(e) => setKeyWarningChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-slate-900 shrink-0"
              />
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${keyWarningChecked ? "text-emerald-500" : "text-amber-500"}`} />
                <span className="text-xs font-medium text-slate-700 leading-relaxed">
                  I understand that losing this key means losing access to my account. Slidi cannot recover it for me.
                </span>
              </div>
            </label>

            {/* Gate 4: Type last 8 chars */}
            <div className={`mb-6 p-3 rounded-xl border transition-colors ${
              keyConfirmInput.toLowerCase() === provisionalKey.slice(-8).toLowerCase() && keyConfirmInput
                ? "bg-emerald-50 border-emerald-200"
                : "bg-white border-slate-200"
            }`}>
              <p className="text-xs font-bold text-slate-500 mb-2">
                Type the last 8 characters of your key to confirm
              </p>
              <p className="font-mono text-xs text-slate-400 mb-2">
                …{provisionalKey.slice(-8)}
              </p>
              <input
                value={keyConfirmInput}
                onChange={(e) => setKeyConfirmInput(e.target.value)}
                placeholder="Last 8 characters"
                maxLength={8}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {workError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                {workError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setScreen("create-username"); setWorkError(""); }}
                className="px-4 py-3 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateAccountAfterGauntlet}
                disabled={!gauntletPassed || isWorking}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create account
              </button>
            </div>
          </div>
        )}

        {/* ── LOGIN KEY SCREEN ── */}
        {screen === "login-key" && (
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 text-center mb-1">Enter your key</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Paste the UUID key you saved when creating your account.
            </p>

            <div className="mb-4">
              <textarea
                autoFocus
                value={pastedKey}
                onChange={(e) => { setPastedKey(e.target.value); setPastedKeyError(""); }}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                rows={2}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
              />
              {pastedKeyError && (
                <p className="text-xs text-red-500 font-medium mt-1.5">{pastedKeyError}</p>
              )}
            </div>

            {workError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                {workError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setScreen("entry"); setWorkError(""); }}
                className="px-4 py-3 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleLoginWithKey}
                disabled={!pastedKey.trim()}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Log in
              </button>
            </div>
          </div>
        )}

        {/* ── LOGIN CHECKING SCREEN ── */}
        {screen === "login-checking" && (
          <div className="p-8 flex flex-col items-center justify-center min-h-48">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-500">Checking your account…</p>
          </div>
        )}

        {/* ── LOGIN NO ACCOUNT SCREEN ── */}
        {screen === "login-no-account" && (
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 text-center mb-1">Key is valid</h2>
            <p className="text-sm text-slate-500 text-center mb-8">
              This key doesn&apos;t have an account yet. What would you like to do?
            </p>
            <div className="space-y-3">
              <button
                onClick={handleCreateWithLookedUpKey}
                className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors"
              >
                Create an account with this key
              </button>
              <button
                onClick={handleContinueCloudWithLookedUpKey}
                className="w-full py-3 px-4 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Continue with cloud access only
              </button>
              <button
                onClick={() => setScreen("login-key")}
                className="w-full py-3 px-4 text-slate-400 rounded-xl font-medium text-sm hover:text-slate-600 transition-colors"
              >
                Try a different key
              </button>
            </div>
          </div>
        )}

        {/* ── GUEST CONFIRM SCREEN ── */}
        {screen === "guest-confirm" && (
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 text-center mb-1">You&apos;re all set</h2>
            <p className="text-sm text-slate-500 text-center mb-2">
              Working locally — your presentations stay in this browser only.
            </p>
            <p className="text-xs text-slate-400 text-center mb-8">
              You can create an account any time from the Library drawer.
            </p>
            <button
              onClick={onComplete}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors"
            >
              Got it, let me work
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
