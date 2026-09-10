import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

function createToken(payload: { id: string; role: "user" | "admin"; plan: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

// 1. Password login
authRouter.post("/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res.status(400).json({ message: "Mobile number and password are required" });
    }

    const { rows } = await db.query(
      `SELECT id, full_name, email, mobile, password_hash, gender, role, avatar_url, profile_completion, plan, profile_status 
       FROM users WHERE mobile = $1`,
      [mobile],
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    }

    const token = createToken({ id: user.id, role: user.role, plan: user.plan });

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
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ message: "Mobile required" });
  // In production, integrate AWS SNS or SMS gateway
  return res.json({ sent: true, expiresInSeconds: 60 });
});

// 3. Verify OTP
authRouter.post("/otp/verify", async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ message: "Mobile and OTP required" });

    const { rows } = await db.query(
      `SELECT id, full_name, email, mobile, gender, role, avatar_url, profile_completion, plan 
       FROM users WHERE mobile = $1`,
      [mobile],
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: "Account not found with this mobile" });
    }

    const token = createToken({ id: user.id, role: user.role, plan: user.plan });
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

// 4. Register
authRouter.post("/register", async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const {
      fullName,
      gender,
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

    if (!fullName || !gender || !mobile) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Full name, gender, and mobile are required" });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    // Check existing
    const existing = await client.query("SELECT id FROM users WHERE mobile = $1", [mobile]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "An account with this mobile number already exists" });
    }

    // Insert user
    const userRes = await client.query(
      `INSERT INTO users (full_name, gender, mobile, password_hash, role, plan, profile_completion, profile_status)
       VALUES ($1, $2, $3, $4, 'user', 'free', 40, 'pending')
       RETURNING id, full_name, email, mobile, gender, role, avatar_url, profile_completion, plan`,
      [fullName, gender.toLowerCase(), mobile, passwordHash],
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

    const token = createToken({ id: user.id, role: user.role, plan: user.plan });

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

// 6. Forgot & Reset Password
authRouter.post("/password/forgot", async (req, res) => {
  return res.json({ sent: true });
});

authRouter.post("/password/reset", async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password)
    return res.status(400).json({ message: "Mobile and password required" });
  const hash = await bcrypt.hash(password, 10);
  await db.query("UPDATE users SET password_hash = $1 WHERE mobile = $2", [hash, mobile]);
  return res.json({ ok: true });
});

authRouter.post("/logout", (_req, res) => {
  return res.json({ ok: true });
});

authRouter.get("/google/url", (_req, res) => {
  return res.json({ url: "" });
});
