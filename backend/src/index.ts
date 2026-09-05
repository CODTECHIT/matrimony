import express from "express";
import cors from "cors";
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

// Configure CORS
const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:8080,http://localhost:5173"
).split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some(
        (o) => origin === o.trim() || origin.endsWith(".vercel.app"),
      );
      if (isAllowed) return callback(null, true);
      return callback(null, true); // Permissive in dev, tighten for prod
    },
    credentials: true,
  }),
);

app.use(express.json());

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
app.listen(PORT, () => {
  console.log(`[YFJ Backend] Server running on port ${PORT}`);
  console.log(`[YFJ Backend] Health check: http://localhost:${PORT}/health`);
});
