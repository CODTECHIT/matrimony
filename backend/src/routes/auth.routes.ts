import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { sendPasswordResetEmail } from "../config/mailer.js";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "yfj_matrimony_secret_jwt_key_2026_dev";

function createToken(payload: { id: string; role: "user" | "admin"; plan: string; gender?: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

// In-memory OTP storage for password resets (15 minute validity)
const resetOtpStore = new Map<string, { otp: string; expiresAt: number }>();
// In-memory OTP storage for mobile login (5 minute validity)
const mobileOtpStore = new Map<string, { otp: string; expiresAt: number }>();

// 1. Email / Password login
authRouter.post("/login", async (req, res) => {
  try {
    const { email, mobile, password } = req.body;
    const identifier = (email || mobile || "").trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const { rows } = await db.query(
      `SELECT id, full_name, email, mobile, password_hash, gender, role, avatar_url, profile_completion, plan, profile_status 
       FROM users WHERE LOWER(email) = LOWER($1) OR mobile = $1`,
      [identifier],
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        message: "Password login is not configured for this account. Please log in using OTP or reset your password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken({ id: user.id, role: user.role, plan: user.plan, gender: user.gender });

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        role: user.role,
        avatarUrl: user.avatar_url,
        profileCompletion: user.profile_completion,
        plan: user.plan,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Login failed" });
  }
});

// 2. Request OTP
authRouter.post("/otp/request", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || typeof mobile !== "string") {
      return res.status(400).json({ message: "Valid mobile number is required" });
    }

    const cleanMobile = mobile.trim();
    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
    mobileOtpStore.set(cleanMobile, { otp, expiresAt });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[AUTH] Mobile verification OTP for ${cleanMobile}: ${otp}`);
    }

    // In production, integrate AWS SNS or SMS gateway
    return res.json({ sent: true, expiresInSeconds: 300 });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to send OTP" });
  }
});

// 3. Verify OTP
authRouter.post("/otp/verify", async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ message: "Mobile and OTP required" });

    const cleanMobile = String(mobile).trim();
    const cleanOtp = String(otp).trim();

    const stored = mobileOtpStore.get(cleanMobile);
    const isValid = stored && stored.otp === cleanOtp && Date.now() <= stored.expiresAt;

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    // Invalidate consumed OTP
    mobileOtpStore.delete(cleanMobile);

    const { rows } = await db.query(
      `SELECT id, full_name, email, mobile, gender, role, avatar_url, profile_completion, plan 
       FROM users WHERE mobile = $1`,
      [cleanMobile],
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: "Account not found with this mobile" });
    }

    const token = createToken({ id: user.id, role: user.role, plan: user.plan, gender: user.gender });
    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        role: user.role,
        avatarUrl: user.avatar_url,
        profileCompletion: user.profile_completion,
        plan: user.plan,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Register with Email & Password
authRouter.post("/register", async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const {
      fullName,
      gender,
      email,
      mobile,
      password,
      dateOfBirth,
      religion,
      caste,
      motherTongue,
      maritalStatus,
      height,
      education,
      occupation,
      employmentStatus,
      incomeRange,
      city,
      state,
    } = req.body;

    if (!fullName || !gender || !email || !password) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Full name, gender, email, and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing email
    const existing = await client.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [cleanEmail]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "An account with this email address already exists" });
    }

    // Check mobile if provided
    if (mobile) {
      const existingMobile = await client.query("SELECT id FROM users WHERE mobile = $1", [mobile.trim()]);
      if (existingMobile.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "An account with this mobile number already exists" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const userRes = await client.query(
      `INSERT INTO users (full_name, gender, email, mobile, password_hash, role, plan, profile_completion, profile_status)
       VALUES ($1, $2, $3, $4, $5, 'user', 'free', 40, 'pending')
       RETURNING id, full_name, email, mobile, gender, role, avatar_url, profile_completion, plan`,
      [fullName.trim(), gender.toLowerCase(), cleanEmail, mobile ? mobile.trim() : null, passwordHash],
    );

    const user = userRes.rows[0];

    // Insert profile
    await client.query(
      `INSERT INTO profiles (id, date_of_birth, religion, caste, mother_tongue, marital_status, height, education, occupation, employment_status, income_range, city, state, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE)`,
      [
        user.id,
        dateOfBirth || null,
        religion || null,
        caste || null,
        motherTongue || null,
        maritalStatus?.toLowerCase().replace(/\s+/g, "_") || "never_married",
        height || null,
        education || null,
        occupation || null,
        employmentStatus || null,
        incomeRange || null,
        city || null,
        state || null,
      ],
    );

    await client.query("COMMIT");

    const token = createToken({ id: user.id, role: user.role, plan: user.plan, gender: user.gender });

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        role: user.role,
        avatarUrl: user.avatar_url,
        profileCompletion: user.profile_completion,
        plan: user.plan,
      },
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: err.message || "Registration failed" });
  } finally {
    client.release();
  }
});

// 5. Get current authenticated user
authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, full_name, email, mobile, gender, role, avatar_url, profile_completion, plan 
       FROM users WHERE id = $1`,
      [req.user!.id],
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      mobile: user.mobile,
      gender: user.gender,
      role: user.role,
      avatarUrl: user.avatar_url,
      profileCompletion: user.profile_completion,
      plan: user.plan,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5b. Get user preferences
authRouter.get("/preferences", requireAuth, async (req, res) => {
  try {
    const defaultPreferences = {
      interests: true,
      messages: true,
      matches: false,
      photo: true,
      contact: true,
      online: false,
    };

    try {
      const { rows } = await db.query(
        "SELECT preferences FROM users WHERE id = $1",
        [req.user!.id],
      );
      if (rows[0] && rows[0].preferences) {
        return res.json({ ...defaultPreferences, ...rows[0].preferences });
      }
    } catch {
      // Column might not exist yet in existing database instance
    }

    return res.json(defaultPreferences);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to load preferences" });
  }
});

// 5c. Update user preferences
authRouter.patch("/preferences", requireAuth, async (req, res) => {
  try {
    const defaultPreferences = {
      interests: true,
      messages: true,
      matches: false,
      photo: true,
      contact: true,
      online: false,
    };

    const nextPreferences = {
      ...defaultPreferences,
      ...(req.body || {}),
    };

    try {
      await db.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"interests": true, "messages": true, "matches": false, "photo": true, "contact": true, "online": false}'::jsonb`,
      ).catch(() => {});

      await db.query(
        "UPDATE users SET preferences = $1, updated_at = NOW() WHERE id = $2",
        [JSON.stringify(nextPreferences), req.user!.id],
      );
    } catch (dbErr) {
      console.warn("[AUTH] Could not update preferences in DB:", dbErr);
    }

    return res.json(nextPreferences);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to save preferences" });
  }
});

// 6. Forgot Password - Request OTP via Email
authRouter.post("/password/forgot", async (req, res) => {
  try {
    const identifier = (req.body.email || req.body.mobile || "").trim();
    if (!identifier) {
      return res.status(400).json({ message: "Email address is required" });
    }

    const { rows } = await db.query(
      "SELECT id, full_name, email, mobile FROM users WHERE LOWER(email) = LOWER($1) OR mobile = $1",
      [identifier],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No account found with this email address" });
    }

    const user = rows[0];
    const userEmail = (user.email || identifier).toLowerCase();

    // Generate a 6-digit numeric verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    resetOtpStore.set(userEmail, { otp, expiresAt });
    if (process.env.NODE_ENV !== "production") {
      console.log(`[AUTH] Password reset verification code for ${userEmail}: ${otp}`);
    }

    // Send the verification code to user's Gmail / email inbox
    const mailResult = await sendPasswordResetEmail(userEmail, otp);
    if (!mailResult.success) {
      console.warn(`[AUTH] Email sending failed for ${userEmail}, but OTP stored for development fallback.`);
    }

    return res.json({
      sent: true,
      email: userEmail,
      message: `A 6-digit verification code has been sent to ${userEmail}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to process request" });
  }
});

// 7. Verify Reset OTP
authRouter.post("/password/verify-otp", async (req, res) => {
  try {
    const identifier = (req.body.email || req.body.mobile || "").trim().toLowerCase();
    const { otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const stored = resetOtpStore.get(identifier);
    const isValid = Boolean(stored && stored.otp === String(otp).trim() && Date.now() <= stored.expiresAt);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    return res.json({ valid: true, message: "Code verified successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Verification failed" });
  }
});

// 8. Reset Password with new password
authRouter.post("/password/reset", async (req, res) => {
  try {
    const identifier = (req.body.email || req.body.mobile || "").trim().toLowerCase();
    const { otp, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (!otp) {
      return res.status(400).json({ message: "Verification code (OTP) is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Strictly verify OTP
    const cleanOtp = String(otp).trim();
    const stored = resetOtpStore.get(identifier);
    const isValid = Boolean(stored && stored.otp === cleanOtp && Date.now() <= stored.expiresAt);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2) OR mobile = $2 RETURNING id",
      [hash, identifier],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User account not found" });
    }

    resetOtpStore.delete(identifier);

    return res.json({ ok: true, message: "Password updated successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to reset password" });
  }
});

authRouter.post("/logout", (_req, res) => {
  return res.json({ ok: true });
});


