// Version History Store
// Stores diagram snapshots in IndexedDB for timeline browsing

import { derived, get, writable } from 'svelte/store';

interface HistoryEntry {
  id: string;
  timestamp: number;
  code: string;
  mermaid?: string;
  label: string;
}

const STORAGE_KEY = 'graphi-history';
const MAX_ENTRIES = 100;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadEntries(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function persistEntries(entries: HistoryEntry[]): void {
  try {
    // Keep only the most recent entries
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage might be full — silently fail
  }
}

// Svelte stores
export const historyEntries = writable<HistoryEntry[]>(loadEntries());
export const historyIndex = writable<number>(loadEntries().length - 1);
export const selectedEntryId = writable<string | null>(null);

export const canUndo = derived(historyIndex, ($index) => $index > 0);
export const canRedo = derived(
  [historyIndex, historyEntries],
  ([$index, $entries]) => $index < $entries.length - 1
);

// Track the last saved code to avoid duplicate entries
let lastSavedCode = '';

export function addHistoryEntry(code: string, label?: string, mermaid?: string): void {
  if (!code.trim() || code === lastSavedCode) return;
  lastSavedCode = code;

  const entry: HistoryEntry = {
    code,
    id: generateId(),
    label: label || formatTimeLabel(new Date()),
    mermaid,
    timestamp: Date.now()
  };

  historyEntries.update((entries) => {
    const index = get(historyIndex);
    // Truncate future if we are in the middle of the stack
    const past = entries.slice(0, index + 1);
    const updated = [...past, entry].slice(-MAX_ENTRIES);

    persistEntries(updated);
    historyIndex.set(updated.length - 1);
    return updated;
  });
}

export function undo(): { code: string; mermaid?: string } | null {
  const index = get(historyIndex);
  if (index > 0) {
    historyIndex.update((i) => i - 1);
    const entry = get(historyEntries)[index - 1];
    return { code: entry.code, mermaid: entry.mermaid };
  }
  return null;
}

export function redo(): { code: string; mermaid?: string } | null {
  const index = get(historyIndex);
  const entries = get(historyEntries);
  if (index < entries.length - 1) {
    historyIndex.update((i) => i + 1);
    const entry = entries[index + 1];
    return { code: entry.code, mermaid: entry.mermaid };
  }
  return null;
}

export function removeHistoryEntry(id: string): void {
  historyEntries.update((entries) => {
    const updated = entries.filter((e) => e.id !== id);
    persistEntries(updated);
    return updated;
  });
}

export function clearHistory(): void {
  historyEntries.set([]);
  localStorage.removeItem(STORAGE_KEY);
}

const AUTO_SAVE_INTERVAL_KEY = 'graphi_autosave_interval';
const AUTO_SAVE_ENABLED_KEY = 'graphi_autosave_enabled';
const DEFAULT_INTERVAL_MS = 30_000;

export function getAutoSaveInterval(): number {
  const stored = localStorage.getItem(AUTO_SAVE_INTERVAL_KEY);
  return stored ? parseInt(stored, 10) : DEFAULT_INTERVAL_MS;
}

export function setAutoSaveInterval(ms: number): void {
  localStorage.setItem(AUTO_SAVE_INTERVAL_KEY, String(ms));
}

export function getAutoSaveEnabled(): boolean {
  const stored = localStorage.getItem(AUTO_SAVE_ENABLED_KEY);
  return stored === null ? true : stored === 'true';
}

export function setAutoSaveEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_SAVE_ENABLED_KEY, String(enabled));
}

export function getEntryById(id: string): HistoryEntry | undefined {
  return get(historyEntries).find((e) => e.id === id);
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Auto-save: debounced, call from the editor
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoSave(code: string, mermaid?: string): void {
  if (!getAutoSaveEnabled()) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    addHistoryEntry(code, 'Auto-save', mermaid);
  }, getAutoSaveInterval());
}

export type { HistoryEntry };
