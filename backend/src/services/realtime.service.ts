import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  activeConversationId?: string;
}

interface SocketEvent<T = any> {
  event: string;
  data: T;
}

const JWT_SECRET = process.env.JWT_SECRET || "yfj_matrimony_secret_jwt_key_2026_dev";

// Map: userId -> Set of active WebSockets (user might have multiple tabs/devices)
const userSockets = new Map<string, Set<AuthenticatedSocket>>();

// Map: conversationId -> Set of sockets currently subscribed/active in that chat view
const conversationRooms = new Map<string, Set<AuthenticatedSocket>>();

let wss: WebSocketServer | null = null;

export function setupRealtimeServer(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({
    noServer: true,
  });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    if (url.pathname !== "/ws") {
      return;
    }

    const token = url.searchParams.get("token") || (request.headers["sec-websocket-protocol"] as string);
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      wss!.handleUpgrade(request, socket, head, (ws) => {
        (ws as AuthenticatedSocket).userId = decoded.id;
        wss!.emit("connection", ws, request);
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
  });

  wss.on("connection", async (ws: AuthenticatedSocket, _req) => {
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (rawMessage) => {
      try {
        const rawStr = rawMessage.toString().trim();
        if (rawStr === "ping") {
          safeSend(ws, { event: "pong", data: { timestamp: Date.now() } } as any);
          return;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(rawStr);
        } catch {
          return;
        }
        const event = parsed.event || parsed.type;
        const data = parsed.data || parsed.payload;

        if (event === "ping") {
          safeSend(ws, { event: "pong", type: "pong", data: { timestamp: Date.now() } } as any);
          return;
        }

        if (event === "chat:subscribe" && data?.conversationId) {
          const convId = String(data.conversationId);
          ws.activeConversationId = convId;

          if (!conversationRooms.has(convId)) {
            conversationRooms.set(convId, new Set());
          }
          conversationRooms.get(convId)!.add(ws);
          return;
        }

        if (event === "chat:unsubscribe" && data?.conversationId) {
          const convId = String(data.conversationId);
          if (conversationRooms.has(convId)) {
            conversationRooms.get(convId)!.delete(ws);
          }
          if (ws.activeConversationId === convId) {
            ws.activeConversationId = undefined;
          }
          return;
        }

        if (event === "chat:message" && data?.conversationId && data?.content && ws.userId) {
          const convId = String(data.conversationId);
          const body = String(data.content).trim();
          if (!body) return;

          // Check participant access
          const convCheck = await db.query(
            "SELECT user1_id, user2_id FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)",
            [convId, ws.userId]
          );

          if (convCheck.rows.length === 0) {
            safeSend(ws, { event: "chat:error", data: { message: "Unauthorized conversation access" } });
            return;
          }

          const conv = convCheck.rows[0];
          const recipientId = conv.user1_id === ws.userId ? conv.user2_id : conv.user1_id;

          // Insert into database
          const insertRes = await db.query(
            `INSERT INTO messages (conversation_id, sender_id, body, status)
             VALUES ($1, $2, $3, 'sent')
             RETURNING id, conversation_id, sender_id, body, created_at, status`,
            [convId, ws.userId, body]
          );

          await db.query(
            `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
            [body, convId]
          );

          const msgRow = insertRes.rows[0];
          const messagePayload = {
            id: msgRow.id,
            conversationId: msgRow.conversation_id,
            senderId: msgRow.sender_id,
            body: msgRow.body,
            sentAt: msgRow.created_at,
            status: msgRow.status,
          };

          // Broadcast to conversation room and to recipient without duplicate delivery
          broadcastChatMessage(convId, recipientId, messagePayload);

          // Create notification for recipient if not currently focused on this chat
          const isRecipientViewingChat = isUserInConversation(convId, recipientId);

          if (!isRecipientViewingChat) {
            try {
              const senderRes = await db.query("SELECT full_name, avatar_url FROM users WHERE id = $1", [ws.userId]);
              const senderName = senderRes.rows[0]?.full_name || "A member";

              const notifRes = await db.query(
                `INSERT INTO notifications (user_id, type, title, body, data)
                 VALUES ($1, 'chat_message', $2, $3, $4)
                 RETURNING *`,
                [
                  recipientId,
                  `New message from ${senderName}`,
                  body.length > 80 ? `${body.slice(0, 77)}...` : body,
                  JSON.stringify({ conversationId: convId, senderId: ws.userId, senderName, senderAvatar: senderRes.rows[0]?.avatar_url || "" }),
                ]
              );

              sendToUser(recipientId, "notification:new", {
                notification: notifRes.rows[0],
              });
            } catch (err: any) {
              console.warn("[WebSocket] Notification creation warning:", err.message);
            }
          }
        }
      } catch (err: any) {
        console.warn("[WebSocket] Message parsing error:", err.message);
      }
    });

    ws.on("close", () => {
      if (ws.userId && userSockets.has(ws.userId)) {
        userSockets.get(ws.userId)!.delete(ws);
        if (userSockets.get(ws.userId)!.size === 0) {
          userSockets.delete(ws.userId);
        }
      }
      if (ws.activeConversationId && conversationRooms.has(ws.activeConversationId)) {
        conversationRooms.get(ws.activeConversationId)!.delete(ws);
        if (conversationRooms.get(ws.activeConversationId)!.size === 0) {
          conversationRooms.delete(ws.activeConversationId);
        }
      }
    });

    if (ws.userId) {
      if (!userSockets.has(ws.userId)) {
        userSockets.set(ws.userId, new Set());
      }
      userSockets.get(ws.userId)!.add(ws);

      void (async () => {
        let unreadCount = 0;
        try {
          const notifRes = await db.query(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
            [ws.userId]
          );
          unreadCount = parseInt(notifRes.rows[0]?.count || "0", 10);
        } catch {}

        safeSend(ws, {
          event: "connection:ack",
          type: "connection:ack",
          data: {
            userId: ws.userId,
            unreadCount,
            timestamp: new Date().toISOString(),
          },
        } as any);
      })();
    }
  });

  // Keep-alive heartbeat interval (every 30 seconds)
  const heartbeat = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      const socket = client as AuthenticatedSocket;
      if (!socket.isAlive) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeat);
  });

  console.log(`[YFJ Backend] WebSocket server mounted on path /ws`);
  return wss;
}

function safeSend(ws: WebSocket, payload: SocketEvent) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Send an event directly to all connected sockets of a specific user
 */
export function sendToUser(userId: string, event: string, data: any): boolean {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return false;

  const payload: SocketEvent = { event, data };
  let sent = false;
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      sent = true;
    }
  }
  return sent;
}

/**
 * Broadcast an event to all sockets currently in a conversation room
 */
export function broadcastToConversation(
  conversationId: string,
  event: string,
  data: any,
  excludeUserId?: string
): void {
  const sockets = conversationRooms.get(conversationId);
  if (!sockets || sockets.size === 0) return;

  const payload: SocketEvent = { event, data };
  for (const ws of sockets) {
    if (excludeUserId && ws.userId === excludeUserId) continue;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

/**
 * Check if a specific user currently has an active socket inside a conversation room
 */
export function isUserInConversation(conversationId: string, userId: string): boolean {
  const sockets = conversationRooms.get(conversationId);
  if (!sockets || sockets.size === 0) return false;
  return Array.from(sockets).some((s) => s.userId === userId);
}

/**
 * Broadcast a new chat message to a conversation room, and deliver to recipient's other tabs
 * WITHOUT duplicate deliveries to the same socket.
 */
export function broadcastChatMessage(
  conversationId: string,
  recipientId: string,
  messagePayload: any
): void {
  const roomSockets = conversationRooms.get(conversationId);
  const payload: SocketEvent = {
    event: "chat:message",
    data: {
      conversationId,
      message: messagePayload,
    },
  };

  // 1. Deliver to all sockets currently inside this conversation room
  if (roomSockets) {
    for (const ws of roomSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    }
  }

  // 2. Deliver to any recipient sockets that are NOT inside this conversation room
  // (e.g. user is on dashboard, browse, or messages list)
  const recipientSockets = userSockets.get(recipientId);
  if (recipientSockets) {
    for (const ws of recipientSockets) {
      if (!roomSockets || !roomSockets.has(ws)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(payload));
        }
      }
    }
  }
}

export function broadcastToAll(event: string, data: any): void {
  const payload: SocketEvent = { event, data };
  const str = JSON.stringify(payload);
  for (const sockets of userSockets.values()) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(str);
      }
    }
  }
}

/**
 * Global broadcast helper for interest requests, acceptances, notifications, and support tickets
 */
export const realtimeService = {
  sendToUser,
  broadcastToAll,
  broadcastToConversation,
  broadcastChatMessage,
  isUserInConversation,
  broadcastInterestReceived: (receiverId: string, payload: any) => {
    sendToUser(receiverId, "interest:received", payload);
  },
  broadcastInterestAccepted: (senderId: string, payload: any) => {
    sendToUser(senderId, "interest:accepted", payload);
  },
  broadcastInterestUnfriended: (userId: string, payload: any) => {
    sendToUser(userId, "interest:unfriended", payload);
  },
  broadcastNotification: (userId: string, notification: any) => {
    sendToUser(userId, "notification:new", { notification });
  },
  broadcastTicketReply: (ticketId: string, replyPayload: any, recipientUserId?: string | null) => {
    if (recipientUserId) {
      sendToUser(recipientUserId, "ticket:reply", { ticketId, reply: replyPayload });
    }
    broadcastToAll("ticket:reply", { ticketId, reply: replyPayload });
  },
  broadcastTicketCreated: (ticket: any) => {
    broadcastToAll("ticket:new", { ticket });
  },
};

