import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";
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

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("mobile", mobile)
      .single();

    if (error || !user) {
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
  // In production, integrate SMS provider (Twilio / AWS SNS / MSG91)
  return res.json({ sent: true, expiresInSeconds: 60 });
});

// 3. Verify OTP
authRouter.post("/otp/verify", async (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) return res.status(400).json({ message: "Mobile and OTP required" });

  const { data: user } = await supabase.from("users").select("*").eq("mobile", mobile).single();

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
});

// 4. Register
authRouter.post("/register", async (req, res) => {
  try {
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
      return res.status(400).json({ message: "Full name, gender, and mobile are required" });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    // Insert user
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        full_name: fullName,
        gender: gender.toLowerCase(),
        mobile,
        password_hash: passwordHash,
        role: "user",
        plan: "free",
        profile_completion: 40,
        profile_status: "pending",
      })
      .select()
      .single();

    if (userError) {
      return res.status(400).json({ message: userError.message });
    }

    // Insert initial profile record
    await supabase.from("profiles").insert({
      id: user.id,
      date_of_birth: dateOfBirth || null,
      religion: religion || null,
      caste: caste || null,
      mother_tongue: motherTongue || null,
      marital_status: maritalStatus?.toLowerCase().replace(/\s+/g, "_") || "never_married",
      height: height || null,
      education: education || null,
      occupation: occupation || null,
      employment_status: employmentStatus || null,
      income_range: incomeRange || null,
      city: city || null,
      state: state || null,
      verified: false,
    });

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
    return res.status(500).json({ message: err.message || "Registration failed" });
  }
});

// 5. Get current authenticated user
authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user!.id)
      .single();

    if (error || !user) {
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
  await supabase.from("users").update({ password_hash: hash }).eq("mobile", mobile);
  return res.json({ ok: true });
});

authRouter.post("/logout", (_req, res) => {
  return res.json({ ok: true });
});

authRouter.get("/google/url", (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback";

  if (!clientId || clientId.includes("your_google_client_id")) {
    return res.json({ url: "" });
  }

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId,
  )}&redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent`;

  return res.json({ url });
});

authRouter.get("/google/callback", async (req, res) => {
  const code = req.query.code as string;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=oauth_missing_code`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback";

    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      return res.redirect(`${frontendUrl}/login?error=oauth_token_exchange_failed`);
    }

    // 2. Retrieve user identity from Google
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = (await userinfoRes.json()) as {
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!googleUser.email) {
      return res.redirect(`${frontendUrl}/login?error=oauth_email_missing`);
    }

    // 3. Find or create user in Supabase
    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", googleUser.email)
      .maybeSingle();

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          full_name: googleUser.name || "Google Member",
          email: googleUser.email,
          mobile: `+91-${Date.now().toString().slice(-10)}`,
          avatar_url: googleUser.picture || null,
          gender: "female",
          role: "user",
          plan: "free",
          profile_completion: 40,
          profile_status: "approved",
        })
        .select()
        .single();

      if (!insertError && newUser) {
        user = newUser;
        await supabase.from("profiles").insert({
          id: user.id,
          verified: true,
          about: "Joined via Google sign-in.",
        });
      }
    }

    if (!user) {
      return res.redirect(`${frontendUrl}/login?error=oauth_user_creation_failed`);
    }

    const token = createToken({ id: user.id, role: user.role, plan: user.plan });
    const userPayload = encodeURIComponent(
      JSON.stringify({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        role: user.role,
        avatarUrl: user.avatar_url,
        profileCompletion: user.profile_completion,
        plan: user.plan,
      }),
    );

    return res.redirect(`${frontendUrl}/login?token=${token}&user=${userPayload}`);
  } catch {
    return res.redirect(`${frontendUrl}/login?error=oauth_server_error`);
  }
});

