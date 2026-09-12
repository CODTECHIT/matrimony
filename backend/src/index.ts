import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth.routes.js";
import { profilesRouter } from "./routes/profiles.routes.js";
import { interestsRouter } from "./routes/interests.routes.js";
import { messagesRouter } from "./routes/messages.routes.js";
import { subscriptionsRouter } from "./routes/subscriptions.routes.js";
import { adminRouter } from "./routes/admin.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use("/api", subscriptionsRouter);
app.use("/api/admin", adminRouter);

// Global 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
app.listen(PORT, async () => {
  console.log(`[YFJ Backend] Server running on port ${PORT}`);
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

