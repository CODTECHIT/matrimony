import { Router } from "express";
import { db } from "../config/db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import { realtimeService } from "../services/realtime.service.js";

export const supportRouter = Router();

// 1. Submit a Support Ticket (Public or Logged-in member)
supportRouter.post("/tickets", optionalAuth, async (req, res) => {
  try {
    const { name, email, phone, subject, message, priority = "medium" } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const userName = (name || (req.user ? req.user.fullName : "Member")).trim();
    const userEmail = (email || (req.user ? req.user.email : "")).trim();
    const ticketSubject = (subject || "Support Inquiry").trim();
    const userId = req.user ? req.user.id : null;

    // Generate readable ticket number
    const ticketNumber = `TICK-${Math.floor(1000 + Math.random() * 9000)}`;

    const { rows } = await db.query(
      `INSERT INTO support_tickets (ticket_number, user_id, user_name, user_email, subject, message, priority, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', NOW(), NOW())
       RETURNING *`,
      [ticketNumber, userId, userName, userEmail, ticketSubject, message.trim(), priority],
    );

    realtimeService.broadcastTicketCreated(rows[0]);

    return res.status(201).json({
      ok: true,
      ticket: rows[0],
      ticketNumber: rows[0].ticket_number,
      message: "Support ticket submitted successfully. Our advisors will respond shortly.",
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. Get tickets submitted by current logged-in user
supportRouter.get("/tickets/my", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*,
        COALESCE(
          (SELECT json_agg(r ORDER BY r.created_at ASC)
           FROM ticket_replies r
           WHERE r.ticket_id = t.id),
          '[]'::json
        ) as replies
       FROM support_tickets t
       WHERE t.user_id = $1 OR t.user_email = $2
       ORDER BY t.created_at DESC`,
      [req.user!.id, req.user?.email || ""],
    );

    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Get specific support ticket by ID or ticket number with full conversation thread
supportRouter.get("/tickets/:idOrNumber", optionalAuth, async (req, res) => {
  try {
    const paramVal = Array.isArray(req.params.idOrNumber) ? req.params.idOrNumber[0] : req.params.idOrNumber;
    const rawParam = (paramVal || "").trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawParam);

    const { rows } = await db.query(
      `SELECT * FROM support_tickets WHERE ${isUuid ? "id = $1" : "ticket_number ILIKE $1"} LIMIT 1`,
      [rawParam],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const ticket = rows[0];

    const repliesRes = await db.query(
      `SELECT * FROM ticket_replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [ticket.id],
    );

    return res.json({
      ...ticket,
      replies: repliesRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. User reply to an existing support ticket
supportRouter.post("/tickets/:idOrNumber/reply", optionalAuth, async (req, res) => {
  try {
    const paramVal = Array.isArray(req.params.idOrNumber) ? req.params.idOrNumber[0] : req.params.idOrNumber;
    const rawParam = (paramVal || "").trim();
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Reply message cannot be empty" });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawParam);
    const ticketRes = await db.query(
      `SELECT * FROM support_tickets WHERE ${isUuid ? "id = $1" : "ticket_number ILIKE $1"} LIMIT 1`,
      [rawParam],
    );

    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const ticket = ticketRes.rows[0];
    const senderName = req.user?.fullName || ticket.user_name || "Member";

    const replyRes = await db.query(
      `INSERT INTO ticket_replies (ticket_id, sender_type, sender_name, message, created_at)
       VALUES ($1, 'user', $2, $3, NOW())
       RETURNING *`,
      [ticket.id, senderName, message.trim()],
    );

    // Update ticket status to open (or in_progress) and update timestamp
    await db.query(
      `UPDATE support_tickets 
       SET status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END,
           updated_at = NOW() 
       WHERE id = $1`,
      [ticket.id],
    );

    realtimeService.broadcastTicketReply(ticket.id, replyRes.rows[0], ticket.user_id);

    return res.status(201).json({
      ok: true,
      reply: replyRes.rows[0],
      message: "Reply sent to support team successfully.",
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});
