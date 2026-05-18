"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSlidiStore } from "@/store/slidiStore";
import { mergeVersions } from "@/lib/ai/operationalTransform";
import { openDb } from "@/lib/idb";

// ------------------------------------------------------------------
// IndexedDB queue — stored in the existing slidi-db, offline-queue store
// ------------------------------------------------------------------

const QUEUE_STORE = "offline-queue";

interface QueueEntry {
  code: string;
  timestamp: number;
}

async function enqueue(db: IDBDatabase, entry: QueueEntry): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dequeueAll(db: IDBDatabase): Promise<Array<{ key: IDBValidKey; entry: QueueEntry }>> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const store = tx.objectStore(QUEUE_STORE);
    const results: Array<{ key: IDBValidKey; entry: QueueEntry }> = [];
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        results.push({ key: cursor.key, entry: cursor.value as QueueEntry });
        cursor.continue();
      } else {
        // Delete all queued entries
        const delTx = db.transaction(QUEUE_STORE, "readwrite");
        delTx.objectStore(QUEUE_STORE).clear();
        delTx.oncomplete = () => resolve(results);
        delTx.onerror = () => resolve(results); // still return what we have
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------

export interface ConflictState {
  local: string;
  remote: string;
  resolve: (choice: "local" | "remote") => void;
}

/**
 * Tracks online status and queues `pushVersion` calls in IndexedDB when offline.
 * On reconnect, replays queued operations in order.
 * If a conflict is detected (server has newer state), surfaces it via `conflict`.
 */
export function useOfflineQueue() {
  const { pushVersion } = useSlidiStore();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  // Open queue DB once
  useEffect(() => {
    openDb()
      .then((db) => { dbRef.current = db; })
      .catch(() => { /* fail silently — offline queue is best-effort */ });
  }, []);

  // Track online/offline
  useEffect(() => {
    function onOnline() { setIsOnline(true); }
    function onOffline() { setIsOnline(false); }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  /** Enqueue a code snapshot while offline */
  const queueVersion = useCallback(async (code: string) => {
    if (!dbRef.current) return;
    await enqueue(dbRef.current, { code, timestamp: Date.now() });
  }, []);

  /** Replay queued edits on reconnect, merging with the latest remote code */
  const replayQueue = useCallback(
    async (remoteCode: string, baseCode: string) => {
      if (!dbRef.current) return;
      const entries = await dequeueAll(dbRef.current);
      if (entries.length === 0) return;

      // Use the last queued entry as the local authoritative state
      const localCode = entries[entries.length - 1].entry.code;
      const result = mergeVersions(baseCode, localCode, remoteCode);

      if (!result.conflict) {
        pushVersion(result.code);
      } else {
        // Surface conflict for user resolution
        setConflict({
          local: result.local,
          remote: result.remote,
          resolve: (choice) => {
            pushVersion(choice === "local" ? result.local : result.remote);
            setConflict(null);
          },
        });
      }
    },
    [pushVersion]
  );

  return { isOnline, conflict, queueVersion, replayQueue };
}
