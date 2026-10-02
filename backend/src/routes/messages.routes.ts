import { Router } from "express";
import { db } from "../config/db.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { resolveUserId } from "../utils/profileId.js";
import { realtimeService } from "../services/realtime.service.js";
import { notificationsService } from "../services/notifications.service.js";
import { quotaService } from "../services/quota.service.js";

export const messagesRouter = Router();

// 1. Get user's active conversations
messagesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { rows } = await db.query(
      `SELECT c.id, c.last_message, c.last_message_at,
              u1.id as u1_id, u1.full_name as u1_name, u1.avatar_url as u1_avatar, u1.display_id as u1_display_id,
              u2.id as u2_id, u2.full_name as u2_name, u2.avatar_url as u2_avatar, u2.display_id as u2_display_id
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       WHERE c.user1_id = $1 OR c.user2_id = $1
       ORDER BY c.last_message_at DESC`,
      [userId],
    );

    const formatted = rows.map((c) => {
      const isUser1 = c.u1_id === userId;
      const otherId = isUser1 ? c.u2_id : c.u1_id;
      const otherName = isUser1 ? c.u2_name : c.u1_name;
      const otherAvatar = isUser1 ? c.u2_avatar : c.u1_avatar;
      const otherDisplayId = isUser1 ? c.u2_display_id : c.u1_display_id;

      return {
        id: c.id,
        participant: {
          id: otherId || "",
          displayId: otherDisplayId || undefined,
          fullName: otherName || "Member",
          photos: otherAvatar ? [otherAvatar] : [],
        },
        lastMessage: c.last_message || "",
        lastMessageAt: c.last_message_at,
        unreadCount: 0,
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. Get messages for a conversation
messagesRouter.get(["/:id/messages", "/conversations/:id/messages"], requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Authorization check: Verify requester is a participant in this conversation (IDOR mitigation)
    const convCheck = await db.query(
      `SELECT id FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [id, userId],
    );

    if (convCheck.rows.length === 0) {
      return res.status(403).json({ message: "Access denied: You are not a participant in this conversation" });
    }

    const { rows } = await db.query(
      `SELECT id, conversation_id, sender_id, body, created_at, status
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id],
    );

    const formatted = rows.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      body: m.body,
      sentAt: m.created_at,
      status: m.status,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Send message in a conversation
messagesRouter.post(["/:id/messages", "/conversations/:id/messages"], requireAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const convId = Array.isArray(rawId) ? rawId[0] : (rawId || "");
    const { body } = req.body;
    const userId = req.user!.id;

    if (!body || typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ message: "Message body is required" });
    }

    // Authorization check: Verify requester is a participant in this conversation (IDOR mitigation)
    const convCheck = await db.query(
      `SELECT id, user1_id, user2_id FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [convId, userId],
    );

    if (convCheck.rows.length === 0) {
      return res.status(403).json({ message: "Access denied: You are not a participant in this conversation" });
    }

    const conv = convCheck.rows[0];
    const recipientId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

    // Check plan messaging permissions (free tier restriction, silver mutual match check)
    const quotaCheck = await quotaService.checkMessagingPermission(userId, recipientId, req.user!.plan);
    if (!quotaCheck.allowed) {
      return res.status(403).json({
        code: quotaCheck.code,
        message: quotaCheck.message,
      });
    }

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const insertRes = await client.query(
        `INSERT INTO messages (conversation_id, sender_id, body, status)
         VALUES ($1, $2, $3, 'sent')
         RETURNING id, conversation_id, sender_id, body, created_at, status`,
        [convId, userId, body.trim()],
      );

      await client.query(
        `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
        [body.trim(), convId],
      );

      await client.query("COMMIT");

      const data = insertRes.rows[0];
      const messagePayload = {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        body: data.body,
        sentAt: data.created_at,
        status: data.status,
      };

      // Broadcast message in real-time over WebSocket without duplicate deliveries
      realtimeService.broadcastChatMessage(convId, recipientId, messagePayload);

      // Dispatch real-time notification to recipient only if not actively viewing this conversation
      if (!realtimeService.isUserInConversation(convId, recipientId)) {
        void (async () => {
          try {
            const senderRes = await db.query("SELECT full_name, avatar_url FROM users WHERE id = $1", [userId]);
            const senderName = senderRes.rows[0]?.full_name || "Member";
            const senderAvatar = senderRes.rows[0]?.avatar_url || "";
            await notificationsService.create({
              userId: recipientId,
              type: "chat_message",
              title: `New message from ${senderName}`,
              body: body.trim().length > 80 ? `${body.trim().slice(0, 77)}...` : body.trim(),
              data: { conversationId: convId, senderId: userId, senderName, senderAvatar },
            });
          } catch (err: any) {
            console.warn("[Notification] Could not deliver chat notification:", err.message);
          }
        })();
      }

      return res.json(messagePayload);
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Start or open conversation with a target user (supports UUID or display ID)
messagesRouter.post("/start", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { targetUserId } = req.body;

    if (!targetUserId || typeof targetUserId !== "string" || !targetUserId.trim()) {
      return res.status(400).json({ message: "Valid target member ID is required" });
    }

    const resolvedTargetId = await resolveUserId(targetUserId);
    if (!resolvedTargetId) {
      return res.status(404).json({ message: "Target member not found" });
    }

    if (resolvedTargetId === userId) {
      return res.status(400).json({ message: "Cannot start a conversation with yourself" });
    }

    // Find existing conversation
    const existing = await db.query(
      `SELECT id FROM conversations
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
       LIMIT 1`,
      [userId, resolvedTargetId],
    );

    if (existing.rows.length > 0) {
      return res.json({ id: existing.rows[0].id });
    }

    // Create new conversation
    const insertRes = await db.query(
      `INSERT INTO conversations (user1_id, user2_id, last_message, last_message_at)
       VALUES ($1, $2, 'Conversation started.', NOW())
       RETURNING id`,
      [userId, resolvedTargetId],
    );

    return res.json({ id: insertRes.rows[0].id });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. Delete conversation completely
messagesRouter.delete(["/:id", "/conversations/:id"], requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const convId = req.params.id;

    // Verify user is a participant
    const convCheck = await db.query(
      `SELECT id, user1_id, user2_id FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [convId, userId],
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ message: "Conversation not found or access denied" });
    }

    await db.query(`DELETE FROM messages WHERE conversation_id = $1`, [convId]);
    await db.query(`DELETE FROM conversations WHERE id = $1`, [convId]);

    return res.json({ ok: true, message: "Conversation deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. Clear chat messages inside a conversation
messagesRouter.post(["/:id/clear", "/conversations/:id/clear"], requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const convId = req.params.id;

    const convCheck = await db.query(
      `SELECT id, user1_id, user2_id FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [convId, userId],
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ message: "Conversation not found or access denied" });
    }

    await db.query(`DELETE FROM messages WHERE conversation_id = $1`, [convId]);
    await db.query(
      `UPDATE conversations SET last_message = 'Chat history cleared.', last_message_at = NOW() WHERE id = $1`,
      [convId],
    );

    return res.json({ ok: true, message: "Chat history cleared successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

