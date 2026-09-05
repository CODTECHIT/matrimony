import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

export const adminRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const ADMIN_LOGIN_ID = process.env.ADMIN_LOGIN_ID || "admin@yfjmatrimony.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@YFJ2026";

// Dedicated Admin Login (ID & Password)
adminRouter.post("/login", async (req, res) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ message: "Login ID and password are required" });
    }

    // 1. Check direct configured admin credentials from environment
    const matchesEnvAdmin =
      loginId.trim().toLowerCase() === ADMIN_LOGIN_ID.toLowerCase() && password === ADMIN_PASSWORD;

    if (matchesEnvAdmin) {
      const token = jwt.sign({ id: "admin-super", role: "admin", plan: "platinum" }, JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.json({
        token,
        user: {
          id: "admin-super",
          fullName: "YFJ Super Admin",
          email: ADMIN_LOGIN_ID,
          mobile: "+91 99999 99999",
          gender: "female",
          role: "admin",
          profileCompletion: 100,
          plan: "platinum",
        },
      });
    }

    // 2. Check database users table for an admin user
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .or(`email.eq.${loginId.trim()},mobile.eq.${loginId.trim()}`)
      .eq("role", "admin")
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ message: "Invalid administrative credentials" });
    }

    if (user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid administrative credentials" });
      }
    }

    const token = jwt.sign({ id: user.id, role: "admin", plan: user.plan }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        role: "admin",
        avatarUrl: user.avatar_url,
        profileCompletion: user.profile_completion,
        plan: user.plan,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Authentication error",
    });
  }
});

adminRouter.use(requireAdmin);

