import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const messagesRouter = Router();

// 1. Get user's active conversations
messagesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Fetch conversations where user is user1 or user2
    const { data: convos, error } = await supabase
      .from("conversations")
      .select(
        `
        id,
        last_message,
        last_message_at,
        user1:users!user1_id(id, full_name, avatar_url),
        user2:users!user2_id(id, full_name, avatar_url)
      `,
      )
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    const formatted = (convos || []).map((c: any) => {
      const isUser1 = c.user1?.id === userId;
      const otherUser = isUser1 ? c.user2 : c.user1;

      return {
        id: c.id,
        participant: {
          id: otherUser?.id || "",
          fullName: otherUser?.full_name || "Member",
          photos: otherUser?.avatar_url ? [otherUser.avatar_url] : [],
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
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) return res.status(400).json({ message: error.message });

    const formatted = (data || []).map((m: any) => ({
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

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        sender_id: req.user!.id,
        body,
        status: "sent",
      })
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });

    // Update conversation last_message
    await supabase
      .from("conversations")
      .update({
        last_message: body,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", id);

    return res.json({
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      body: data.body,
      sentAt: data.created_at,
      status: data.status,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});
