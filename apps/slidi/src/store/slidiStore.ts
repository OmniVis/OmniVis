import { create } from "zustand";
import { loadSessions, saveSessions, generateSessionName, MAX_SESSIONS, type Session, type SessionMeta } from "@/lib/sessions";
import { putSessionContent, deleteSessionContent, getSessionContent } from "@/lib/idb";

export type Provider = "openai" | "anthropic" | "gemini" | "adesso";
export type ThemeId = "minimal" | "dark" | "corporate" | "cyberpunk" | "modern" | "sunset" | "forest" | "blueprint" | "brutalist" | "custom";
export type AuthMode = "account" | "cloud-anonymous" | "guest" | "pending";

export interface UserProfile {
  username: string;
}

export interface Branding {
  id?: string;
  name: string;
  logoUrl?: string; // Base64 or URL
  display: "both" | "logo" | "name" | "none";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  type?: "pill" | "image";
  size?: "small" | "medium" | "large";
  sizePercentage?: number;
  padding?: number;
  isPublished?: boolean;
  authorName?: string;
}

export interface UserContext {
  role: string;
  department: string;
  language: string;
  customInstructions: string;
}

export interface ChatMessage {
  role: "user" | "system";
  content: string;
  isOutput?: boolean;
  isError?: boolean;
  isIncomplete?: boolean;
  incompleteSlideCount?: number;
  incompleteExpectedCount?: number;
  isLayoutWarning?: boolean;
  isOutlineReady?: boolean;
  isPlanResponse?: boolean;
  isPlanPairSummary?: boolean;
  /** Names of files attached to this user message — shown as pills in the chat bubble. */
  attachedFileNames?: string[];
}

export interface AttachedFile {
  name: string;
  markdown: string;
  /** Original file size in bytes */
  size: number;
}

export type ElementType = "icon" | "image" | "link" | "text" | "generic";

export interface SelectedElement {
  elementType: ElementType;
  /** Icon name, image src URL, link href, or text content */
  currentValue: string;
  /** Element bounding rect relative to the iframe viewport */
  rect: { top: number; left: number; width: number; height: number };
  tagName: string;
  xpath: string;
}

const HISTORY_CAP = 20;
const KEY_PREFIX = "slidi_api_key_";
const PROVIDER_KEY = "slidi_provider";
const THEME_KEY = "slidi_theme";
const HISTORY_KEY = "slidi_history";
const HISTORY_INDEX_KEY = "slidi_history_index";
const VERSION_ID_KEY = "slidi_version_id";
const ADESSO_MODEL_KEY = "slidi_adesso_model";
const BRANDING_KEY = "slidi_branding";
const NOTES_KEY = "slidi_notes";
const HISTORY_TIMESTAMPS_KEY = "slidi_history_timestamps";
const PRESENTATION_NAME_KEY = "slidi_presentation_name";
const AUTH_MODE_KEY = "slidi_auth_mode";
const USERNAME_KEY = "slidi_username";
const PLAN_MODE_KEY = "slidi_plan_mode";
const CHAT_MESSAGES_KEY = "slidi_chat_messages";
const CURRENT_SESSION_KEY = "slidi_current_session_id";
const USER_CONTEXT_KEY = "slidi_user_context";
const PRESENTATION_MODE_KEY = "slidi_presentation_mode";
const PREMIUM_MODE_KEY = "slidi_premium_mode";
const ACTIVE_PERSONA_KEY = "slidi_active_persona";
const DESIGN_BRIEF_KEY = "slidi_design_brief";
const ENGINE_VERSION_KEY = "slidi_engine_version";
const DEFAULT_ADESSO_MODEL = "gpt-4.1";

interface SlidiState {
  // BYOK — per-provider keys
  keys: Record<Provider, string>;
  apiKey: string;
  provider: Provider;
  setApiKey: (key: string, provider: Provider) => void;
  clearApiKey: () => void;

  // adesso AI Hub model selection
  adessoModel: string;
  setAdessoModel: (model: string) => void;

  // Theme
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  removeMessageAt: (index: number) => void;
  clearMessages: () => void;

  // Canvas — version history
  history: string[];
  historyTimestamps: number[];
  historyIndex: number;
  generatedCode: string;
  currentVersionId: string;
  pushVersion: (code: string) => void;
  undo: () => void;
  redo: () => void;
  setCurrentVersionId: (id: string) => void;

