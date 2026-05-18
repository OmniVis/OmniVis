/**
 * Slidi Collaborative Editing WebSocket Sidecar
 *
 * Standalone Node.js process — separate from the Next.js app.
 * Listens on PORT (default 3001). NGINX proxies /slidi/collab → this server.
 *
 * Environment:
 *   PORT              (optional, default 3001)
 *   COLLAB_JWT_SECRET (required in production, has dev fallback)
 */

import { WebSocketServer, WebSocket, type RawData } from "ws";
import { verify, type JwtPayload } from "jsonwebtoken";
import { IncomingMessage } from "http";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const JWT_SECRET = process.env.COLLAB_JWT_SECRET ?? "slidi-collab-dev-secret";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface PeerInfo {
  ws: WebSocket;
  sub: string;           // HMAC-hashed userId — never the raw UUID
  username: string | null;
  color: string;
  cursorSlide: number;
}

interface Room {
  peers: Map<WebSocket, PeerInfo>;
  code: string;
  version: number;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

// ------------------------------------------------------------------
// Room registry
// ------------------------------------------------------------------

const rooms = new Map<string, Room>();

const PEER_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
];

function assignColor(index: number): string {
  return PEER_COLORS[index % PEER_COLORS.length];
}

function getRoom(presentationId: string): Room {
  if (!rooms.has(presentationId)) {
    rooms.set(presentationId, { peers: new Map(), code: "", version: 0 });
  }
  return rooms.get(presentationId)!;
}

// ------------------------------------------------------------------
// Messaging helpers
// ------------------------------------------------------------------

function sendJSON(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastPresence(room: Room, presentationId: string): void {
  const peers = Array.from(room.peers.values()).map((p) => ({
    sub: p.sub,
    username: p.username,
    color: p.color,
    cursorSlide: p.cursorSlide,
  }));
  for (const peer of room.peers.values()) {
    sendJSON(peer.ws, { type: "PRESENCE", presentationId, peers });
  }
}

// ------------------------------------------------------------------
// WebSocket server
// ------------------------------------------------------------------

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const base = `ws://localhost:${PORT}`;
  const url = new URL(req.url ?? "/", base);
  const token = url.searchParams.get("token");
  const presentationId = url.searchParams.get("presentationId");

  if (!token || !presentationId) {
    ws.close(4001, "Missing token or presentationId");
    return;
  }

  let claims: JwtPayload;
  try {
    claims = verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    ws.close(4002, "Invalid or expired token");
    return;
  }

  if (claims.presentationId !== presentationId) {
    ws.close(4003, "Token / presentation mismatch");
    return;
  }

  const room = getRoom(presentationId);

  // Cancel any pending room cleanup
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = undefined;
  }

  const peer: PeerInfo = {
    ws,
    sub: String(claims.sub ?? ""),
    username: typeof claims.username === "string" ? claims.username : null,
    color: assignColor(room.peers.size),
    cursorSlide: 0,
  };
  room.peers.set(ws, peer);

  // Send current room state to the new joiner
  sendJSON(ws, { type: "SYNC", code: room.code, version: room.version });

  // Announce updated presence to everyone
  broadcastPresence(room, presentationId);

  // ------------------------------------------------------------------
  // Incoming message handler
  // ------------------------------------------------------------------
  ws.on("message", (raw: RawData) => {
    let msg: unknown;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (typeof msg !== "object" || msg === null) return;
    const m = msg as Record<string, unknown>;

    switch (m.type) {
      case "PATCH": {
        if (typeof m.code !== "string") return;
        // Last-write-wins: update room state and forward to all other peers
        room.code = m.code;
        room.version += 1;
        for (const [peerWs, p] of room.peers) {
          if (peerWs !== ws) {
            sendJSON(peerWs, {
              type: "PATCH",
              code: m.code,
              version: room.version,
              from: peer.sub,
            });
          }
        }
        break;
      }
      case "CURSOR": {
        if (typeof m.cursorSlide !== "number") return;
        peer.cursorSlide = m.cursorSlide;
        broadcastPresence(room, presentationId);
        break;
      }
    }
  });

  // ------------------------------------------------------------------
  // Disconnect handler
  // ------------------------------------------------------------------
  ws.on("close", () => {
    room.peers.delete(ws);
    if (room.peers.size === 0) {
      // Preserve room state briefly so a page refresh re-joins cleanly
      room.cleanupTimer = setTimeout(() => {
        rooms.delete(presentationId);
      }, 30_000);
    } else {
      broadcastPresence(room, presentationId);
    }
  });
});

console.log(`[collab] WebSocket server running on port ${PORT}`);
