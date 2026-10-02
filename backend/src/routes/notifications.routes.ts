import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { notificationsService } from "../services/notifications.service.js";

export const notificationsRouter = Router();

// 1. Get user notifications with unread count
notificationsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const result = await notificationsService.list(req.user!.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to load notifications" });
  }
});

// 2. Mark single notification as read
notificationsRouter.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const notifId = Array.isArray(rawId) ? rawId[0] : (rawId || "");
    const result = await notificationsService.markAsRead(req.user!.id, notifId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to mark notification as read" });
  }
});

// 3. Mark multiple notifications as read
notificationsRouter.patch("/mark-multiple", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body || {};
    const result = await notificationsService.markMultipleAsRead(req.user!.id, ids || []);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to mark notifications as read" });
  }
});

// 4. Mark all notifications as read
notificationsRouter.patch("/read-all", requireAuth, async (req, res) => {
  try {
    const result = await notificationsService.markAllAsRead(req.user!.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to mark all notifications as read" });
  }
});

// 5. Clear all notifications (dismiss / delete)
notificationsRouter.delete("/clear-all", requireAuth, async (req, res) => {
  try {
    const result = await notificationsService.clearAll(req.user!.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to clear notifications" });
  }
});