  // UI state
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;

  // Inspect mode (Highlight to Edit)
  inspectMode: boolean;
  setInspectMode: (v: boolean) => void;
  pendingEditContext: string | null;
  setPendingEditContext: (ctx: string | null) => void;

  // Visual editor — currently selected element (set by SandpackCanvas on sl-element-select)
  selectedElement: SelectedElement | null;
  setSelectedElement: (el: SelectedElement | null) => void;

  // Branding
  branding: Branding | null;
  setBranding: (branding: Branding | null) => void;

  // Presenter Notes
  notes: Record<number, string>;
  setNote: (index: number, text: string) => void;
  setNotes: (notes: Record<number, string>) => void;

  // Plan cache — in-memory only, NOT persisted to localStorage
  cachedPlan: string | null;
  setCachedPlan: (plan: string | null) => void;

  // Streaming preview — cleared after generation completes
  streamingPreview: string | null;
  setStreamingPreview: (code: string | null) => void;

  // Slide tracker — updated by SrcdocPreview on sl_slide_change
  currentSlide: number;
  totalSlides: number;
  setCurrentSlide: (n: number) => void;
  setTotalSlides: (n: number) => void;
  broadcastGoto: (target: number) => void;

  // Presentation name — shown in header, editable, auto-extracted from code
  presentationName: string;
  setPresentationName: (name: string) => void;

  // Plan Mode — planMode persisted; isPlanModeActive is session-only
  planMode: boolean;
  isPlanModeActive: boolean;
  setPlanMode: (v: boolean) => void;
  setIsPlanModeActive: (v: boolean) => void;

  // User Context (Custom Instructions) — persisted
  userContext: UserContext | null;
  setUserContext: (ctx: UserContext | null) => void;

  // Presentation Mode — persisted
  presentationMode: "corporate" | "private";
  setPresentationMode: (mode: "corporate" | "private") => void;

  // Premium Presentation Mode (higher quality, longer gen time)
  premiumPresentationMode: boolean;
  setPremiumPresentationMode: (mode: boolean) => void;

  // Design Persona — persisted
  activePersona: string | null;
  setActivePersona: (id: string | null) => void;

  // Generation Engine Version — persisted
  engineVersion: "v0" | "v1" | "v2" | "v3" | "v4";
  setEngineVersion: (v: "v0" | "v1" | "v2" | "v3" | "v4") => void;

  // Design Brief — persisted
  designBrief: string | null;
  setDesignBrief: (brief: string | null) => void;

  // Auth
  authMode: AuthMode;
  userProfile: UserProfile | null;
  setAuthMode: (mode: "account" | "cloud-anonymous" | "guest") => void;
  setUserProfile: (profile: UserProfile | null) => void;
  /** Clear key + profile, reset to pending so AuthModal shows again. */
  logout: () => void;

  // Attached files — ephemeral, cleared after generation; never persisted
  attachedFiles: AttachedFile[];
  addAttachedFile: (file: AttachedFile) => void;
  removeAttachedFile: (name: string) => void;
  clearAttachedFiles: () => void;

  // Sessions — list of saved presentation snapshots
  sessions: SessionMeta[];
  currentSessionId: string | null; // ID of the session currently loaded in the editor
  saveCurrentAsSession: () => void;
  /** Import code from an external source (e.g. cloud) as a new local session without switching. */
  importCloudSession: (code: string, name: string, cloudVersionId?: string) => void;
  /** Load a cloud presentation directly into the editor without saving it to the local library. */
  loadCloudPresentation: (code: string, name: string, cloudVersionId?: string) => void;
  switchToSession: (id: string) => Promise<void>;
  renameSession: (id: string, name: string) => void;
  deleteSession: (id: string) => void;
  clearPresentation: () => void;
}

