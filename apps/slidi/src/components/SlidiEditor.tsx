"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Header from "./Header";
import { buildSrcdoc } from "./SrcdocPreview";
import ChatPane from "./ChatPane";
import CanvasPane from "./CanvasPane";
import { useSlidiStore } from "@/store/slidiStore";
import { Check, X, Layers, TerminalSquare, Palette, LayoutGrid } from "lucide-react";
import { applyCustomTheme, loadCustomPalette } from "@/lib/themes";
import { extractSessionName } from "@/lib/sessions";
import { useBroadcastChannel } from "@/hooks/useBroadcastChannel";
import { useCollabSession } from "@/hooks/useCollabSession";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { migrateSessionsToIdb } from "@/lib/migrations";
import { getUserId } from "@/lib/userId";
import AuthModal, { type AuthScreen } from "@/components/AuthModal";
import SlidiOnboardingTour from "./SlidiOnboardingTour";

function PanelSkeleton() {
  return <div className="fixed inset-y-0 right-0 w-80 bg-slate-100 animate-pulse" />;
}

const GalleryDrawer = dynamic(() => import("./GalleryDrawer"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});
const VersionHistoryDrawer = dynamic(() => import("./VersionHistoryDrawer"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});
const StyleSidebar = dynamic(() => import("./StyleSidebar"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});
const SettingsModal = dynamic(() => import("./SettingsModal"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});
const BrandingManager = dynamic(() => import("./BrandingManager"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});

type MobileTab = "canvas" | "chat";

