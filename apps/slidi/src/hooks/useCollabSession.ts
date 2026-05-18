"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSlidiStore } from "@/store/slidiStore";
import { getUserId } from "@/lib/userId";
import type { CollaboratorInfo } from "@/store/slidiStore";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// Override the WS endpoint in development via NEXT_PUBLIC_COLLAB_WS_URL.
// In production, NGINX proxies {basePath}/collab → the sidecar.
const COLLAB_WS_OVERRIDE = process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "";

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_MS = 1_000;

interface UseCollabSessionOptions {
  /** UUID of the published presentation to join */
  presentationId: string;
  /** Whether the collab session should be active */
  enabled: boolean;
}

/**
 * Manages the WebSocket connection to the collab sidecar.
 *
 * - On connect: sends the current local code to the sidecar (SYNC source of truth).
 * - On incoming PATCH: applies the remote code via `pushVersion` without re-emitting.
 * - On incoming PRESENCE: updates `collaborators` in the Zustand store.
 * - Reconnects with exponential backoff on unintended disconnection.
 */
export function useCollabSession({ presentationId, enabled }: UseCollabSessionOptions) {
  const { generatedCode, pushVersion, setCollaborators, setCollabActive } = useSlidiStore();
  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingRemote = useRef(false);
  const enabledRef = useRef(enabled);
  const presentationIdRef = useRef(presentationId);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { presentationIdRef.current = presentationId; }, [presentationId]);

  // Emit the current local code to the sidecar
  const sendPatch = useCallback((code: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "PATCH", code }));
    }
  }, []);

  // Subscribe to store changes and broadcast patches (skip when applying a remote patch)
  const generatedCodeRef = useRef(generatedCode);
  useEffect(() => {
    generatedCodeRef.current = generatedCode;
  }, [generatedCode]);

  // Broadcast local edits
  useEffect(() => {
    if (!enabled || isApplyingRemote.current) return;
    sendPatch(generatedCode);
  // We intentionally only react to generatedCode, not sendPatch (stable ref)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedCode, enabled]);

  const connect = useCallback(async () => {
    if (!enabledRef.current || !presentationIdRef.current) return;

    // Fetch a short-lived JWT from the Next.js API
    let token: string;
    try {
      const res = await fetch(`${BASE}/api/collab/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentationId: presentationIdRef.current,
          userId: getUserId(),
          username: useSlidiStore.getState().userProfile?.username ?? undefined,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { token?: string };
      if (!data.token) return;
      token = data.token;
    } catch {
      return;
    }

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = COLLAB_WS_OVERRIDE
      ? `${COLLAB_WS_OVERRIDE}?token=${token}&presentationId=${presentationIdRef.current}`
      : `${proto}//${window.location.host}${BASE}/collab?token=${token}&presentationId=${presentationIdRef.current}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptsRef.current = 0;
      setCollabActive(true);
    };

    ws.onmessage = (event) => {
      let msg: unknown;
      try { msg = JSON.parse(event.data as string); } catch { return; }
      if (typeof msg !== "object" || msg === null) return;
      const m = msg as Record<string, unknown>;

      switch (m.type) {
        case "SYNC": {
          if (typeof m.code !== "string") break;
          if (m.code === "") {
            // New empty room — we are the first joiner.
            // Seed it with our code so peers who join later receive it via SYNC.
            if (generatedCodeRef.current) sendPatch(generatedCodeRef.current);
          } else if (m.code !== generatedCodeRef.current) {
            // Room already has content (another peer was here first) — apply it.
            isApplyingRemote.current = true;
            pushVersion(m.code);
            isApplyingRemote.current = false;
          }
          break;
        }
        case "PATCH": {
          // Guard: never apply an empty patch — it would wipe the presentation.
          if (typeof m.code === "string" && m.code && m.code !== generatedCodeRef.current) {
            isApplyingRemote.current = true;
            pushVersion(m.code);
            isApplyingRemote.current = false;
          }
          break;
        }
        case "PRESENCE": {
          const peers = m.peers as CollaboratorInfo[] | undefined;
          if (Array.isArray(peers)) setCollaborators(peers);
          break;
        }
      }
    };

    ws.onerror = () => { /* handled by onclose */ };

    ws.onclose = () => {
      wsRef.current = null;
      setCollabActive(false);
      setCollaborators([]);

      if (!enabledRef.current) return;
      if (attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;

      const delay = RECONNECT_BASE_MS * 2 ** attemptsRef.current;
      attemptsRef.current += 1;
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, []); // stable — uses refs internally

  useEffect(() => {
    if (!enabled) {
      // Explicit disable: close the socket and stop reconnecting
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
      setCollabActive(false);
      setCollaborators([]);
      attemptsRef.current = 0;
      return;
    }
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  // connect is stable; enabled/presentationId changes trigger re-connect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, presentationId]);

  /** Send cursor position (current slide) to the sidecar */
  const sendCursor = useCallback((cursorSlide: number) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "CURSOR", cursorSlide }));
    }
  }, []);

  return { sendCursor };
}
