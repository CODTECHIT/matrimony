import { Router } from "express";
import { db } from "../config/db.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const interestsRouter = Router();

// 1. Interests sent by current user
interestsRouter.get("/sent", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.id, i.status, i.created_at,
              u.id as user_id, u.full_name, u.avatar_url, u.mobile, u.gender,
              pr.age, pr.city, pr.state, pr.religion, pr.caste, pr.occupation, pr.education,
              pr.photos, pr.verified, pr.marital_status, pr.last_active
       FROM interests i
       JOIN users u ON i.receiver_id = u.id
       JOIN profiles pr ON u.id = pr.id
       WHERE i.sender_id = $1
       ORDER BY i.created_at DESC`,
      [req.user!.id],
    );

    const formatted = rows.map((r) => ({
      id: r.id,
      status: r.status,
      sentAt: r.created_at,
      profile: {
        id: r.user_id,
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
              u.id as user_id, u.full_name, u.avatar_url, u.mobile, u.gender,
              pr.age, pr.city, pr.state, pr.religion, pr.caste, pr.occupation, pr.education,
              pr.photos, pr.verified, pr.marital_status, pr.last_active
       FROM interests i
       JOIN users u ON i.sender_id = u.id
       JOIN profiles pr ON u.id = pr.id
       WHERE i.receiver_id = $1
       ORDER BY i.created_at DESC`,
      [req.user!.id],
    );

    const formatted = rows.map((r) => ({
      id: r.id,
      status: r.status,
      sentAt: r.created_at,
      profile: {
        id: r.user_id,
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

      return res.json({ ok: true, conversationId });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});