function loadFromStorage(): {
  keys: Record<Provider, string>;
  apiKey: string;
  provider: Provider;
  theme: ThemeId;
  history: string[];
  historyTimestamps: number[];
  historyIndex: number;
  generatedCode: string;
  currentVersionId: string;
  adessoModel: string;
  branding: Branding | null;
  notes: Record<number, string>;
  presentationName: string;
  authMode: AuthMode;
  userProfile: UserProfile | null;
  planMode: boolean;
  userContext: UserContext | null;
  presentationMode: "corporate" | "private";
  premiumPresentationMode: boolean;
  messages: ChatMessage[];
  currentSessionId: string | null;
  activePersona: string | null;
  designBrief: string | null;
  engineVersion: "v0" | "v1" | "v2" | "v3" | "v4";
} {
  if (typeof window === "undefined") {
    return {
      keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
      apiKey: "",
      provider: "openai",
      theme: "minimal",
      history: [],
      historyTimestamps: [],
      historyIndex: -1,
      generatedCode: "",
      currentVersionId: "",
      adessoModel: DEFAULT_ADESSO_MODEL,
      branding: null,
      notes: {},
      presentationName: "",
      authMode: "pending",
      userProfile: null,
      planMode: false,
      userContext: null,
      presentationMode: "corporate",
      premiumPresentationMode: false,
      messages: [],
      currentSessionId: null,
      activePersona: null,
      designBrief: null,
      engineVersion: "v4",
    };
  }

  try {
    // Migrate renamed providers so stale localStorage values don't crash the app
    const PROVIDER_MIGRATIONS: Record<string, Provider> = { groq: "openai", cerebras: "openai", openrouter: "openai", together: "openai" };
    const rawProvider = localStorage.getItem(PROVIDER_KEY) ?? "openai";
    const provider = (PROVIDER_MIGRATIONS[rawProvider] ?? rawProvider) as Provider;
    if (PROVIDER_MIGRATIONS[rawProvider]) localStorage.setItem(PROVIDER_KEY, provider);
    const keys: Record<Provider, string> = {
      openai: localStorage.getItem(`${KEY_PREFIX}openai`) ?? "",
      anthropic: localStorage.getItem(`${KEY_PREFIX}anthropic`) ?? "",
      gemini: localStorage.getItem(`${KEY_PREFIX}gemini`) ?? "",
      adesso: localStorage.getItem(`${KEY_PREFIX}adesso`) ?? "",
    };

    // Migrate legacy single-key storage
    const legacyKey = localStorage.getItem("slidi_api_key");
    if (legacyKey && !keys[provider]) {
      keys[provider] = legacyKey;
      localStorage.setItem(`${KEY_PREFIX}${provider}`, legacyKey);
      localStorage.removeItem("slidi_api_key");
    }

    const theme = (localStorage.getItem(THEME_KEY) as ThemeId) ?? "minimal";

    let history: string[] = [];
    let historyIndex = -1;
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) history = JSON.parse(stored);
    const storedIdx = localStorage.getItem(HISTORY_INDEX_KEY);
    if (storedIdx !== null) historyIndex = parseInt(storedIdx, 10);

    let historyTimestamps: number[] = [];
    const storedTs = localStorage.getItem(HISTORY_TIMESTAMPS_KEY);
    if (storedTs) historyTimestamps = JSON.parse(storedTs);
    // Guard: if timestamps array is shorter than history (e.g. loaded from old data), pad with 0
    while (historyTimestamps.length < history.length) historyTimestamps.push(0);

    const generatedCode = historyIndex >= 0 && history[historyIndex] ? history[historyIndex] : "";
    const currentVersionId = localStorage.getItem(VERSION_ID_KEY) ?? "";
    const adessoModel = localStorage.getItem(ADESSO_MODEL_KEY) ?? DEFAULT_ADESSO_MODEL;

    let branding: Branding | null = null;
    const storedBranding = localStorage.getItem(BRANDING_KEY);
    if (storedBranding) branding = JSON.parse(storedBranding);

    let notes: Record<number, string> = {};
    const storedNotes = localStorage.getItem(NOTES_KEY);
    if (storedNotes) notes = JSON.parse(storedNotes);

    const presentationName = localStorage.getItem(PRESENTATION_NAME_KEY) ?? "";

    const authMode = (localStorage.getItem(AUTH_MODE_KEY) as AuthMode) ?? "pending";
    const storedUsername = localStorage.getItem(USERNAME_KEY);
    const userProfile: UserProfile | null = storedUsername ? { username: storedUsername } : null;

    const planMode = localStorage.getItem(PLAN_MODE_KEY) === "true";

    let messages: ChatMessage[] = [];
    const storedMessages = localStorage.getItem(CHAT_MESSAGES_KEY);
    if (storedMessages) {
      try { messages = JSON.parse(storedMessages); } catch { /* ignore */ }
    }

    let userContext: UserContext | null = null;
    const storedUserContext = localStorage.getItem(USER_CONTEXT_KEY);
    if (storedUserContext) userContext = JSON.parse(storedUserContext);

    const rawPresentationMode = localStorage.getItem(PRESENTATION_MODE_KEY);
    const presentationMode: "corporate" | "private" =
      rawPresentationMode === "private" ? "private" : "corporate";

    const premiumPresentationMode = localStorage.getItem(PREMIUM_MODE_KEY) === "true";

    const activePersona: string | null = localStorage.getItem(ACTIVE_PERSONA_KEY) ?? null;
    const designBrief: string | null = localStorage.getItem(DESIGN_BRIEF_KEY) ?? null;

    const rawEngineVersion = localStorage.getItem(ENGINE_VERSION_KEY);
    const engineVersion: "v0" | "v1" | "v2" | "v3" | "v4" = (rawEngineVersion === "v0" || rawEngineVersion === "v1" || rawEngineVersion === "v2" || rawEngineVersion === "v3" || rawEngineVersion === "v4") ? rawEngineVersion : "v4";

    // Restore active session ID — validate against the current sessions list so
    // stale IDs (e.g. after a session was deleted) don't leave things in a broken state.
    const sessions = loadSessions();
    const storedSessionId = localStorage.getItem(CURRENT_SESSION_KEY);
    const currentSessionId: string | null = storedSessionId && sessions.some((s) => s.id === storedSessionId)
      ? storedSessionId
      : null;

    return { keys, apiKey: keys[provider], provider, theme, history, historyTimestamps, historyIndex, generatedCode, currentVersionId, adessoModel, branding, notes, presentationName, authMode, userProfile, planMode, userContext, presentationMode, premiumPresentationMode, messages, currentSessionId, activePersona, designBrief, engineVersion };
  } catch (err) {
    console.error("Failed to load from storage (blocked?):", err);
    return {
      keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
      apiKey: "",
      provider: "openai",
      theme: "minimal",
      history: [],
      historyTimestamps: [],
      historyIndex: -1,
      generatedCode: "",
      currentVersionId: "",
      adessoModel: DEFAULT_ADESSO_MODEL,
      branding: null,
      notes: {},
      presentationName: "",
      authMode: "pending",
      userProfile: null,
      planMode: false,
      userContext: null,
      presentationMode: "corporate",
      premiumPresentationMode: false,
      messages: [],
      currentSessionId: null,
      activePersona: null,
      designBrief: null,
      engineVersion: "v4",
    };
  }
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