// 1. Admin Stats
adminRouter.get("/stats", async (_req, res) => {
  try {
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    const { count: activeSubs } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    const { count: pendingApprovals } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("profile_status", "pending");

    const { data: payments } = await supabase
      .from("payments")
      .select("amount_inr")
      .eq("status", "success");
    const revenueInr = (payments || []).reduce((sum, p) => sum + (p.amount_inr || 0), 0);

    return res.json({
      totalUsers: totalUsers || 0,
      activeUsers: Math.max(1, Math.floor((totalUsers || 0) * 0.8)),
      activeSubscriptions: activeSubs || 0,
      revenueInr: revenueInr || 0,
      newRegistrations: 12,
      pendingApprovals: pendingApprovals || 0,
      revenueSeries: [
        { month: "Jan", revenue: 45000 },
        { month: "Feb", revenue: 62000 },
        { month: "Mar", revenue: 78000 },
        { month: "Apr", revenue: 95000 },
        { month: "May", revenue: 110000 },
        { month: "Jun", revenue: 135000 },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. Admin Users List
adminRouter.get("/users", async (req, res) => {
  try {
    const q = req.query.q as string | undefined;
    let query = supabase
      .from("users")
      .select("id, full_name, mobile, gender, plan, profile_status, created_at, profiles(city)");

    if (q) {
      query = query.or(`full_name.ilike.%${q}%,mobile.ilike.%${q}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return res.status(400).json({ message: error.message });

    const formatted = (data || []).map((u: any) => ({
      id: u.id,
      fullName: u.full_name,
      mobile: u.mobile,
      gender: u.gender,
      city: u.profiles?.[0]?.city || "Not specified",
      plan: u.plan,
      profileStatus: u.profile_status,
      joinedAt: u.created_at,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Admin Single User
adminRouter.get("/users/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, mobile, gender, plan, profile_status, created_at, profiles(city)")
      .eq("id", req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ message: "User not found" });

    return res.json({
      id: data.id,
      fullName: data.full_name,
      mobile: data.mobile,
      gender: data.gender,
      city: (data as any).profiles?.[0]?.city || "Not specified",
      plan: data.plan,
      profileStatus: data.profile_status,
      joinedAt: data.created_at,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Update user status
adminRouter.patch("/users/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const { error } = await supabase
      .from("users")
      .update({ profile_status: status })
      .eq("id", req.params.id);

    if (error) return res.status(400).json({ message: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4b. Update user plan tier
adminRouter.patch("/users/:id/plan", async (req, res) => {
  try {
    const { plan } = req.body;
    const { error } = await supabase.from("users").update({ plan }).eq("id", req.params.id);

    if (error) return res.status(400).json({ message: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. Delete user
adminRouter.delete("/users/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("users").delete().eq("id", req.params.id);
    if (error) return res.status(400).json({ message: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. Admin Subscriptions
adminRouter.get("/subscriptions", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*, users!inner(full_name)")
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    const formatted = (data || []).map((s: any) => ({
      planId: s.plan_id,
      tier: s.tier,
      status: s.status,
      startedAt: s.started_at,
      expiresAt: s.expires_at,
      autoRenew: s.auto_renew,
      user: s.users?.full_name || "Unknown",
      permissions: s.permissions || {},
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 7. Admin Packages (Plans)
adminRouter.get("/packages", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("price_inr", { ascending: true });
    if (error) return res.status(400).json({ message: error.message });
    return res.json(
      (data || []).map((p: any) => ({
        id: p.id,
        tier: p.tier,
        name: p.name,
        priceInr: p.price_inr,
        durationMonths: p.duration_months,
        popular: p.popular,
        features: p.features || [],
        limits: p.limits || {},
      })),
    );
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/packages", async (req, res) => {
  try {
    const plan = req.body;
    const { data, error } = await supabase
      .from("plans")
      .insert({
        id: plan.id || `plan-${Date.now()}`,
        tier: plan.tier || "silver",
        name: plan.name,
        price_inr: plan.priceInr || 0,
        duration_months: plan.durationMonths || 1,
        popular: plan.popular || false,
        features: plan.features || [],
        limits: plan.limits || {},
      })
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });
    return res.json({
      id: data.id,
      tier: data.tier,
      name: data.name,
      priceInr: data.price_inr,
      durationMonths: data.duration_months,
      popular: data.popular,
      features: data.features,
      limits: data.limits,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.patch("/packages/:id", async (req, res) => {
  try {
    const plan = req.body;
    const updates: Record<string, any> = {};
    if (plan.name !== undefined) updates.name = plan.name;
    if (plan.priceInr !== undefined) updates.price_inr = plan.priceInr;
    if (plan.durationMonths !== undefined) updates.duration_months = plan.durationMonths;
    if (plan.popular !== undefined) updates.popular = plan.popular;
    if (plan.features !== undefined) updates.features = plan.features;
    if (plan.limits !== undefined) updates.limits = plan.limits;

    const { data, error } = await supabase
      .from("plans")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });
    return res.json({
      id: data.id,
      tier: data.tier,
      name: data.name,
      priceInr: data.price_inr,
      durationMonths: data.duration_months,
      popular: data.popular,
      features: data.features,
      limits: data.limits,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.delete("/packages/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("plans").delete().eq("id", req.params.id);
    if (error) return res.status(400).json({ message: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 8. Admin Payments
adminRouter.get("/payments", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*, users!inner(full_name), plans!inner(name)")
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    const formatted = (data || []).map((p: any) => ({
      id: p.id,
      user: p.users?.full_name || "Member",
      plan: p.plans?.name || "Subscription",
      amountInr: p.amount_inr,
      status: p.status,
      createdAt: p.created_at,
      gatewayRef: p.gateway_ref || "N/A",
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 9. Admin Reports
adminRouter.get("/reports", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select(
        "*, reported_user:users!reported_user_id(full_name), reporter:users!reported_by_id(full_name)",
      )
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    const formatted = (data || []).map((r: any) => ({
      id: r.id,
      reportedUser: r.reported_user?.full_name || "User",
      reportedBy: r.reporter?.full_name || "User",
      reason: r.reason,
      createdAt: r.created_at,
      status: r.status,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/reports/:id/resolve", async (req, res) => {
  try {
    const { error } = await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", req.params.id);
    if (error) return res.status(400).json({ message: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/reports/:id/block-and-resolve", async (req, res) => {
  try {
    const { data: report, error: fetchErr } = await supabase
      .from("reports")
      .select("reported_user_id")
      .eq("id", req.params.id)
      .single();

    if (!fetchErr && report?.reported_user_id) {
      await supabase
        .from("users")
        .update({ profile_status: "blocked" })
        .eq("id", report.reported_user_id);
    }

    const { error } = await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", req.params.id);

    if (error) return res.status(400).json({ message: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});
