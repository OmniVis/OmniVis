"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSlidiStore } from "@/store/slidiStore";
import { X, Trash2, Edit3, Check, Play, Clock, Cloud, HardDrive, Loader2, KeyRound, CloudUpload, Download, UserPlus } from "lucide-react";
import { THEME_STYLES } from "@/lib/themes";
import ThumbnailPreview from "@/components/ThumbnailPreview";
import { getAllSessionContents } from "@/lib/idb";
import { getUserId } from "@/lib/userId";
import { getCloudId, setCloudId } from "@/lib/cloudMap";
import IdentityModal from "@/components/IdentityModal";
import type { Session, SessionMeta } from "@/lib/sessions";
import { getSessionContent } from "@/lib/idb";
import type { AuthScreen } from "@/components/AuthModal";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface GalleryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: (screen?: AuthScreen) => void;
}

interface CloudEntry {
  id: string;
  session_name: string | null;
  created_at: string;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function GalleryDrawer({ isOpen, onClose, onOpenAuth }: GalleryDrawerProps) {
  const { sessions, currentSessionId, switchToSession, renameSession, deleteSession, pushVersion, saveCurrentAsSession, setPresentationName, importCloudSession, authMode, userProfile } = useSlidiStore();
  const generatedCode = useSlidiStore((s) => s.generatedCode);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"local" | "cloud">("local");
  const [cloudEntries, setCloudEntries] = useState<CloudEntry[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [openingCloudId, setOpeningCloudId] = useState<string | null>(null);
  const [cloudOpenError, setCloudOpenError] = useState<string | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityKey, setIdentityKey] = useState<string>("");
  const [savingToCloud, setSavingToCloud] = useState<Set<string>>(new Set());
  const [savedToCloud, setSavedToCloud] = useState<Set<string>>(new Set());
  // Track which sessions are linked to a cloud ID (refreshed when drawer opens)
  const [cloudLinked, setCloudLinked] = useState<Set<string>>(new Set());
  // Cloud tab — delete + save-to-local state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cloudActionError, setCloudActionError] = useState<string | null>(null);
  const [savingLocalId, setSavingLocalId] = useState<string | null>(null);
  const [savedLocalIds, setSavedLocalIds] = useState<Set<string>>(new Set());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted) setIdentityKey(getUserId());
  }, [mounted]);

  useEffect(() => {
    if (!isOpen) return;
    // Refresh which sessions already have a cloud copy
    setCloudLinked(new Set(sessions.filter((s) => getCloudId(s.id) !== null).map((s) => s.id)));
  }, [isOpen, sessions]);

  const fetchCloud = useCallback(() => {
    const userId = getUserId();
    if (!userId) return;
    setCloudLoading(true);
    setCloudEntries([]);
    fetch(`${BASE}/api/presentations?user_id=${userId}`)
      .then((res) => res.json())
      .then((data: CloudEntry[]) => setCloudEntries(data))
      .catch(() => setCloudEntries([]))
      .finally(() => setCloudLoading(false));
  }, []);

  useEffect(() => {
    if (!isOpen || activeTab !== "cloud") return;
    if (authMode === "guest") return; // guests have no cloud
    fetchCloud();
  }, [isOpen, activeTab, fetchCloud, authMode]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showIdentityModal) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose, showIdentityModal]);

  const handleRename = (id: string) => {
    if (editName.trim()) renameSession(id, editName.trim());
    setEditingId(null);
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleOpenCloud = async (entry: CloudEntry) => {
    setOpeningCloudId(entry.id);
    try {
      const res = await fetch(`${BASE}/api/share/${entry.id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json() as { code_content: string };
      const name = entry.session_name || "Cloud Presentation";
      useSlidiStore.getState().loadCloudPresentation(data.code_content, name, entry.id);
      onClose();
    } catch {
      setCloudOpenError("Could not load presentation. It may have been deleted.");
      setTimeout(() => setCloudOpenError(null), 4000);
    } finally {
      setOpeningCloudId(null);
    }
  };

  const handleSaveToCloud = async (session: { id: string; name: string }) => {
    const full = await getSessionContent(session.id);
    if (!full || full.history.length === 0) return;

    const code = full.history[full.historyIndex];
    const notes = full.notes;
    const sessionName = session.name;
    const existingCloudId = getCloudId(session.id);

    setSavingToCloud((prev) => new Set(prev).add(session.id));
    try {
      let cloudId = existingCloudId;

      if (cloudId) {
        // Try to update the existing cloud entry
        const res = await fetch(`${BASE}/api/share/${cloudId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          // Include user_id so server can repair rows that have NULL user_id (fallback-INSERT rows)
          body: JSON.stringify({ code, notes, session_name: sessionName, user_id: getUserId() }),
        });
        if (!res.ok) {
          // Cloud entry gone — fall through to create a new one
          cloudId = null;
        }
      }

      if (!cloudId) {
        // No existing cloud entry: create one
        const res = await fetch(`${BASE}/api/share/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, notes, user_id: getUserId(), session_name: sessionName }),
        });
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json() as { id: string };
        cloudId = data.id;
      }

      setCloudId(session.id, cloudId);
      setCloudLinked((prev) => new Set(prev).add(session.id));
      setSavedToCloud((prev) => new Set(prev).add(session.id));
      setTimeout(() => setSavedToCloud((prev) => { const n = new Set(prev); n.delete(session.id); return n; }), 2500);
    } catch {
      // silent — button will revert to normal state
    } finally {
      setSavingToCloud((prev) => { const n = new Set(prev); n.delete(session.id); return n; });
    }
  };

  const handleDeleteCloud = async (entry: CloudEntry) => {
    // Two-click confirm: first click arms confirm state, second executes
    if (confirmDeleteId !== entry.id) {
      setConfirmDeleteId(entry.id);
      return;
    }
    setDeletingId(entry.id);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`${BASE}/api/share/${entry.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: getUserId() }),
      });
      if (res.ok) {
        setCloudEntries((prev) => prev.filter((e) => e.id !== entry.id));
      } else if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After") ?? "60";
        setCloudActionError(`Too many requests — try again in ${retryAfter}s`);
        setTimeout(() => setCloudActionError(null), 5000);
      } else {
        setCloudActionError("Could not delete — you may not be the owner");
        setTimeout(() => setCloudActionError(null), 4000);
      }
    } catch {
      setCloudActionError("Network error — please try again");
      setTimeout(() => setCloudActionError(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveToLocal = async (entry: CloudEntry) => {
    setSavingLocalId(entry.id);
    try {
      const res = await fetch(`${BASE}/api/share/${entry.id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json() as { code_content: string };
      importCloudSession(data.code_content, entry.session_name || "Cloud Presentation", entry.id);
      setSavedLocalIds((prev) => new Set(prev).add(entry.id));
      setTimeout(() => setSavedLocalIds((prev) => { const n = new Set(prev); n.delete(entry.id); return n; }), 2500);
    } catch {
      setCloudActionError("Could not load presentation content");
      setTimeout(() => setCloudActionError(null), 4000);
    } finally {
      setSavingLocalId(null);
    }
  };

  const handleIdentityChange = () => {
    setIdentityKey(getUserId());
    setShowIdentityModal(false);
    fetchCloud();
  };

  // Abbreviated key for display: first 8 chars
  const shortKey = identityKey ? identityKey.slice(0, 8) + "…" : "—";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-80 md:w-96 bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] z-[101] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col border-r border-slate-100`}
      >
        {/* Header */}
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <img
              src={`${BASE}/assets/branding/Brand_Icon.svg`}
              alt="Slidi Icon"
              className="w-4 h-4 md:w-5 md:h-5 object-contain -translate-y-[0.5px]"
            />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
              Library
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-100 shrink-0">
          <button
            onClick={() => setActiveTab("local")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${
              activeTab === "local"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <HardDrive className="w-3 h-3" />
            Local
          </button>
          <button
            onClick={() => setActiveTab("cloud")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${
              activeTab === "cloud"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Cloud className="w-3 h-3" />
            Cloud
          </button>
        </div>

        {/* ── LOCAL TAB ── */}
        {activeTab === "local" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
            {/* Unsaved warning — shown when the editor has content not linked to any library session */}
            {mounted && generatedCode && !currentSessionId && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Unsaved presentation</p>
                    <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">
                      The current presentation is not in your library. It will be lost if you clear the editor.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { saveCurrentAsSession(); }}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                >
                  Save to Library
                </button>
              </div>
            )}
            {!mounted || sessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-40">
                <div className="w-16 h-16 rounded-[28px] bg-slate-50 flex items-center justify-center mb-6 shadow-inner border border-slate-100 overflow-hidden p-4">
                  <img src={`${BASE}/assets/branding/Brand_Icon.svg`} alt="" className="w-full h-full object-contain grayscale" />
                </div>
                <p className="text-slate-900 font-bold text-sm mb-1">No saved sessions</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Your last 20 presentations are saved in your browser automatically.
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <LocalSessionItem
                  key={session.id}
                  session={session}
                  editingId={editingId}
                  editName={editName}
                  setEditName={setEditName}
                  handleRename={handleRename}
                  handleStartEdit={handleStartEdit}
                  switchToSession={switchToSession}
                  onClose={onClose}
                  handleSaveToCloud={handleSaveToCloud}
                  savingToCloud={savingToCloud}
                  savedToCloud={savedToCloud}
                  cloudLinked={cloudLinked}
                  deleteSession={deleteSession}
                />
              ))
            )}
          </div>
        )}

        {/* ── CLOUD TAB ── */}
        {activeTab === "cloud" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {/* Guest mode banner */}
            {authMode === "guest" ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
                <Cloud className="w-10 h-10 text-slate-200 mb-4" />
                <p className="text-slate-700 font-bold text-sm mb-1">Guest mode</p>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                  Your presentations are stored locally only. Create an account to save to the cloud.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenAuth?.("login-key")}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    Login with Key
                  </button>
                  <button
                    onClick={() => onOpenAuth?.("entry")}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Create account
                  </button>
                </div>
              </div>
            ) : (
            <>
            {(cloudOpenError || cloudActionError) && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-4 py-3 rounded-xl">
                {cloudOpenError || cloudActionError}
              </div>
            )}
            {cloudLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 opacity-40">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                <p className="text-xs text-slate-400">Loading cloud presentations…</p>
              </div>
            ) : cloudEntries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-40">
                <Cloud className="w-10 h-10 text-slate-300 mb-4" />
                <p className="text-slate-900 font-bold text-sm mb-1">No cloud presentations</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Your presentations are automatically saved to the cloud as you work.
                </p>
              </div>
            ) : (
              cloudEntries.map((entry) => {
                const isConfirmingDelete = confirmDeleteId === entry.id;
                const isDeleting = deletingId === entry.id;
                const isSavingLocal = savingLocalId === entry.id;
                const isSavedLocal = savedLocalIds.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    className="bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 rounded-xl p-4 transition-all duration-300"
                    onClick={() => { if (isConfirmingDelete) setConfirmDeleteId(null); }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {entry.session_name || "Untitled"}
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1.5">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(new Date(entry.created_at).getTime())}
                        </div>
                      </div>
                      <Cloud className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Open — loads into editor and switches to it */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenCloud(entry); }}
                        disabled={openingCloudId === entry.id || isDeleting}
                        className="flex-1 h-9 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
                      >
                        {openingCloudId === entry.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Play className="w-3 h-3 fill-current" />
                        }
                        Open
                      </button>

                      {/* Save to Local — copies to local tab without switching */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveToLocal(entry); }}
                        disabled={isSavingLocal || isDeleting}
                        title="Save a copy to local library"
                        className={`w-9 h-9 flex items-center justify-center border rounded-lg transition-colors disabled:opacity-40 disabled:cursor-wait ${
                          isSavedLocal
                            ? "border-emerald-200 bg-emerald-50 text-emerald-500"
                            : "border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        {isSavingLocal
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : isSavedLocal
                          ? <Check className="w-3.5 h-3.5" />
                          : <Download className="w-3.5 h-3.5" />
                        }
                      </button>

                      {/* Delete — two-click confirm */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCloud(entry); }}
                        disabled={isDeleting}
                        title={isConfirmingDelete ? "Click again to confirm delete" : "Delete from cloud"}
                        className={`w-9 h-9 flex items-center justify-center border rounded-lg transition-colors disabled:opacity-40 disabled:cursor-wait ${
                          isConfirmingDelete
                            ? "border-red-300 bg-red-50 text-red-600 animate-pulse"
                            : "border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                        }`}
                      >
                        {isDeleting
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                    {isConfirmingDelete && (
                      <p className="text-[10px] text-red-500 font-bold mt-2 text-center animate-pulse">
                        Click delete again to confirm removal
                      </p>
                    )}
                  </div>
                );
              })
            )}
            </>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        {activeTab === "local" && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">
              Browser Storage
            </p>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(sessions.length / 20) * 100}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              {sessions.length} of 20 slots used
            </p>
          </div>
        )}

        {activeTab === "cloud" && mounted && authMode !== "guest" && (
          <div className="border-t border-slate-100 bg-slate-50/50 shrink-0">
            {authMode === "account" && userProfile ? (
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Signed in as</p>
                  <p className="text-[11px] font-bold text-slate-700">{userProfile.username}</p>
                </div>
                <button
                  onClick={() => setShowIdentityModal(true)}
                  className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Key
                </button>
              </div>
            ) : authMode === "cloud-anonymous" ? (
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Cloud access only</p>
                  <p className="text-[11px] text-slate-400">No account — data is tied to this key</p>
                </div>
                <button
                  onClick={() => onOpenAuth?.("entry")}
                  className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 transition-colors shrink-0 ml-2"
                >
                  Account
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowIdentityModal(true)}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                  <KeyRound className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Identity key</p>
                  <p className="text-[11px] font-mono text-slate-400 truncate">{shortKey}</p>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">Change</p>
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Identity modal — rendered at drawer z-level so Escape doesn't close both */}
      {showIdentityModal && (
        <IdentityModal
          onClose={() => setShowIdentityModal(false)}
          onIdentityChange={handleIdentityChange}
        />
      )}
    </>
  );
}

function LocalSessionItem({
  session,
  editingId,
  editName,
  setEditName,
  handleRename,
  handleStartEdit,
  switchToSession,
  onClose,
  handleSaveToCloud,
  savingToCloud,
  savedToCloud,
  cloudLinked,
  deleteSession
}: {
  session: SessionMeta;
  editingId: string | null;
  editName: string;
  setEditName: (n: string) => void;
  handleRename: (id: string) => void;
  handleStartEdit: (id: string, name: string) => void;
  switchToSession: (id: string) => void;
  onClose: () => void;
  handleSaveToCloud: (session: { id: string; name: string }) => void;
  savingToCloud: Set<string>;
  savedToCloud: Set<string>;
  cloudLinked: Set<string>;
  deleteSession: (id: string) => void;
}) {
  const currentSessionId = useSlidiStore((s) => s.currentSessionId);
  const [fullSession, setFullSession] = useState<Session | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        getSessionContent(session.id).then((res) => setFullSession(res || null));
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [session.id]);

  const isActive = session.id === currentSessionId;

  return (
    <div ref={containerRef} className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow relative group ${isActive ? "border-2 border-blue-500 ring-1 ring-blue-200" : "border border-slate-200"}`}>
      {isActive && (
        <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full z-10 shadow-sm flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Currently Open
        </div>
      )}
      {!isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm pointer-events-none">
          Open
        </div>
      )}
      {(() => {
        // fullSession not yet loaded from IndexedDB → show spinner
        if (fullSession === null) {
          return (
            <div className="w-full aspect-video bg-slate-100 flex flex-col items-center justify-center rounded-t-xl">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin mb-2" />
              <span className="text-xs text-slate-500 font-medium">Loading preview…</span>
            </div>
          );
        }
        // Fall back to the last non-empty history entry (handles SYNC-bug-corrupted sessions)
        const histIdx = fullSession.historyIndex ?? 0;
        const code = fullSession.history[histIdx]
          || [...fullSession.history].reverse().find(h => h)
          || "";
        return <ThumbnailPreview code={code} theme={fullSession.theme} />;
      })()}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {editingId === session.id ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(session.id)}
                  onBlur={() => handleRename(session.id)}
                  className="w-full text-sm font-bold text-slate-900 border-b border-blue-500 outline-none pb-0.5"
                />
                <button onClick={() => handleRename(session.id)}>
                  <Check className="w-4 h-4 text-green-600" />
                </button>
              </div>
            ) : (
              <h3
                className="text-sm font-bold text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                onDoubleClick={() => handleStartEdit(session.id, session.name)}
              >
                {session.name}
              </h3>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(session.createdAt)}
              </div>
              {fullSession && (
                <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: THEME_STYLES[fullSession.theme]?.accent }} />
                  {fullSession.theme}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => { switchToSession(session.id); onClose(); }}
            className="flex-1 h-9 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            Open
          </button>
          {/* Save to Cloud */}
          <button
            onClick={() => handleSaveToCloud(session)}
            disabled={savingToCloud.has(session.id) || !fullSession}
            title={cloudLinked.has(session.id) ? "Update cloud copy" : "Save to cloud"}
            className={`w-9 h-9 flex items-center justify-center border rounded-lg transition-colors disabled:opacity-40 disabled:cursor-wait ${
              savedToCloud.has(session.id)
                ? "border-emerald-200 bg-emerald-50 text-emerald-500"
                : cloudLinked.has(session.id)
                ? "border-blue-200 bg-blue-50 text-blue-500 hover:bg-blue-100"
                : "border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50"
            }`}
          >
            {savingToCloud.has(session.id) ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : savedToCloud.has(session.id) ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => handleStartEdit(session.id, session.name)}
            className="w-9 h-9 flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 rounded-lg transition-colors"
            title="Rename"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => deleteSession(session.id)}
            className="w-9 h-9 flex items-center justify-center border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
