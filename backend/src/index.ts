import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth.routes.js";
import { profilesRouter } from "./routes/profiles.routes.js";
import { interestsRouter } from "./routes/interests.routes.js";
import { messagesRouter } from "./routes/messages.routes.js";
import { subscriptionsRouter } from "./routes/subscriptions.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { supportRouter } from "./routes/support.routes.js";
import { setupRealtimeServer } from "./services/realtime.service.js";
import { db } from "./config/db.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize WebSocket real-time server
setupRealtimeServer(server);

const isProduction = process.env.NODE_ENV === "production";

// Configure CORS
const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:8080,http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".yfjmatrimony.com");
      if (isAllowed || !isProduction) return callback(null, true);
      return callback(new Error("CORS origin not allowed"), false);
    },
    credentials: true,
  }),
);

// Production HTTP Security Headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Health check endpoint for AWS App Runner / ALB
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Mount Routes
app.use("/api/auth", authRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/interests", interestsRouter);
app.use("/api/conversations", messagesRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/support", supportRouter);
app.use("/api", subscriptionsRouter);
app.use("/api/admin", adminRouter);

// Public Dynamic Content Endpoints (CMS, Banners, Success Stories, Broadcasts, Settings)
app.get("/api/broadcasts", async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM broadcasts 
       WHERE is_active = true 
       ORDER BY created_at DESC 
       LIMIT 10`,
    );
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

app.get("/api/banners", async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM banners 
       WHERE is_active = true 
         AND (start_date IS NULL OR start_date <= NOW())
         AND (end_date IS NULL OR end_date >= NOW())
       ORDER BY created_at DESC`,
    );
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

app.get("/api/success-stories", async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM success_stories 
       WHERE is_published = true 
       ORDER BY created_at DESC`,
    );
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

app.get("/api/content/:key", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM site_content WHERE key = $1 LIMIT 1`,
      [req.params.key],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Content page not found" });
    }
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

app.get("/api/coupons/active", async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, code, discount_type, discount_value, min_amount, max_discount, expires_at
       FROM coupons
       WHERE is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (usage_limit IS NULL OR used_count < usage_limit)
       ORDER BY created_at DESC`,
    );
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

app.get("/api/settings/public", async (_req, res) => {
  try {
    const { rows } = await db.query("SELECT key, value FROM system_settings");
    const map: Record<string, any> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return res.json({
      maintenance_mode: Boolean(map.maintenance_mode ?? false),
      allow_registrations: map.allow_registrations !== false,
      require_verification_to_chat: Boolean(map.require_verification_to_chat ?? false),
      contact_email: map.contact_email || "support@yfjmatrimony.com",
      helpline_phone: map.helpline_phone || "+91 99999 88888",
      free_interests_per_day: Number(map.free_interests_per_day) || 10,
      payment_gateway_mode: map.payment_gateway_mode || "sandbox",
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// Global 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
server.listen(PORT, async () => {
  console.log(`[YFJ Backend] Server and WebSocket running on port ${PORT}`);
  console.log(`[YFJ Backend] Health check: http://localhost:${PORT}/health`);
  console.log(`[YFJ Backend] Database connected to AWS RDS`);

  // Run subscription expiry engine on startup and every hour
  try {
    const { expireOutdatedSubscriptions } = await import("./routes/subscriptions.routes.js");
    await expireOutdatedSubscriptions();
    setInterval(() => {
      void expireOutdatedSubscriptions();
    }, 60 * 60 * 1000);
    console.log(`[YFJ Backend] Subscription expiry engine active`);
  } catch (err) {
    console.error(`[YFJ Backend] Subscription expiry engine failed to initialize:`, err);
  }
});

