import { Router } from "express";
import { db } from "../config/db.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { realtimeService } from "../services/realtime.service.js";
import { notificationsService } from "../services/notifications.service.js";
import { resolveUserId } from "../utils/profileId.js";
import { sendInterestAcceptedEmail } from "../config/mailer.js";

export const interestsRouter = Router();

// 1. Interests sent by current user
interestsRouter.get("/sent", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.id, i.status, i.created_at,
              u.id as user_id, u.display_id, u.full_name, u.avatar_url, u.mobile, u.gender,
              pr.age, pr.city, pr.state, pr.religion, pr.caste, pr.occupation, pr.education,
              pr.photos, pr.verified, pr.marital_status, pr.last_active,
              c.id as conversation_id
       FROM interests i
       JOIN users u ON i.receiver_id = u.id
       JOIN profiles pr ON u.id = pr.id
       LEFT JOIN conversations c ON ((c.user1_id = i.sender_id AND c.user2_id = i.receiver_id) OR (c.user2_id = i.sender_id AND c.user1_id = i.receiver_id))
       WHERE i.sender_id = $1 AND i.receiver_id != $1
       ORDER BY i.created_at DESC`,
      [req.user!.id],
    );

    const formatted = rows.map((r) => ({
      id: r.id,
      status: r.status,
      sentAt: r.created_at,
      conversationId: r.conversation_id || undefined,
      profile: {
        id: r.user_id,
        displayId: r.display_id || undefined,
        fullName: r.full_name,
        age: r.age || 25,
        gender: r.gender || "female",
        photos: r.photos && r.photos.length > 0 ? r.photos : r.avatar_url ? [r.avatar_url] : [],
        verified: Boolean(r.verified),
        about: "",
        height: "",
        religion: r.religion || "",
        caste: r.caste || "",
        motherTongue: "",
        maritalStatus: r.marital_status || "never_married",
        education: r.education || "",
        occupation: r.occupation || "",
        employmentStatus: "",
        incomeRange: "",
        city: r.city || "",
        state: r.state || "",
        country: "India",
        family: {},
        lastActive: r.last_active,
        shortlisted: false,
        interestSent: true,
        isConnected: r.status === "accepted",
        conversationId: r.conversation_id || undefined,
        canViewContact: false,
      },
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. Interests received by current user
interestsRouter.get("/received", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.id, i.status, i.created_at,
              u.id as user_id, u.display_id, u.full_name, u.avatar_url, u.mobile, u.gender,
              pr.age, pr.city, pr.state, pr.religion, pr.caste, pr.occupation, pr.education,
              pr.photos, pr.verified, pr.marital_status, pr.last_active,
              c.id as conversation_id
       FROM interests i
       JOIN users u ON i.sender_id = u.id
       JOIN profiles pr ON u.id = pr.id
       LEFT JOIN conversations c ON ((c.user1_id = i.sender_id AND c.user2_id = i.receiver_id) OR (c.user2_id = i.sender_id AND c.user1_id = i.receiver_id))
       WHERE i.receiver_id = $1 AND i.sender_id != $1
       ORDER BY i.created_at DESC`,
      [req.user!.id],
    );

    const formatted = rows.map((r) => ({
      id: r.id,
      status: r.status,
      sentAt: r.created_at,
      conversationId: r.conversation_id || undefined,
      profile: {
        id: r.user_id,
        displayId: r.display_id || undefined,
        fullName: r.full_name,
        age: r.age || 25,
        gender: r.gender || "male",
        photos: r.photos && r.photos.length > 0 ? r.photos : r.avatar_url ? [r.avatar_url] : [],
        verified: Boolean(r.verified),
        about: "",
        height: "",
        religion: r.religion || "",
        caste: r.caste || "",
        motherTongue: "",
        maritalStatus: r.marital_status || "never_married",
        education: r.education || "",
        occupation: r.occupation || "",
        employmentStatus: "",
        incomeRange: "",
        city: r.city || "",
        state: r.state || "",
        country: "India",
        family: {},
        lastActive: r.last_active,
        shortlisted: false,
        interestSent: false,
        isConnected: r.status === "accepted",
        conversationId: r.conversation_id || undefined,
        canViewContact: false,
      },
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Respond to interest (accept / decline)
interestsRouter.post("/:id/:action", requireAuth, async (req, res) => {
  try {
    const { id, action } = req.params;
    if (action !== "accept" && action !== "decline") {
      return res.status(400).json({ message: "Action must be accept or decline" });
    }

    const newStatus = action === "accept" ? "accepted" : "declined";
    const updateRes = await db.query(
      `UPDATE interests SET status = $1, updated_at = NOW() 
       WHERE id = $2 AND receiver_id = $3
       RETURNING sender_id, receiver_id`,
      [newStatus, id, req.user!.id],
    );

    if (action === "accept" && updateRes.rows.length > 0) {
      const { sender_id, receiver_id } = updateRes.rows[0];

      // Check if conversation already exists
      const existingConv = await db.query(
        `SELECT id FROM conversations
         WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
         LIMIT 1`,
        [sender_id, receiver_id],
      );

      let conversationId = existingConv.rows[0]?.id;

      if (!conversationId) {
        // Create conversation
        const convRes = await db.query(
          `INSERT INTO conversations (user1_id, user2_id, last_message, last_message_at)
           VALUES ($1, $2, 'Interest accepted! You can now start chatting.', NOW())
           RETURNING id`,
          [sender_id, receiver_id],
        );
        conversationId = convRes.rows[0].id;

        // Add greeting message
        await db.query(
          `INSERT INTO messages (conversation_id, sender_id, body, status)
           VALUES ($1, $2, 'Interest accepted! You can now start chatting.', 'sent')`,
          [conversationId, receiver_id],
        );
      }

      // Emit real-time WebSocket event and notification to sender & dispatch email
      void (async () => {
        try {
          const [senderRes, accepterRes] = await Promise.all([
            db.query(
              "SELECT full_name, email, preferences FROM users WHERE id = $1",
              [sender_id]
            ),
            db.query(
              "SELECT full_name, display_id FROM users WHERE id = $1",
              [receiver_id]
            ),
          ]);

          const sender = senderRes.rows[0];
          const senderName = sender?.full_name || "Member";
          const accepter = accepterRes.rows[0];
          const accepterName = accepter?.full_name || "Member";

          realtimeService.broadcastInterestAccepted(sender_id, {
            interestId: id,
            conversationId,
            partner: {
              id: receiver_id,
              displayId: accepter?.display_id,
              name: accepterName,
            },
          });

          await notificationsService.create({
            userId: sender_id,
            type: "interest_accepted",
            title: "Interest Accepted! 🎉",
            body: `${accepterName} (${accepter?.display_id || ""}) accepted your interest request! You can now start chatting.`,
            data: { conversationId, partnerId: receiver_id, displayId: accepter?.display_id },
          });

          // Send email to sender if email exists and user allows interest notifications
          if (sender && sender.email) {
            const prefs = sender.preferences || {};
            if (prefs.interests !== false) {
              await sendInterestAcceptedEmail({
                to: sender.email,
                senderName,
                partnerName: accepterName,
                partnerDisplayId: accepter?.display_id || undefined,
                conversationId,
              });
            }
          }
        } catch (err: any) {
          console.warn("[Realtime/Notification Error]", err.message);
        }
      })();

      return res.json({ ok: true, conversationId });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Delete or Unfriend an interest connection by Interest ID
interestsRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify user is either sender or receiver of this interest
    const interestRes = await db.query(
      `SELECT id, sender_id, receiver_id, status FROM interests WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)`,
      [id, userId],
    );

    if (interestRes.rows.length === 0) {
      return res.status(404).json({ message: "Interest connection not found" });
    }

    const interest = interestRes.rows[0];
    const partnerId = interest.sender_id === userId ? interest.receiver_id : interest.sender_id;

    // Delete the interest record
    await db.query(`DELETE FROM interests WHERE id = $1`, [id]);

    // Delete mutual conversations and chat messages between both members
    const convRes = await db.query(
      `SELECT id FROM conversations WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [userId, partnerId],
    );

    if (convRes.rows.length > 0) {
      const convId = convRes.rows[0].id;
      await db.query(`DELETE FROM messages WHERE conversation_id = $1`, [convId]);
      await db.query(`DELETE FROM conversations WHERE id = $1`, [convId]);
    }

    // Emit live WebSocket event to the other party so their UI reflects unfriend immediately
    realtimeService.broadcastInterestUnfriended(partnerId, {
      interestId: id,
      unfriendedBy: userId,
    });

    return res.json({ ok: true, message: "Connection removed successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. Unfriend by target member ID (supports UUID and display ID like 'P1')
interestsRouter.post("/unfriend", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { targetUserId } = req.body;

    if (!targetUserId || typeof targetUserId !== "string" || !targetUserId.trim()) {
      return res.status(400).json({ message: "Valid target member ID is required" });
    }

    const resolvedTargetId = await resolveUserId(targetUserId.trim());
    if (!resolvedTargetId) {
      return res.status(404).json({ message: "Target member not found" });
    }

    // Delete all interests between these two users (sent and received)
    await db.query(
      `DELETE FROM interests 
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
      [userId, resolvedTargetId],
    );

    // Delete any active conversations and messages between them
    const convRes = await db.query(
      `SELECT id FROM conversations WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [userId, resolvedTargetId],
    );

    if (convRes.rows.length > 0) {
      const convId = convRes.rows[0].id;
      await db.query(`DELETE FROM messages WHERE conversation_id = $1`, [convId]);
      await db.query(`DELETE FROM conversations WHERE id = $1`, [convId]);
    }

    realtimeService.broadcastInterestUnfriended(resolvedTargetId, {
      unfriendedBy: userId,
    });

    return res.json({ ok: true, message: "Successfully unfriended and removed connection" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

