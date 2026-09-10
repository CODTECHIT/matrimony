import { Router } from "express";
import { db } from "../config/db.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const messagesRouter = Router();

// 1. Get user's active conversations
messagesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { rows } = await db.query(
      `SELECT c.id, c.last_message, c.last_message_at,
              u1.id as u1_id, u1.full_name as u1_name, u1.avatar_url as u1_avatar,
              u2.id as u2_id, u2.full_name as u2_name, u2.avatar_url as u2_avatar
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

      return {
        id: c.id,
        participant: {
          id: otherId || "",
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
messagesRouter.get("/:id/messages", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
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
messagesRouter.post("/:id/messages", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    if (!body) return res.status(400).json({ message: "Message body is required" });

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const insertRes = await client.query(
        `INSERT INTO messages (conversation_id, sender_id, body, status)
         VALUES ($1, $2, $3, 'sent')
         RETURNING id, conversation_id, sender_id, body, created_at, status`,
        [id, req.user!.id, body],
      );

      await client.query(
        `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
        [body, id],
      );

      await client.query("COMMIT");

      const data = insertRes.rows[0];
      return res.json({
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        body: data.body,
        sentAt: data.created_at,
        status: data.status,
      });
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