// Prefix all client-side fetch() calls with the Next.js basePath so they
// resolve correctly when the app is served under a sub-path (e.g. /slidi/).
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function SlidiEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiKey, generatedCode, setCurrentVersionId, pushVersion, clearPresentation, presentationName, setPresentationName, saveCurrentAsSession } = useSlidiStore();
  const currentSlide = useSlidiStore((s) => s.currentSlide);
  const currentSessionId = useSlidiStore((s) => s.currentSessionId);
  const currentVersionId = useSlidiStore((s) => s.currentVersionId);
  const authMode = useSlidiStore((s) => s.authMode);

  // Primary BroadcastChannel responder for the Presenter window.
  // Lives here (always mounted) rather than inside SrcdocPreview (which may not
  // be mounted when the user is on the code tab or during generation).
  // Responds to SLIDI_REQUEST_STATE with the current slide index so the
  // Presenter shows the correct slide immediately on connect.
  const presenterChannelId = currentVersionId || "slidi-editor";
  useBroadcastChannel(
    presenterChannelId,
    useCallback((data: unknown) => {
      const msg = data as { type: string };
      if (msg.type === "SLIDI_REQUEST_STATE") {
        const { currentSlide, totalSlides } = useSlidiStore.getState();
        const bc = new BroadcastChannel(presenterChannelId);
        bc.postMessage({ type: "SLIDI_STATE_SYNC", current: currentSlide, total: totalSlides });
        bc.close();
      }
    // presenterChannelId is stable — safe to include
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [presenterChannelId])
  );
  // One-time migration: move localStorage sessions to IndexedDB
  useEffect(() => {
    migrateSessionsToIdb();
  }, []);

  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [showApiModal, setShowApiModal] = useState(false);
  const [showStyleSidebar, setShowStyleSidebar] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showInsecureModal, setShowInsecureModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("canvas");
  const [forkBanner, setForkBanner] = useState<"success" | "error" | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Collab invite URL — persisted until collab is turned off (Fix D)
  const [inviteUrl, setInviteUrl] = useState<string | undefined>(undefined);

  // Show API key modal on first visit (client-only)
  useEffect(() => {
    if (!apiKey) {
      setShowApiModal(true);
    }
  }, [apiKey]);

  // Re-apply custom palette on mount so THEME_STYLES["custom"] is populated
  useEffect(() => {
    const palette = loadCustomPalette();
    applyCustomTheme(palette);
  }, []);

  // Fork: load shared presentation into editor
  useEffect(() => {
    const forkId = searchParams.get("fork");
    if (!forkId) return;

    // Remove param immediately to prevent re-triggering on re-render
    router.replace("/");

    fetch(`${BASE}/api/share/${forkId}/`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        const data = await res.json() as { code_content: string };
        // Extract title from the forked code so the library card has the right name
        const { sessions } = useSlidiStore.getState();
        const name = extractSessionName(data.code_content, sessions);
        setPresentationName(name);
        // pushVersion now auto-creates the library session on first push
        pushVersion(data.code_content);
        setForkBanner("success");
        setTimeout(() => setForkBanner(null), 4000);
      })
      .catch(() => {
        setForkBanner("error");
        setTimeout(() => setForkBanner(null), 4000);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save to D1 whenever generatedCode changes (best-effort, silent).
  // When a currentVersionId exists, UPDATE that row instead of inserting a new one
  // so the Cloud gallery shows one entry per session instead of one per keystroke.
  const autoSave = useCallback(async (code: string) => {
    if (!code) return;
    setIsSaving(true);
    try {
      const { notes, presentationName, currentVersionId: existingId } = useSlidiStore.getState();
      const sessionName = presentationName || "Untitled";
      let res: Response;
      if (existingId) {
        res = await fetch(`${BASE}/api/share/${existingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          // Include user_id so server can repair rows that have NULL user_id (fallback-INSERT rows)
          body: JSON.stringify({ code, notes, session_name: sessionName, user_id: getUserId() }),
        });
        // PUT failed (e.g. row gone) — fall back to a fresh insert
        if (!res.ok) {
          res = await fetch(`${BASE}/api/share/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, notes, user_id: getUserId(), session_name: sessionName }),
          });
          if (res.ok) {
            const data = await res.json() as { id: string; url: string };
            setCurrentVersionId(data.id);
          }
        }
      } else {
        res = await fetch(`${BASE}/api/share/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            notes,
            user_id: getUserId(),
            session_name: sessionName,
          }),
        });
        if (res.ok) {
          const data = await res.json() as { id: string; url: string };
          setCurrentVersionId(data.id);
        }
      }
    } catch {
      // Auto-save is best-effort; failures are silent
    } finally {
      setIsSaving(false);
    }
  }, [setCurrentVersionId]);

  useEffect(() => {
    if (!generatedCode) return;
    const timer = setTimeout(() => autoSave(generatedCode), 1000);
    return () => clearTimeout(timer);
  }, [generatedCode, autoSave]);

  // Manual save: ensures the current presentation is in the local library,
  // then immediately syncs to cloud (bypassing the 1 s debounce).
  const handleSave = useCallback(async () => {
    if (!generatedCode) return;
    // Save to local library if not already linked
    if (!currentSessionId) {
      saveCurrentAsSession();
    }
    // Immediately push to cloud
    await autoSave(generatedCode);
  }, [generatedCode, currentSessionId, saveCurrentAsSession, autoSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable) return;

      const { undo, redo } = useSlidiStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape") {
        setShowGallery(false);
        setShowStyleSidebar(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleDownload = async () => {
    const { generatedCode, theme, branding, presentationName } = useSlidiStore.getState();
    if (!generatedCode) return;

    // Convert branding logo to Base64 for offline support
    let exportBranding = branding;
    if (branding?.logoUrl) {
      try {
        const { imageUrlToBase64 } = await import("@/lib/exportUtils");
        const base64Logo = await imageUrlToBase64(branding.logoUrl);
        exportBranding = { ...branding, logoUrl: base64Logo };
      } catch (err) {
        console.error("Export branding conversion failed:", err);
      }
    }

    const html = buildSrcdoc(generatedCode, theme, exportBranding, true);
    const safeName = (presentationName || "presentation")
      .replace(/[^a-z0-9\-_ ]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "presentation";
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Collab state
  const [isCollabEnabled, setIsCollabEnabled] = useState(false);

  // Start collab automatically when a collabSessionId is set (e.g. via invite link)
  const collabSessionId = useSlidiStore((s) => s.collabSessionId);
  useEffect(() => {
    if (collabSessionId) setIsCollabEnabled(true);
  }, [collabSessionId]);

  // Reset collab when switching sessions so the new session starts clean.
  // Without this, isCollabEnabled stays true and the hook reconnects with the
  // new presentationId — triggering another empty-room SYNC on the new session.
  useEffect(() => {
    setIsCollabEnabled(false);
  }, [currentSessionId]);

  const collabPresentationId = collabSessionId || currentVersionId;
  useCollabSession({
    presentationId: collabPresentationId,
    enabled: isCollabEnabled && !!collabPresentationId,
  });

  const { conflict, queueVersion, replayQueue } = useOfflineQueue();

  // When offline: queue version pushes instead of letting them be lost
  // (This is best-effort — the auto-save loop still runs, so online recovery is automatic)
  const isOnlineRef = useRef(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    function onOffline() { isOnlineRef.current = false; }
    function onOnline() { isOnlineRef.current = true; }
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // Suppress unused-var lint for queueVersion / replayQueue (used only when offline path is triggered externally)
  void queueVersion; void replayQueue;

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialScreen, setAuthInitialScreen] = useState<AuthScreen>("entry");

  // Show auth modal when user hasn't chosen a mode yet
  useEffect(() => {
    if (authMode === "pending") {
      setAuthInitialScreen("entry");
      setShowAuthModal(true);
    }
  }, [authMode]);

  function openAuth(screen: AuthScreen = "entry") {
    setAuthInitialScreen(screen);
    setShowAuthModal(true);
  }

  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    const { generatedCode, notes, presentationName, currentVersionId: existingId } = useSlidiStore.getState();
    if (!generatedCode) return;

    setIsPublishing(true);
    try {
      // Resolve the share URL: PUT if we have an existing cloud row, POST otherwise.
      // If PUT returns 404 the row is gone (e.g. DB wipe after redeploy) — fall back to POST.
      const shareUrl = await (async (): Promise<string> => {
        if (existingId) {
          const res = await fetch(`${BASE}/api/share/${existingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: generatedCode,
              notes,
              session_name: presentationName || "Untitled",
              user_id: getUserId(),
            }),
          });
          if (res.ok) return `/view/${existingId}`;
          if (res.status !== 404) throw new Error("Failed to update");
          // 404 — row gone, clear stale ID and fall through to create
          setCurrentVersionId("");
        }
        // Create a fresh cloud row
        const res = await fetch(`${BASE}/api/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: generatedCode,
            notes,
            user_id: getUserId(),
            session_name: presentationName || "Untitled",
          }),
        });
        if (!res.ok) throw new Error("Failed to share");
        const data = await res.json() as { id: string; url: string };
        setCurrentVersionId(data.id);
        return data.url;
      })();

      const fullUrl = `${window.location.origin}${BASE}${shareUrl}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl).catch(() => {});
      } else {
        const el = document.createElement("textarea");
        el.value = fullUrl;
        el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setShareToast(fullUrl);
      setTimeout(() => setShareToast(null), 5000);
    } catch (err) {
      console.error("Publish error:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] font-sans text-slate-900 overflow-hidden selection:bg-slate-900 selection:text-white">
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        onPublish={handlePublish}
        publishPending={isPublishing}
        onSettings={() => setShowApiModal(true)}
        onToggleStyles={() => setShowStyleSidebar(!showStyleSidebar)}
        onOpenAuth={openAuth}
        showStyleSidebar={showStyleSidebar}
        onNewPresentation={() => {
          clearPresentation();
          setShowGallery(false);
          setShowStyleSidebar(false);
          router.push("/");
        }}
        showGallery={showGallery}
        onToggleGallery={() => setShowGallery(!showGallery)}
        onDownload={handleDownload}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory((v) => !v)}
        presentationName={presentationName}
        onRenamePresentation={setPresentationName}
        onSave={handleSave}
        inviteUrl={inviteUrl}
        onCollab={async () => {
          if (!currentVersionId) return;
          
          // Toggle collaboration state
          const turningOn = !isCollabEnabled;
          setIsCollabEnabled(turningOn);

          if (!turningOn) {
            // Turning off — clear the stored invite URL
            setInviteUrl(undefined);
          } else {
            // Turning on — generate an invite link and store it persistently
            try {
              const res = await fetch(`${BASE}/api/collab/invite/${currentVersionId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: getUserId() }),
              });

              if (res.ok) {
                const data = await res.json() as { inviteUrl: string };
                // inviteUrl already contains the basePath (e.g. /slidi/collab/TOKEN)
                const fullUrl = `${window.location.origin}${data.inviteUrl}`;

                // Store persistently in state (visible in Header as long as collab is on)
                setInviteUrl(fullUrl);

                // Also copy to clipboard on first activation for convenience
                if (navigator.clipboard) {
                  await navigator.clipboard.writeText(fullUrl).catch(() => {});
                } else {
                  const el = document.createElement("textarea");
                  el.value = fullUrl;
                  el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand("copy");
                  document.body.removeChild(el);
                }

                setShareToast(fullUrl);
                setTimeout(() => setShareToast(null), 5000);
              }
            } catch (err) {
              console.error("Failed to generate collab invite:", err);
            }
          }
        }}
      />

      {/* Fork banner */}
      {forkBanner === "success" && (
        <div className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] text-center py-2 px-4 shrink-0 animate-in slide-in-from-top duration-500">
          Forked successfully — start editing
        </div>
      )}
      {forkBanner === "error" && (
        <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] text-center py-2 px-4 shrink-0 animate-in slide-in-from-top duration-500">
          Fork failed — presentation not found
        </div>
      )}

      {/* ── Desktop: side-by-side ── Mobile: single pane controlled by tab bar ── */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {showStyleSidebar && (
          /* Desktop: inline sidebar */
          <div className="hidden md:flex w-[260px] flex-shrink-0 animate-in slide-in-from-left duration-300 ease-out border-r border-slate-100">
            <StyleSidebar onClose={() => setShowStyleSidebar(false)} />
          </div>
        )}
        <div 
          key={activeView} 
          className={`flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500 ${mobileTab === "canvas" ? "flex" : "hidden"} md:flex`}
        >
          <CanvasPane activeView={activeView} />
        </div>
        <div className={`flex flex-col overflow-hidden md:flex ${mobileTab === "chat" ? "flex" : "hidden"} w-full md:w-[30%] md:min-w-[280px] md:max-w-[420px] md:border-l md:border-slate-100/80 bg-white`}>
          <ChatPane
            onSettings={() => setShowApiModal(true)}
            onInsecure={() => setShowInsecureModal(true)}
          />
        </div>
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="flex md:hidden shrink-0 border-t border-slate-200 bg-white/80 backdrop-blur-lg sticky bottom-0 z-50">
        <button
          onClick={() => { setMobileTab("canvas"); setShowStyleSidebar(false); setShowGallery(false); }}
          aria-label="View Canvas"
          className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
            mobileTab === "canvas" && !showStyleSidebar && !showGallery ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Layers className="w-4 h-4" />
          Canvas
          {mobileTab === "canvas" && !showStyleSidebar && !showGallery && <div className="absolute bottom-0 w-8 h-1 bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setShowStyleSidebar((v) => !v)}
          aria-label="Styles"
          className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
            showStyleSidebar ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Palette className="w-4 h-4" />
          Styles
          {showStyleSidebar && <div className="absolute bottom-0 w-8 h-1 bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setShowGallery((v) => !v)}
          aria-label="Library"
          className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
            showGallery ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Library
          {showGallery && <div className="absolute bottom-0 w-8 h-1 bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => { setMobileTab("chat"); setShowStyleSidebar(false); setShowGallery(false); }}
          aria-label="View Chat"
          className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
            mobileTab === "chat" && !showStyleSidebar && !showGallery ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <TerminalSquare className="w-4 h-4" />
          Chat
          {mobileTab === "chat" && !showStyleSidebar && !showGallery && <div className="absolute bottom-0 w-8 h-1 bg-blue-600 rounded-t-full" />}
        </button>
      </nav>

      {showApiModal && (
        <SettingsModal onClose={() => setShowApiModal(false)} />
      )}


      {/* Offline conflict resolution dialog */}
      {conflict && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm mx-4 shadow-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Sync conflict</h2>
            <p className="text-xs text-slate-600">
              Your offline edits conflict with changes made by another user. Which version do you want to keep?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => conflict.resolve("local")}
                className="flex-1 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-700 transition-colors"
              >
                Keep mine
              </button>
              <button
                onClick={() => conflict.resolve("remote")}
                className="flex-1 py-2 text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Use theirs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Insecure Context Modal ── */}
      {showInsecureModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" 
            onClick={() => setShowInsecureModal(false)}
          />
          <div className="relative bg-white rounded-[40px] shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
              <Check className="hidden" /> {/* Dummy to keep imports happy if needed */}
              <div className="w-10 h-10 text-red-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m12 8 4 4"/><path d="m16 8-4 4"/></svg>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">
              Security Required
            </h3>
            
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Voice transcription is disabled because the browser requires a <span className="font-bold text-slate-900">secure HTTPS connection</span> to access the microphone.
            </p>
            
            <button
              onClick={() => setShowInsecureModal(false)}
              className="w-full bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
            >
              Understand & Close
            </button>
          </div>
        </div>
      )}

      {/* Mobile StyleSidebar bottom-sheet — rendered outside <main> so it is never
          clipped by main's overflow:hidden and sits in the root stacking context,
          above the bottom nav (z-50). pb-16 keeps the sheet above the nav area. */}
      {showStyleSidebar && (
        <div className="fixed inset-0 z-[200] flex flex-col pb-16 md:hidden animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowStyleSidebar(false)} />
          <div className="relative mt-auto w-full h-[85vh] flex flex-col bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            <StyleSidebar onClose={() => setShowStyleSidebar(false)} />
          </div>
        </div>
      )}

      <GalleryDrawer isOpen={showGallery} onClose={() => setShowGallery(false)} onOpenAuth={openAuth} />
      <VersionHistoryDrawer isOpen={showHistory} onClose={() => setShowHistory(false)} />

      <AuthModal
        isOpen={showAuthModal}
        initialScreen={authInitialScreen}
        onComplete={() => setShowAuthModal(false)}
      />

      {authMode !== "pending" && <SlidiOnboardingTour />}

      {/* Share toast */}
      {shareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900/95 backdrop-blur-md text-white text-xs px-5 py-4 shadow-2xl rounded-[32px] border border-white/10 max-w-sm w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-emerald-400" strokeWidth={3} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] leading-tight">
              Link copied
            </span>
            <span className="truncate text-slate-300 mt-1 font-medium text-[13px]">{shareToast}</span>
          </div>
          <button
            onClick={() => setShareToast(null)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function SlidiEditor() {
  return (
    <Suspense>
      <SlidiEditorInner />
    </Suspense>
  );
}
