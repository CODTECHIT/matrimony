import { db } from "../config/db.js";
import { realtimeService } from "./realtime.service.js";

export interface CreateNotificationParams {
  userId: string;
  type: "chat_message" | "interest_received" | "interest_accepted" | "profile_view" | "system";
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const notificationsService = {
  async create(params: CreateNotificationParams) {
    const { userId, type, title, body, data = {} } = params;

    const { rows } = await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, body, JSON.stringify(data)]
    );

    const notification = rows[0];

    // Emit live event over WebSocket
    realtimeService.broadcastNotification(userId, notification);

    return notification;
  },

  async list(userId: string, limit = 50) {
    const [listRes, countRes] = await Promise.all([
      db.query(
        `SELECT id, user_id, type, title, body, data, is_read, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      ),
      db.query(
        `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      ),
    ]);

    const formatted = listRes.rows.map((n) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data || {},
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    }));

    const unreadCount = parseInt(countRes.rows[0]?.count || "0", 10);

    return {
      notifications: formatted,
      unreadCount,
    };
  },

  async markAsRead(userId: string, notificationId: string) {
    const res = await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    if (res.rowCount === 0) {
      const existsRes = await db.query("SELECT user_id FROM notifications WHERE id = $1", [notificationId]);
      if (existsRes.rows.length === 0) {
        throw new Error("NOTIFICATION_NOT_FOUND");
      } else {
        throw new Error("UNAUTHORIZED_NOTIFICATION_ACCESS");
      }
    }
    return { ok: true };
  },

  async markMultipleAsRead(userId: string, notificationIds: string[]) {
    if (!notificationIds || notificationIds.length === 0) return { ok: true };
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2::text[])`,
      [userId, notificationIds]
    );
    return { ok: true };
  },

  async markAllAsRead(userId: string) {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return { ok: true };
  },

  async clearAll(userId: string) {
    await db.query(
      `DELETE FROM notifications WHERE user_id = $1`,
      [userId]
    );
    return { ok: true };
  },
};