export const useSlidiStore = create<SlidiState>()((set, get) => ({
  ...loadFromStorage(),

  // Attached files — ephemeral, not loaded from storage
  attachedFiles: [],
  addAttachedFile: (file) =>
    set((state) => ({ attachedFiles: [...state.attachedFiles, file] })),
  removeAttachedFile: (name) =>
    set((state) => ({ attachedFiles: state.attachedFiles.filter((f) => f.name !== name) })),
  clearAttachedFiles: () => set({ attachedFiles: [] }),

  setApiKey: (key, provider) => {
    localStorage.setItem(`${KEY_PREFIX}${provider}`, key);
    localStorage.setItem(PROVIDER_KEY, provider);
    set((state) => ({
      keys: { ...state.keys, [provider]: key },
      apiKey: key,
      provider,
    }));
  },

  clearApiKey: () => {
    (["openai", "anthropic", "gemini", "adesso"] as Provider[]).forEach((p) => {
      localStorage.removeItem(`${KEY_PREFIX}${p}`);
    });
    localStorage.removeItem(PROVIDER_KEY);
    set({ keys: { openai: "", anthropic: "", gemini: "", adesso: "" }, apiKey: "", provider: "openai" });
  },

  setAdessoModel: (model) => {
    localStorage.setItem(ADESSO_MODEL_KEY, model);
    set({ adessoModel: model });
  },

  setTheme: (id) => {
    localStorage.setItem(THEME_KEY, id);
    set({ theme: id });
  },

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  removeMessageAt: (index) =>
    set((state) => ({ messages: state.messages.filter((_, i) => i !== index) })),
  clearMessages: () => {
    try { localStorage.removeItem(CHAT_MESSAGES_KEY); } catch { /* ignore */ }
    set({ messages: [], cachedPlan: null });
  },

  setEngineVersion: (v) => {
    localStorage.setItem(ENGINE_VERSION_KEY, v);
    set({ engineVersion: v });
  },

  setPresentationName: (name: string) => {
    localStorage.setItem(PRESENTATION_NAME_KEY, name);
    set({ presentationName: name });
    const { currentSessionId, sessions, history, historyIndex, historyTimestamps, messages, theme, cachedPlan, currentVersionId, notes } = get();
    if (currentSessionId) {
      const meta = sessions.find((m) => m.id === currentSessionId);
      if (meta) {
        const updatedMeta = sessions.map((m) => m.id === currentSessionId ? { ...m, name } : m);
        saveSessions(updatedMeta);
        set({ sessions: updatedMeta });
        putSessionContent({
          id: currentSessionId,
          name,
          createdAt: meta.createdAt,
          history,
          historyTimestamps: historyTimestamps ?? [],
          historyIndex,
          messages,
          theme,
          cachedPlan,
          currentVersionId,
          notes,
        });
      }
    }
  },

  pushVersion: (code) => {
    const { history, historyIndex, historyTimestamps, presentationName, sessions } = get();
    // Truncate any redo history ahead of current index
    const base = history.slice(0, historyIndex + 1);
    const baseTs = (historyTimestamps ?? []).slice(0, historyIndex + 1);
    const next = [...base, code].slice(-HISTORY_CAP);
    const nextTs = [...baseTs, Date.now()].slice(-HISTORY_CAP);
    const nextIndex = next.length - 1;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    localStorage.setItem(HISTORY_INDEX_KEY, String(nextIndex));
    localStorage.setItem(HISTORY_TIMESTAMPS_KEY, JSON.stringify(nextTs));
    // Auto-name on first push if no name set yet
    let nameUpdate: { presentationName: string } | Record<string, never> = {};
    if (!presentationName) {
      const defaultName = generateSessionName(sessions);
      localStorage.setItem(PRESENTATION_NAME_KEY, defaultName);
      nameUpdate = { presentationName: defaultName };
    }
    set({ history: next, historyTimestamps: nextTs, historyIndex: nextIndex, generatedCode: code, ...nameUpdate });

    // Sync to active session if exists — otherwise auto-create one so the
    // library always has an entry as soon as the first generation completes.
    const s = get();
    if (s.currentSessionId) {
      const meta = s.sessions.find((m) => m.id === s.currentSessionId);
      if (meta) {
        putSessionContent({
          id: meta.id,
          name: meta.name,
          createdAt: meta.createdAt,
          history: next,
          historyTimestamps: nextTs,
          historyIndex: nextIndex,
          messages: s.messages,
          theme: s.theme,
          cachedPlan: s.cachedPlan,
          currentVersionId: s.currentVersionId,
          notes: s.notes,
        });
        saveSessions(s.sessions);
      }
    } else {
      // No active session — create one so the library is immediately populated.
      const sessionId = generateUUID();
      const name = s.presentationName || generateSessionName(s.sessions);
      const newMeta: SessionMeta = { id: sessionId, name, createdAt: Date.now() };
      const fullSession: Session = {
        id: sessionId,
        name,
        createdAt: newMeta.createdAt,
        history: next,
        historyTimestamps: nextTs,
        historyIndex: nextIndex,
        messages: s.messages,
        theme: s.theme,
        cachedPlan: s.cachedPlan,
        currentVersionId: s.currentVersionId,
        notes: s.notes,
      };
      const updatedMeta = [newMeta, ...s.sessions].slice(0, MAX_SESSIONS);
      saveSessions(updatedMeta);
      putSessionContent(fullSession);
      localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
      set({ sessions: updatedMeta, currentSessionId: sessionId });
    }
  },

  undo: () => {
    const { history, historyIndex, currentSessionId, sessions, historyTimestamps, messages, theme, cachedPlan, currentVersionId, notes } = get();
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    localStorage.setItem(HISTORY_INDEX_KEY, String(nextIndex));
    set({ historyIndex: nextIndex, generatedCode: history[nextIndex] });
    // Sync the updated index back to IndexedDB so gallery thumbnails stay accurate
    if (currentSessionId) {
      const meta = sessions.find((m) => m.id === currentSessionId);
      if (meta) putSessionContent({ id: meta.id, name: meta.name, createdAt: meta.createdAt, history, historyTimestamps: historyTimestamps ?? [], historyIndex: nextIndex, messages, theme, cachedPlan, currentVersionId, notes });
    }
  },

  redo: () => {
    const { history, historyIndex, currentSessionId, sessions, historyTimestamps, messages, theme, cachedPlan, currentVersionId, notes } = get();
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    localStorage.setItem(HISTORY_INDEX_KEY, String(nextIndex));
    set({ historyIndex: nextIndex, generatedCode: history[nextIndex] });
    if (currentSessionId) {
      const meta = sessions.find((m) => m.id === currentSessionId);
      if (meta) putSessionContent({ id: meta.id, name: meta.name, createdAt: meta.createdAt, history, historyTimestamps: historyTimestamps ?? [], historyIndex: nextIndex, messages, theme, cachedPlan, currentVersionId, notes });
    }
  },

  setCurrentVersionId: (id) => {
    localStorage.setItem(VERSION_ID_KEY, id);
    set({ currentVersionId: id });
  },

  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),

  inspectMode: false,
  setInspectMode: (v) => set({ inspectMode: v }),
  pendingEditContext: null,
  setPendingEditContext: (ctx) => set({ pendingEditContext: ctx }),

  selectedElement: null,
  setSelectedElement: (el) => set({ selectedElement: el }),

  branding: null,
  setBranding: (branding) => {
    if (branding) localStorage.setItem(BRANDING_KEY, JSON.stringify(branding));
    else localStorage.removeItem(BRANDING_KEY);
    set({ branding });
  },

  notes: {},
  setNote: (index, text) => {
    set((state) => {
      const notes = { ...state.notes, [index]: text };
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      return { notes };
    });
  },
  setNotes: (notes) => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    set({ notes });
  },

  cachedPlan: null,
  setCachedPlan: (plan) => set({ cachedPlan: plan }),

  streamingPreview: null,
  setStreamingPreview: (code) => set({ streamingPreview: code }),

  currentSlide: 0,
  totalSlides: 1,
  setCurrentSlide: (n) => set({ currentSlide: n }),
  setTotalSlides: (n) => set({ totalSlides: n }),
  broadcastGoto: (target: number) => {
    if (typeof BroadcastChannel === "undefined") return;
    const { currentVersionId } = useSlidiStore.getState();
    const channel = currentVersionId || "slidi-editor";
    const bc = new BroadcastChannel(channel);
    bc.postMessage({ type: "SLIDI_GOTO_SLIDE", target });
    bc.close();
  },

  setAuthMode: (mode) => {
    localStorage.setItem(AUTH_MODE_KEY, mode);
    set({ authMode: mode });
  },

  setUserProfile: (profile) => {
    if (profile) localStorage.setItem(USERNAME_KEY, profile.username);
    else localStorage.removeItem(USERNAME_KEY);
    set({ userProfile: profile });
  },

  logout: () => {
    localStorage.removeItem("slidi_user_id");
    localStorage.removeItem(AUTH_MODE_KEY);
    localStorage.removeItem(USERNAME_KEY);
    set({ authMode: "pending", userProfile: null });
  },

  isPlanModeActive: false,
  setIsPlanModeActive: (v) => set({ isPlanModeActive: v }),

  setPlanMode: (v) => {
    localStorage.setItem(PLAN_MODE_KEY, String(v));
    // Turning off mid-conversation also resets the active flag
    set({ planMode: v, ...(v === false ? { isPlanModeActive: false } : {}) });
  },

  setUserContext: (ctx) => {
    if (ctx) localStorage.setItem(USER_CONTEXT_KEY, JSON.stringify(ctx));
    else localStorage.removeItem(USER_CONTEXT_KEY);
    set({ userContext: ctx });
  },

  setPresentationMode: (mode) => {
    localStorage.setItem(PRESENTATION_MODE_KEY, mode);
    set({ presentationMode: mode });
  },

  setPremiumPresentationMode: (mode) => {
    localStorage.setItem(PREMIUM_MODE_KEY, String(mode));
    set({ premiumPresentationMode: mode });
  },

  setActivePersona: (id) => {
    if (id) {
      localStorage.setItem(ACTIVE_PERSONA_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PERSONA_KEY);
    }
    set({ activePersona: id });
  },

  setDesignBrief: (brief) => {
    if (brief && brief.trim()) {
      localStorage.setItem(DESIGN_BRIEF_KEY, brief);
    } else {
      localStorage.removeItem(DESIGN_BRIEF_KEY);
    }
    set({ designBrief: brief });
  },

  sessions: typeof window !== "undefined" ? loadSessions() : [],

  saveCurrentAsSession: () => {
    const s = get();
    if (!s.generatedCode) return;
    const sessions = s.sessions;
    const sessionId = generateUUID();
    const name = s.presentationName || generateSessionName(sessions);
    const newMeta: SessionMeta = { id: sessionId, name, createdAt: Date.now() };
    const fullSession: Session = {
      id: sessionId,
      name,
      createdAt: newMeta.createdAt,
      history: s.history,
      historyTimestamps: s.historyTimestamps ?? [],
      historyIndex: s.historyIndex,
      messages: s.messages,
      theme: s.theme,
      cachedPlan: s.cachedPlan,
      currentVersionId: s.currentVersionId,
      notes: s.notes,
    };
    const updatedMeta = [newMeta, ...sessions].slice(0, MAX_SESSIONS);
    saveSessions(updatedMeta);
    putSessionContent(fullSession);
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
    set({ sessions: updatedMeta, currentSessionId: sessionId });
  },

  importCloudSession: (code: string, name: string, cloudVersionId?: string) => {
    const s = get();
    const id = generateUUID();
    const now = Date.now();
    const meta: SessionMeta = { id, name, createdAt: now };
    const session: Session = {
      id,
      name,
      createdAt: now,
      history: [code],
      historyTimestamps: [now],
      historyIndex: 0,
      messages: [],
      theme: s.theme,
      cachedPlan: null,
      currentVersionId: cloudVersionId ?? "",
      notes: {},
    };
    const updatedMeta = [meta, ...s.sessions].slice(0, MAX_SESSIONS);
    saveSessions(updatedMeta);
    putSessionContent(session);
    set({ sessions: updatedMeta });
  },

  loadCloudPresentation: (code: string, name: string, cloudVersionId?: string) => {
    const s = get();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([code]));
    localStorage.setItem(HISTORY_INDEX_KEY, "0");
    if (cloudVersionId) localStorage.setItem(VERSION_ID_KEY, cloudVersionId);
    else localStorage.removeItem(VERSION_ID_KEY);
    localStorage.setItem(HISTORY_TIMESTAMPS_KEY, JSON.stringify([Date.now()]));
    localStorage.setItem(PRESENTATION_NAME_KEY, name);
    localStorage.removeItem(CURRENT_SESSION_KEY);

    set({
      history: [code],
      historyTimestamps: [Date.now()],
      historyIndex: 0,
      presentationName: name,
      generatedCode: code,
      messages: [],
      theme: s.theme,
      cachedPlan: null,
      currentVersionId: cloudVersionId ?? "",
      notes: {},
      currentSlide: 0,
      totalSlides: 1,
      streamingPreview: null,
      inspectMode: false,
      pendingEditContext: null,
      selectedElement: null,
      currentSessionId: null,
    });
  },

  switchToSession: async (id: string) => {
    const meta = get().sessions.find((m) => m.id === id);
    if (!meta) return;
    const session = await getSessionContent(id);
    const generatedCode = session && session.historyIndex >= 0 && session.history[session.historyIndex]
      ? session.history[session.historyIndex]
      : "";
    if (session) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(session.history));
      localStorage.setItem(HISTORY_INDEX_KEY, String(session.historyIndex));
      localStorage.setItem(VERSION_ID_KEY, session.currentVersionId);
      localStorage.setItem(NOTES_KEY, JSON.stringify(session.notes));
      localStorage.setItem(HISTORY_TIMESTAMPS_KEY, JSON.stringify(session.historyTimestamps ?? []));
    }
    localStorage.setItem(PRESENTATION_NAME_KEY, meta.name);
    localStorage.setItem(CURRENT_SESSION_KEY, id);
    set({
      history: session?.history ?? [],
      historyTimestamps: session?.historyTimestamps ?? [],
      historyIndex: session?.historyIndex ?? -1,
      presentationName: meta.name,
      generatedCode,
      messages: session?.messages ?? [],
      theme: session?.theme ?? "minimal",
      cachedPlan: session?.cachedPlan ?? null,
      currentVersionId: session?.currentVersionId ?? "",
      notes: session?.notes ?? {},
      currentSlide: 0,
      totalSlides: 1,
      streamingPreview: null,
      inspectMode: false,
      pendingEditContext: null,
      selectedElement: null,
      currentSessionId: id,
    });
  },

  renameSession: (id: string, name: string) => {
    const { currentSessionId } = get();
    const updated = get().sessions.map((s) => s.id === id ? { ...s, name } : s);
    saveSessions(updated);
    const extra = currentSessionId === id ? { presentationName: name } : {};
    if (currentSessionId === id) localStorage.setItem(PRESENTATION_NAME_KEY, name);
    set({ sessions: updated, ...extra });
  },

  deleteSession: (id: string) => {
    const updated = get().sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    deleteSessionContent(id);
    set({ sessions: updated });
  },

  clearPresentation: () => {
    const s = get();
    if (s.generatedCode) {
      const sessions = s.sessions;
      const snapshot = {
        history: s.history,
        historyTimestamps: s.historyTimestamps ?? [],
        historyIndex: s.historyIndex,
        messages: s.messages,
        theme: s.theme,
        cachedPlan: s.cachedPlan,
        currentVersionId: s.currentVersionId,
        notes: s.notes,
      };
      let updatedMeta: SessionMeta[];
      if (s.currentSessionId && sessions.some((m) => m.id === s.currentSessionId)) {
        updatedMeta = sessions.map((m) => m);
        const existing = sessions.find((m) => m.id === s.currentSessionId)!;
        putSessionContent({ ...existing, ...snapshot });
      } else {
        const id = generateUUID();
        const name = s.presentationName || generateSessionName(sessions);
        const newMeta: SessionMeta = { id, name, createdAt: Date.now() };
        const fullSession: Session = { id, name, createdAt: newMeta.createdAt, ...snapshot };
        updatedMeta = [newMeta, ...sessions].slice(0, MAX_SESSIONS);
        putSessionContent(fullSession);
      }
      saveSessions(updatedMeta);
      set({ sessions: updatedMeta });
    }

    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(HISTORY_INDEX_KEY);
    localStorage.removeItem(VERSION_ID_KEY);
    localStorage.removeItem(NOTES_KEY);
    localStorage.removeItem(HISTORY_TIMESTAMPS_KEY);
    localStorage.removeItem(PRESENTATION_NAME_KEY);
    localStorage.removeItem(CURRENT_SESSION_KEY);
    set({
      messages: [],
      history: [],
      historyTimestamps: [],
      historyIndex: -1,
      generatedCode: "",
      currentVersionId: "",
      presentationName: "",
      cachedPlan: null,
      streamingPreview: null,
      notes: {},
      currentSlide: 0,
      totalSlides: 1,
      inspectMode: false,
      pendingEditContext: null,
      selectedElement: null,
      currentSessionId: null,
    });
  },
}));

if (typeof window !== "undefined") {
  // Persist chat messages to localStorage whenever they change
  useSlidiStore.subscribe((state, prev) => {
    if (state.messages !== prev.messages) {
      try {
        localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(state.messages));
      } catch { /* quota exceeded — silently skip */ }
    }
  });

  if (typeof window.addEventListener === "function") {
    window.addEventListener("storage", (e) => {
      // Cross-tab sync for notes (e.g. presenter window updating notes or editor switching sessions)
      if (e.key === "slidi_notes") {
        try {
          const notes = e.newValue ? JSON.parse(e.newValue) : {};
          useSlidiStore.setState({ notes });
        } catch (err) {
          // ignore invalid json
        }
      }
    });
  }
}
