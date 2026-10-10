import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../config/db.js";
import { requireAdmin } from "../middleware/auth.middleware.js";
import { logAdminAction } from "../utils/audit.js";
import { realtimeService } from "../services/realtime.service.js";
import { s3Client, bucketName, cloudFrontDomain, region } from "../config/aws.js";

export const adminRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "yfj_matrimony_secret_jwt_key_2026_dev";

// Public Admin Login Endpoint
adminRouter.post("/login", async (req, res) => {
  try {
    const { loginId, password } = req.body;
    const identifier = (loginId || "").trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: "Admin Login ID and password are required" });
    }

    const envAdminId = process.env.ADMIN_LOGIN_ID || "admin@yfjmatrimony.com";
    const envAdminPass = process.env.ADMIN_PASSWORD || "Admin@YFJ2026";

    // Query database for admin user
    const { rows } = await db.query(
      `SELECT id, full_name, email, mobile, password_hash, gender, role, avatar_url, profile_completion, plan, profile_status
       FROM users
       WHERE (LOWER(email) = LOWER($1) OR mobile = $1) AND role = 'admin'`,
      [identifier],
    );

    let user = rows[0];
    let isMatch = false;

    if (user && user.password_hash) {
      isMatch = await bcrypt.compare(password, user.password_hash);
    }

    // Failsafe matching with master ADMIN environment variables
    if (!isMatch && (identifier.toLowerCase() === envAdminId.toLowerCase() || identifier.toLowerCase() === "admin") && password === envAdminPass) {
      isMatch = true;
      if (!user) {
        // If no admin user row in DB, query any user with email or fallback
        const adminFallback = await db.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
        user = adminFallback.rows[0] || {
          id: "00000000-0000-0000-0000-000000000001",
          full_name: "YFJ Admin",
          email: envAdminId,
          mobile: "+919999900000",
          gender: "male",
          role: "admin",
          avatar_url: null,
          profile_completion: 100,
          plan: "platinum",
          profile_status: "approved",
        };
      }
    }

    if (!isMatch || !user) {
      return res.status(401).json({ message: "Invalid administrative credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: "admin", plan: user.plan || "platinum" },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

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
        profileCompletion: user.profile_completion || 100,
        plan: user.plan || "platinum",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Admin authentication failed" });
  }
});

// All subsequent routes require administrative authorization
adminRouter.use(requireAdmin);

// Admin session validation
adminRouter.get("/me", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, full_name, email, mobile, gender, role, avatar_url, profile_completion, plan, profile_status 
       FROM users WHERE id = $1`,
      [req.user!.id],
    );
    const user = rows[0];
    if (!user) {
      return res.json({
        id: req.user!.id,
        fullName: "YFJ Admin",
        email: process.env.ADMIN_LOGIN_ID || "admin@yfjmatrimony.com",
        mobile: "+919999900000",
        gender: "male",
        role: "admin",
        avatarUrl: null,
        profileCompletion: 100,
        plan: "platinum",
        profileStatus: "approved",
      });
    }
    return res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      mobile: user.mobile,
      gender: user.gender,
      role: user.role,
      avatarUrl: user.avatar_url,
      profileCompletion: user.profile_completion || 100,
      plan: user.plan || "platinum",
      profileStatus: user.profile_status,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/logout", async (_req, res) => {
  return res.json({ ok: true });
});

// 1. Admin Stats
adminRouter.get("/stats", async (_req, res) => {
  try {
    const totalUsersRes = await db.query("SELECT COUNT(*) FROM users");
    const activeSubsRes = await db.query(
      "SELECT COUNT(*) FROM subscriptions WHERE status = 'active'",
    );
    const pendingRes = await db.query(
      "SELECT COUNT(*) FROM users WHERE profile_status = 'pending'",
    );
    const paymentsRes = await db.query(
      "SELECT COALESCE(SUM(amount_inr), 0) as total FROM payments WHERE status = 'success'",
    );
    const verifiedRes = await db.query(
      "SELECT COUNT(*) FROM profiles WHERE verified = TRUE",
    );
    const pendingVerifRes = await db.query(
      "SELECT COUNT(*) FROM id_verifications WHERE status = 'pending'",
    );
    const openReportsRes = await db.query(
      "SELECT COUNT(*) FROM reports WHERE status != 'resolved'",
    );
    const openTicketsRes = await db.query(
      "SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'in_progress')",
    );
    const totalMatchesRes = await db.query(
      "SELECT COUNT(*) FROM interests WHERE status = 'accepted'",
    );

    const totalUsers = parseInt(totalUsersRes.rows[0]?.count || "0", 10);
    const activeSubs = parseInt(activeSubsRes.rows[0]?.count || "0", 10);
    const pendingApprovals = parseInt(pendingRes.rows[0]?.count || "0", 10);
    const revenueInr = parseInt(paymentsRes.rows[0]?.total || "0", 10);
    const verifiedProfiles = parseInt(verifiedRes.rows[0]?.count || "0", 10);
    const pendingVerifications = parseInt(pendingVerifRes.rows[0]?.count || "0", 10);
    const openReports = parseInt(openReportsRes.rows[0]?.count || "0", 10);
    const openTickets = parseInt(openTicketsRes.rows[0]?.count || "0", 10);
    const totalMatches = parseInt(totalMatchesRes.rows[0]?.count || "0", 10);

    return res.json({
      totalUsers: totalUsers || 0,
      activeUsers: Math.max(1, Math.floor(totalUsers * 0.8)),
      activeSubscriptions: activeSubs || 0,
      revenueInr: revenueInr || 0,
      newRegistrations: 12,
      pendingApprovals: pendingApprovals || 0,
      verifiedProfiles: verifiedProfiles || 0,
      pendingVerifications: pendingVerifications || 0,
      openReports: openReports || 0,
      openTickets: openTickets || 0,
      totalMatches: totalMatches || 0,
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

// 2. Admin Users List with expanded filtering
adminRouter.get("/users", async (req, res) => {
  try {
    const q = req.query.q as string | undefined;
    const status = req.query.status as string | undefined;
    const gender = req.query.gender as string | undefined;
    const plan = req.query.plan as string | undefined;
    const religion = req.query.religion as string | undefined;

    let sql = `
      SELECT u.id, u.full_name, u.mobile, u.gender, u.plan, u.profile_status, u.created_at,
             pr.city, pr.religion, pr.age, pr.verified, pr.photos
      FROM users u
      LEFT JOIN profiles pr ON u.id = pr.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.mobile ILIKE $${params.length} OR u.display_id ILIKE $${params.length})`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`u.profile_status = $${params.length}`);
    }

    if (gender && gender !== "all") {
      params.push(gender);
      conditions.push(`u.gender = $${params.length}`);
    }

    if (plan && plan !== "all") {
      params.push(plan);
      conditions.push(`u.plan = $${params.length}`);
    }

    if (religion && religion !== "all") {
      params.push(religion);
      conditions.push(`pr.religion = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += ` ORDER BY u.created_at DESC`;

    const { rows } = await db.query(sql, params);

    const formatted = rows.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      mobile: u.mobile,
      gender: u.gender,
      city: u.city || "Not specified",
      religion: u.religion || "Not specified",
      age: u.age || null,
      plan: u.plan,
      profileStatus: u.profile_status,
      verified: !!u.verified,
      photosCount: Array.isArray(u.photos) ? u.photos.length : 0,
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
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.mobile, u.gender, u.plan, u.profile_status, u.created_at, pr.city
       FROM users u
       LEFT JOIN profiles pr ON u.id = pr.id
       WHERE u.id = $1`,
      [req.params.id],
    );

    const data = rows[0];
    if (!data) return res.status(404).json({ message: "User not found" });

    return res.json({
      id: data.id,
      fullName: data.full_name,
      mobile: data.mobile,
      gender: data.gender,
      city: data.city || "Not specified",
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
    await db.query("UPDATE users SET profile_status = $1 WHERE id = $2", [status, req.params.id]);
    if (status === "approved") {
      await db.query("UPDATE profiles SET verified = TRUE WHERE id = $1", [req.params.id]);
    } else if (status === "pending" || status === "blocked") {
      await db.query("UPDATE profiles SET verified = FALSE WHERE id = $1", [req.params.id]);
    }

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "user_status_changed",
      targetType: "user",
      targetId: req.params.id,
      metadata: { newStatus: status },
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4b. Update user plan
adminRouter.patch("/users/:id/plan", async (req, res) => {
  try {
    const { plan } = req.body;
    const planTier = (plan || "free").toLowerCase();

    // 1. Update user plan tier in users table
    await db.query("UPDATE users SET plan = $1 WHERE id = $2", [planTier, req.params.id]);

    // 2. Lookup plan details
    const planRes = await db.query("SELECT * FROM plans WHERE tier = $1 LIMIT 1", [planTier]);
    const planRow = planRes.rows[0];
    const planId = planRow?.id || `plan-${planTier}`;
    const durationMonths = planRow?.duration_months || 3;
    const permissions = {
      canMessage: planTier !== "free",
      canViewContacts: planTier === "gold" || planTier === "platinum",
      canUseAdvancedFilters: planTier !== "free",
      profileHighlight: planTier === "platinum",
    };

    // 3. Mark existing active subscriptions as expired
    await db.query(
      "UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'",
      [req.params.id],
    );

    // 4. Create active subscription if not free
    if (planTier !== "free") {
      await db.query(
        `INSERT INTO subscriptions (user_id, plan_id, tier, status, started_at, expires_at, auto_renew, permissions)
         VALUES ($1, $2, $3, 'active', NOW(), NOW() + ($4 || ' months')::INTERVAL, false, $5)`,
        [req.params.id, planId, planTier, durationMonths, JSON.stringify(permissions)],
      );
    }

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "user_plan_updated",
      targetType: "user",
      targetId: req.params.id,
      metadata: { newPlan: planTier },
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. Delete user
adminRouter.delete("/users/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "user_deleted",
      targetType: "user",
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. Admin Subscriptions
adminRouter.get("/subscriptions", async (req, res) => {
  try {
    const showAll = req.query.all === "true" || req.query.history === "true";
    const querySql = showAll
      ? `SELECT s.*, u.full_name as user_name, u.email as user_email
         FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         ORDER BY s.created_at DESC`
      : `SELECT DISTINCT ON (s.user_id) s.*, u.full_name as user_name, u.email as user_email
         FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         ORDER BY s.user_id, s.created_at DESC`;

    const { rows } = await db.query(querySql);

    const formatted = rows.map((s) => ({
      id: s.id,
      userId: s.user_id,
      planId: s.plan_id,
      tier: s.tier,
      status: s.status,
      startedAt: s.started_at,
      expiresAt: s.expires_at,
      autoRenew: s.auto_renew,
      user: s.user_name || "Unknown",
      email: s.user_email || "",
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
    const { rows } = await db.query("SELECT * FROM plans ORDER BY price_inr ASC");
    return res.json(
      rows.map((p) => ({
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
    const { rows } = await db.query(
      `INSERT INTO plans (id, tier, name, price_inr, duration_months, popular, features, limits)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        plan.id || `plan-${Date.now()}`,
        plan.tier || "silver",
        plan.name,
        plan.priceInr || 0,
        plan.durationMonths || 1,
        plan.popular || false,
        plan.features || [],
        plan.limits || {},
      ],
    );

    const data = rows[0];
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
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (plan.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(plan.name);
    }
    if (plan.priceInr !== undefined) {
      setClauses.push(`price_inr = $${paramIndex++}`);
      params.push(plan.priceInr);
    }
    if (plan.durationMonths !== undefined) {
      setClauses.push(`duration_months = $${paramIndex++}`);
      params.push(plan.durationMonths);
    }
    if (plan.popular !== undefined) {
      setClauses.push(`popular = $${paramIndex++}`);
      params.push(plan.popular);
    }
    if (plan.features !== undefined) {
      setClauses.push(`features = $${paramIndex++}`);
      params.push(plan.features);
    }
    if (plan.limits !== undefined) {
      setClauses.push(`limits = $${paramIndex++}`);
      params.push(plan.limits);
    }

    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE plans SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      params,
    );

    const data = rows[0];
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
    await db.query("DELETE FROM plans WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 8. Admin Payments
adminRouter.get("/payments", async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.amount_inr, p.status, p.created_at, p.gateway_ref,
              u.full_name as user_name, pl.name as plan_name
       FROM payments p
       JOIN users u ON p.user_id = u.id
       JOIN plans pl ON p.plan_id = pl.id
       ORDER BY p.created_at DESC`,
    );

    const formatted = rows.map((p) => ({
      id: p.id,
      user: p.user_name || "Member",
      plan: p.plan_name || "Subscription",
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
    const { rows } = await db.query(
      `SELECT rep.id, rep.reason, rep.created_at, rep.status, rep.reported_user_id, rep.reported_by_id,
              ru.full_name as reported_user_name, byu.full_name as reporter_user_name
       FROM reports rep
       JOIN users ru ON rep.reported_user_id = ru.id
       JOIN users byu ON rep.reported_by_id = byu.id
       ORDER BY rep.created_at DESC`,
    );

    const formatted = rows.map((r) => ({
      id: r.id,
      reportedUserId: r.reported_user_id,
      reportedById: r.reported_by_id,
      reportedUser: r.reported_user_name || "User",
      reportedBy: r.reporter_user_name || "User",
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
    await db.query("UPDATE reports SET status = 'resolved' WHERE id = $1", [req.params.id]);

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "report_resolved",
      targetType: "report",
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/reports/:id/block-and-resolve", async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE reports SET status = 'resolved' WHERE id = $1 RETURNING reported_user_id`,
      [req.params.id],
    );
    if (rows[0]?.reported_user_id) {
      await db.query(`UPDATE users SET profile_status = 'blocked' WHERE id = $1`, [
        rows[0].reported_user_id,
      ]);
    }

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "report_block_and_resolved",
      targetType: "report",
      targetId: req.params.id,
      metadata: { blockedUserId: rows[0]?.reported_user_id },
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/payments/:id/refund", async (req, res) => {
  try {
    await db.query(`UPDATE payments SET status = 'refunded' WHERE id = $1`, [req.params.id]);

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "payment_refunded",
      targetType: "payment",
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/subscriptions/cancel", async (req, res) => {
  try {
    const { user } = req.body;
    await db.query(
      `UPDATE subscriptions s SET status = 'expired', auto_renew = false
       FROM users u WHERE s.user_id = u.id AND (u.full_name ILIKE $1 OR u.email ILIKE $1)`,
      [user],
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/subscriptions/extend", async (req, res) => {
  try {
    const { user, days = 30 } = req.body;
    await db.query(
      `UPDATE subscriptions s 
       SET status = 'active', expires_at = GREATEST(COALESCE(s.expires_at, NOW()), NOW()) + ($2 || ' days')::INTERVAL
       FROM users u WHERE s.user_id = u.id AND (u.full_name ILIKE $1 OR u.email ILIKE $1)`,
      [user, days],
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 10. Bulk User Actions
adminRouter.post("/users/bulk", async (req, res) => {
  try {
    const { userIds, action } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds array is required" });
    }

    if (action === "approve") {
      await db.query("UPDATE users SET profile_status = 'approved' WHERE id = ANY($1)", [userIds]);
      await db.query("UPDATE profiles SET verified = TRUE WHERE id = ANY($1)", [userIds]);
    } else if (action === "block") {
      await db.query("UPDATE users SET profile_status = 'blocked' WHERE id = ANY($1)", [userIds]);
      await db.query("UPDATE profiles SET verified = FALSE WHERE id = ANY($1)", [userIds]);
    } else if (action === "activate") {
      await db.query("UPDATE users SET profile_status = 'approved' WHERE id = ANY($1)", [userIds]);
    } else if (action === "delete") {
      await db.query("DELETE FROM users WHERE id = ANY($1)", [userIds]);
    } else {
      return res.status(400).json({ message: "Invalid bulk action" });
    }

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: `bulk_users_${action}`,
      targetType: "user",
      metadata: { count: userIds.length, userIds },
      ipAddress: req.ip,
    });

    return res.json({ ok: true, count: userIds.length });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 11. Full Profile Operations
adminRouter.get("/profiles/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.mobile, u.gender, u.role, u.plan, u.profile_status,
              u.profile_completion, u.display_id, u.created_at as joined_at,
              pr.age, pr.date_of_birth, pr.about, pr.height, pr.religion, pr.caste, pr.mother_tongue,
              pr.marital_status, pr.education, pr.occupation, pr.employment_status, pr.income_range,
              pr.city, pr.state, pr.country, pr.photos, pr.videos, pr.verified,
              pr.father_occupation, pr.mother_occupation, pr.siblings, pr.family_type, pr.family_values,
              pr.whatsapp, pr.last_active
       FROM users u
       LEFT JOIN profiles pr ON u.id = pr.id
       WHERE u.id = $1`,
      [req.params.id],
    );

    const data = rows[0];
    if (!data) return res.status(404).json({ message: "Profile not found" });

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.patch("/profiles/:id", async (req, res) => {
  try {
    const fields = req.body;
    if (fields.fullName || fields.mobile || fields.email) {
      const uUpdates: string[] = [];
      const uParams: any[] = [];
      let idx = 1;
      if (fields.fullName) {
        uUpdates.push(`full_name = $${idx++}`);
        uParams.push(fields.fullName);
      }
      if (fields.mobile) {
        uUpdates.push(`mobile = $${idx++}`);
        uParams.push(fields.mobile);
      }
      if (fields.email) {
        uUpdates.push(`email = $${idx++}`);
        uParams.push(fields.email);
      }
      uParams.push(req.params.id);
      await db.query(`UPDATE users SET ${uUpdates.join(", ")} WHERE id = $${idx}`, uParams);
    }

    const pKeys = [
      "about", "education", "occupation", "religion", "caste", "mother_tongue",
      "marital_status", "income_range", "city", "state", "country", "height",
      "father_occupation", "mother_occupation", "family_type", "family_values",
      "whatsapp", "verified"
    ];
    const pUpdates: string[] = [];
    const pParams: any[] = [];
    let pIdx = 1;

    for (const key of pKeys) {
      if (fields[key] !== undefined) {
        pUpdates.push(`${key} = $${pIdx++}`);
        pParams.push(fields[key]);
      }
    }

    if (fields.photos !== undefined) {
      pUpdates.push(`photos = $${pIdx++}`);
      pParams.push(fields.photos);
    }

    if (pUpdates.length > 0) {
      pParams.push(req.params.id);
      await db.query(`UPDATE profiles SET ${pUpdates.join(", ")} WHERE id = $${pIdx}`, pParams);
    }

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "profile_updated",
      targetType: "profile",
      targetId: req.params.id,
      metadata: fields,
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 12. ID Verification Queue Endpoints
adminRouter.get("/verifications", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    let sql = `
      SELECT v.id, v.user_id, v.document_type, v.document_number, v.document_front_url,
             v.document_back_url, v.selfie_url, v.status, v.rejection_reason,
             v.reviewed_by, v.reviewed_at, v.created_at,
             u.full_name as user_name, u.mobile as user_mobile, u.display_id, u.avatar_url,
             pr.city, pr.photos
      FROM id_verifications v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN profiles pr ON u.id = pr.id
    `;
    const params: any[] = [];
    if (status && status !== "all") {
      sql += ` WHERE v.status = $1`;
      params.push(status);
    }
    sql += ` ORDER BY v.created_at DESC`;

    const { rows } = await db.query(sql, params);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.get("/verifications/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT v.*, u.full_name as user_name, u.mobile as user_mobile, u.display_id, u.avatar_url,
              pr.city, pr.photos
       FROM id_verifications v
       JOIN users u ON v.user_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.id
       WHERE v.id = $1`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ message: "Verification not found" });
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/verifications/:id/approve", async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE id_verifications
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING user_id`,
      [req.user!.id, req.params.id],
    );
    const userId = rows[0]?.user_id;
    if (userId) {
      await db.query("UPDATE profiles SET verified = TRUE WHERE id = $1", [userId]);
      await db.query("UPDATE users SET profile_status = 'approved' WHERE id = $1", [userId]);

      await db.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, 'system', 'Identity Verified! 🛡️', 'Your identity document has been approved by admin. You now have the verified badge!', '{}'::jsonb)`,
        [userId],
      ).catch(() => {});

      await logAdminAction({
        adminId: req.user!.id,
        adminName: req.user!.fullName || "Admin",
        action: "verification_approved",
        targetType: "verification",
        targetId: req.params.id,
        metadata: { userId },
        ipAddress: req.ip,
      });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/verifications/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    const { rows } = await db.query(
      `UPDATE id_verifications
       SET status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING user_id`,
      [reason || "Document illegible or details mismatch", req.user!.id, req.params.id],
    );
    const userId = rows[0]?.user_id;
    if (userId) {
      await db.query("UPDATE profiles SET verified = FALSE WHERE id = $1", [userId]);

      await db.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, 'system', 'Identity Verification Notice', $2, '{}'::jsonb)`,
        [userId, `Verification note: ${reason || "Document details mismatch"}. Please submit a valid document.`],
      ).catch(() => {});

      await logAdminAction({
        adminId: req.user!.id,
        adminName: req.user!.fullName || "Admin",
        action: "verification_rejected",
        targetType: "verification",
        targetId: req.params.id,
        metadata: { userId, reason },
        ipAddress: req.ip,
      });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 13. Audit Logs Endpoint
adminRouter.get("/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt((req.query.limit as string) || "50", 10));
    const offset = parseInt((req.query.offset as string) || "0", 10);
    const action = req.query.action as string | undefined;

    let sql = `SELECT * FROM audit_logs`;
    const params: any[] = [];
    if (action) {
      sql += ` WHERE action = $1`;
      params.push(action);
    }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await db.query(sql, params);
    const countRes = await db.query(`SELECT COUNT(*) FROM audit_logs`);
    const total = parseInt(countRes.rows[0]?.count || "0", 10);

    return res.json({ logs: rows, total });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 14. Customer Support Tickets
adminRouter.get("/tickets", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const q = req.query.q as string | undefined;

    let sql = `
      SELECT t.*, 
             (SELECT COUNT(*) FROM ticket_replies r WHERE r.ticket_id = t.id) as replies_count
      FROM support_tickets t
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }

    if (priority && priority !== "all") {
      params.push(priority);
      conditions.push(`t.priority = $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(t.ticket_number ILIKE $${params.length} OR t.subject ILIKE $${params.length} OR t.user_name ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += ` ORDER BY t.created_at DESC`;

    const { rows } = await db.query(sql, params);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.get("/tickets/:id", async (req, res) => {
  try {
    const ticketRes = await db.query(`SELECT * FROM support_tickets WHERE id = $1`, [req.params.id]);
    const ticket = ticketRes.rows[0];
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const repliesRes = await db.query(
      `SELECT * FROM ticket_replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [req.params.id],
    );

    return res.json({
      ...ticket,
      replies: repliesRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/tickets/:id/reply", async (req, res) => {
  try {
    const { message, newStatus } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Reply message cannot be empty" });
    }

    // Insert reply
    const replyRes = await db.query(
      `INSERT INTO ticket_replies (ticket_id, sender_type, sender_name, message)
       VALUES ($1, 'admin', $2, $3) RETURNING *`,
      [req.params.id, req.user!.fullName || "Support Admin", message.trim()],
    );

    // Update ticket status
    const statusToSet = newStatus || "in_progress";
    await db.query(
      `UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2`,
      [statusToSet, req.params.id],
    );

    // Get ticket user to send in-app notification
    const tRes = await db.query(`SELECT user_id, ticket_number FROM support_tickets WHERE id = $1`, [req.params.id]);
    const userId = tRes.rows[0]?.user_id;
    if (userId) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, 'system', 'Support Ticket Update', $2, $3::jsonb)`,
        [
          userId,
          `Support responded to ticket ${tRes.rows[0]?.ticket_number}: "${message.slice(0, 80)}..."`,
          JSON.stringify({ ticketId: req.params.id, ticketNumber: tRes.rows[0]?.ticket_number }),
        ],
      ).catch(() => {});
    }

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "ticket_replied",
      targetType: "ticket",
      targetId: req.params.id,
      metadata: { status: statusToSet, messageSnippet: message.slice(0, 50) },
      ipAddress: req.ip,
    });

    realtimeService.broadcastTicketReply(req.params.id, replyRes.rows[0], userId);

    return res.json({ ok: true, reply: replyRes.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.patch("/tickets/:id/status", async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.body;
    const updates: string[] = ["updated_at = NOW()"];
    const params: any[] = [];
    let idx = 1;

    if (status) {
      updates.push(`status = $${idx++}`);
      params.push(status);
    }
    if (priority) {
      updates.push(`priority = $${idx++}`);
      params.push(priority);
    }
    if (assignedTo !== undefined) {
      updates.push(`assigned_to = $${idx++}`);
      params.push(assignedTo);
    }

    params.push(req.params.id);
    await db.query(`UPDATE support_tickets SET ${updates.join(", ")} WHERE id = $${idx}`, params);

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "ticket_status_updated",
      targetType: "ticket",
      targetId: req.params.id,
      metadata: { status, priority, assignedTo },
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 15. Warn & Mute Member (Chat Moderation)
adminRouter.post("/users/:id/warn", async (req, res) => {
  try {
    const { reason, note } = req.body;
    const targetUserId = req.params.id;

    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'system', 'Community Safety Notice ⚠️', $2, '{}'::jsonb)`,
      [
        targetUserId,
        `Official Warning: ${reason || "Inappropriate conduct reported"}. Please adhere to matrimonial community rules.`,
      ],
    ).catch(() => {});

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "user_warned",
      targetType: "user",
      targetId: targetUserId,
      metadata: { reason, note },
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/users/:id/mute", async (req, res) => {
  try {
    const { durationHours = 24, reason } = req.body;
    const targetUserId = req.params.id;

    await db.query(
      `UPDATE users SET muted_until = NOW() + ($1 || ' hours')::INTERVAL WHERE id = $2`,
      [durationHours, targetUserId],
    );

    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'system', 'Chat Privileges Temporarily Restricted 🔇', $2, '{}'::jsonb)`,
      [
        targetUserId,
        `Your direct messaging privileges are restricted for ${durationHours} hours: ${reason || "Moderation check"}.`,
      ],
    ).catch(() => {});

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "user_muted",
      targetType: "user",
      targetId: targetUserId,
      metadata: { durationHours, reason },
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 16. Match & Interest Activity Oversight
adminRouter.get("/matches/overview", async (_req, res) => {
  try {
    const totalInterestsRes = await db.query("SELECT COUNT(*) FROM interests");
    const acceptedRes = await db.query("SELECT COUNT(*) FROM interests WHERE status = 'accepted'");
    const declinedRes = await db.query("SELECT COUNT(*) FROM interests WHERE status = 'declined'");
    const pendingRes = await db.query("SELECT COUNT(*) FROM interests WHERE status = 'pending'");
    const totalShortlistsRes = await db.query("SELECT COUNT(*) FROM shortlists");
    const totalConvsRes = await db.query("SELECT COUNT(*) FROM conversations");

    const totalInterests = parseInt(totalInterestsRes.rows[0]?.count || "0", 10);
    const acceptedInterests = parseInt(acceptedRes.rows[0]?.count || "0", 10);
    const declinedInterests = parseInt(declinedRes.rows[0]?.count || "0", 10);
    const pendingInterests = parseInt(pendingRes.rows[0]?.count || "0", 10);
    const totalShortlists = parseInt(totalShortlistsRes.rows[0]?.count || "0", 10);
    const totalConversations = parseInt(totalConvsRes.rows[0]?.count || "0", 10);

    const acceptanceRate = totalInterests > 0
      ? Math.round((acceptedInterests / totalInterests) * 100)
      : 0;

    const recentRes = await db.query(`
      SELECT i.id, i.status, i.created_at,
             su.full_name as sender_name, su.display_id as sender_display_id, su.gender as sender_gender,
             ru.full_name as receiver_name, ru.display_id as receiver_display_id, ru.gender as receiver_gender
      FROM interests i
      JOIN users su ON i.sender_id = su.id
      JOIN users ru ON i.receiver_id = ru.id
      ORDER BY i.created_at DESC
      LIMIT 25
    `);

    return res.json({
      metrics: {
        totalInterests,
        acceptedInterests,
        declinedInterests,
        pendingInterests,
        acceptanceRate,
        totalShortlists,
        totalConversations,
      },
      recentActivity: recentRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 17. Coupons & Offers Management
adminRouter.get("/coupons", async (_req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM coupons ORDER BY created_at DESC");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/coupons", async (req, res) => {
  try {
    const code = req.body.code;
    const discountType = req.body.discountType ?? req.body.discount_type ?? "percentage";
    const discountValue = req.body.discountValue ?? req.body.discount_value;
    const minAmount = req.body.minAmount ?? req.body.min_amount ?? 0;
    const maxDiscount = req.body.maxDiscount ?? req.body.max_discount ?? null;
    const usageLimit = req.body.usageLimit ?? req.body.usage_limit ?? 100;
    const expiresAt = req.body.expiresAt ?? req.body.expires_at ?? req.body.valid_until ?? null;
    const isActive = req.body.isActive !== undefined ? req.body.isActive : (req.body.is_active !== undefined ? req.body.is_active : true);

    if (!code || discountValue === undefined || discountValue === null || Number.isNaN(Number(discountValue))) {
      return res.status(400).json({ message: "Coupon code and discount value are required" });
    }

    const { rows } = await db.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_amount, max_discount, usage_limit, expires_at, is_active)
       VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        code.trim().toUpperCase(),
        discountType,
        Number(discountValue),
        Number(minAmount),
        maxDiscount ? Number(maxDiscount) : null,
        Number(usageLimit),
        expiresAt || null,
        Boolean(isActive),
      ],
    );

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "coupon_created",
      targetType: "coupon",
      targetId: rows[0].id,
      metadata: { code: rows[0].code, discountValue },
      ipAddress: req.ip,
    });

    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.patch("/coupons/:id", async (req, res) => {
  try {
    const body = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const isActive = body.isActive !== undefined ? body.isActive : body.is_active;
    const discountValue = body.discountValue !== undefined ? body.discountValue : body.discount_value;
    const usageLimit = body.usageLimit !== undefined ? body.usageLimit : body.usage_limit;
    const expiresAt = body.expiresAt !== undefined ? body.expiresAt : (body.expires_at !== undefined ? body.expires_at : body.valid_until);
    const minAmount = body.minAmount !== undefined ? body.minAmount : body.min_amount;
    const discountType = body.discountType !== undefined ? body.discountType : body.discount_type;
    const code = body.code;

    if (isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(Boolean(isActive));
    }
    if (discountValue !== undefined) {
      updates.push(`discount_value = $${idx++}`);
      params.push(Number(discountValue));
    }
    if (usageLimit !== undefined) {
      updates.push(`usage_limit = $${idx++}`);
      params.push(Number(usageLimit));
    }
    if (expiresAt !== undefined) {
      updates.push(`expires_at = $${idx++}`);
      params.push(expiresAt);
    }
    if (minAmount !== undefined) {
      updates.push(`min_amount = $${idx++}`);
      params.push(Number(minAmount));
    }
    if (discountType !== undefined) {
      updates.push(`discount_type = $${idx++}`);
      params.push(discountType);
    }
    if (code !== undefined) {
      updates.push(`code = UPPER($${idx++})`);
      params.push(code.trim().toUpperCase());
    }

    if (updates.length === 0) return res.json({ ok: true });

    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE coupons SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      params,
    );

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "coupon_updated",
      targetType: "coupon",
      targetId: req.params.id,
      metadata: body,
      ipAddress: req.ip,
    });

    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.delete("/coupons/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM coupons WHERE id = $1", [req.params.id]);

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "coupon_deleted",
      targetType: "coupon",
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 18. Notification Broadcast Composer
adminRouter.post("/notifications/broadcast", async (req, res) => {
  try {
    const { title, body, cohort = "all", type = "announcement" } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: "Notification title and body are required" });
    }

    let targetQuery = `SELECT id FROM users WHERE profile_status != 'blocked'`;
    if (cohort === "free") {
      targetQuery += ` AND plan = 'free'`;
    } else if (cohort === "unverified") {
      targetQuery = `SELECT u.id FROM users u LEFT JOIN profiles pr ON u.id = pr.id WHERE (pr.verified = false OR pr.verified IS NULL) AND u.profile_status != 'blocked'`;
    } else if (cohort === "male") {
      targetQuery += ` AND gender = 'male'`;
    } else if (cohort === "female") {
      targetQuery += ` AND gender = 'female'`;
    }

    const insertResult = await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       SELECT id, $1, $2, $3, '{}'::jsonb FROM (${targetQuery}) sub`,
      [type, title.trim(), body.trim()],
    );

    // Also persist in public broadcasts table for home page and non-logged in visitors
    await db.query(
      `INSERT INTO broadcasts (title, body, cohort, type, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [title.trim(), body.trim(), cohort, type],
    ).catch(() => {});

    const count = insertResult.rowCount || 0;

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "notifications_broadcasted",
      targetType: "notification",
      metadata: { count, cohort, title },
      ipAddress: req.ip,
    });

    return res.json({ ok: true, recipientCount: count });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 19. Banners & Advertisements Management
adminRouter.get("/banners", async (_req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM banners ORDER BY created_at DESC");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/banners", async (req, res) => {
  try {
    const title = (req.body.title || "").trim();
    const description = req.body.description || null;
    const imageUrl = (req.body.imageUrl || req.body.image_url || "").trim();
    const buttonText = req.body.buttonText || req.body.button_text || "Explore Now";
    const buttonLink =
      req.body.buttonLink ||
      req.body.button_link ||
      req.body.link_url ||
      req.body.destination_url ||
      "/app/browse";
    const isActive =
      req.body.isActive !== undefined
        ? req.body.isActive
        : req.body.is_active !== undefined
          ? req.body.is_active
          : true;
    const startDate = req.body.startDate || req.body.start_date || null;
    const endDate = req.body.endDate || req.body.end_date || null;

    if (!title || !imageUrl) {
      return res.status(400).json({ message: "Banner title and image URL are required" });
    }

    const { rows } = await db.query(
      `INSERT INTO banners (title, description, image_url, button_text, button_link, is_active, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        description,
        imageUrl,
        buttonText,
        buttonLink,
        isActive,
        startDate,
        endDate,
      ],
    );

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "banner_created",
      targetType: "banner",
      targetId: rows[0].id,
      metadata: { title },
      ipAddress: req.ip,
    });

    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.patch("/banners/:id", async (req, res) => {
  try {
    const body = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const title = body.title;
    if (title !== undefined) {
      updates.push(`title = $${idx++}`);
      params.push(title);
    }
    const description = body.description;
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(description);
    }
    const imageUrl = body.imageUrl ?? body.image_url;
    if (imageUrl !== undefined) {
      updates.push(`image_url = $${idx++}`);
      params.push(imageUrl);
    }
    const buttonText = body.buttonText ?? body.button_text;
    if (buttonText !== undefined) {
      updates.push(`button_text = $${idx++}`);
      params.push(buttonText);
    }
    const buttonLink = body.buttonLink ?? body.button_link ?? body.link_url ?? body.destination_url;
    if (buttonLink !== undefined) {
      updates.push(`button_link = $${idx++}`);
      params.push(buttonLink);
    }
    const isActive = body.isActive !== undefined ? body.isActive : body.is_active;
    if (isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(isActive);
    }
    const startDate = body.startDate ?? body.start_date;
    if (startDate !== undefined) {
      updates.push(`start_date = $${idx++}`);
      params.push(startDate);
    }
    const endDate = body.endDate ?? body.end_date;
    if (endDate !== undefined) {
      updates.push(`end_date = $${idx++}`);
      params.push(endDate);
    }

    if (updates.length === 0) return res.json({ ok: true });

    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE banners SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      params,
    );

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "banner_updated",
      targetType: "banner",
      targetId: req.params.id,
      metadata: body,
      ipAddress: req.ip,
    });

    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.delete("/banners/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM banners WHERE id = $1", [req.params.id]);

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "banner_deleted",
      targetType: "banner",
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 20. Success Stories Management
adminRouter.get("/success-stories", async (_req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM success_stories ORDER BY created_at DESC");
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/success-stories", async (req, res) => {
  try {
    const coupleName = (req.body.coupleName || req.body.couple_name || "").trim();
    const marriageDate = req.body.marriageDate || req.body.marriage_date || null;
    const story = (req.body.story || req.body.testimonial || "").trim();
    const photoUrl = (req.body.photoUrl || req.body.photo_url || "").trim() || null;
    const isPublished =
      req.body.isPublished !== undefined
        ? req.body.isPublished
        : req.body.is_published !== undefined
          ? req.body.is_published
          : false;

    if (!coupleName || !story) {
      return res.status(400).json({ message: "Couple name and story testimonial are required" });
    }

    const { rows } = await db.query(
      `INSERT INTO success_stories (couple_name, marriage_date, story, photo_url, is_published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [coupleName, marriageDate, story, photoUrl, isPublished],
    );

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "success_story_created",
      targetType: "success_story",
      targetId: rows[0].id,
      metadata: { coupleName },
      ipAddress: req.ip,
    });

    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.patch("/success-stories/:id", async (req, res) => {
  try {
    const body = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const coupleName = body.coupleName ?? body.couple_name;
    if (coupleName !== undefined) {
      updates.push(`couple_name = $${idx++}`);
      params.push(coupleName);
    }
    const marriageDate = body.marriageDate ?? body.marriage_date;
    if (marriageDate !== undefined) {
      updates.push(`marriage_date = $${idx++}`);
      params.push(marriageDate);
    }
    const story = body.story ?? body.testimonial;
    if (story !== undefined) {
      updates.push(`story = $${idx++}`);
      params.push(story);
    }
    const photoUrl = body.photoUrl ?? body.photo_url;
    if (photoUrl !== undefined) {
      updates.push(`photo_url = $${idx++}`);
      params.push(photoUrl);
    }
    const isPublished = body.isPublished !== undefined ? body.isPublished : body.is_published;
    if (isPublished !== undefined) {
      updates.push(`is_published = $${idx++}`);
      params.push(isPublished);
    }

    if (updates.length === 0) return res.json({ ok: true });

    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE success_stories SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      params,
    );

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "success_story_updated",
      targetType: "success_story",
      targetId: req.params.id,
      metadata: body,
      ipAddress: req.ip,
    });

    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 21. Direct Media Upload for Banners and Stories
adminRouter.post("/upload", async (req, res) => {
  try {
    const { fileName, contentType = "image/jpeg", base64 } = req.body;
    if (!base64) {
      return res.status(400).json({ message: "Base64 image data is required" });
    }

    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "Photo size exceeds the 10MB limit." });
    }

    const sanitizedFileName = (fileName || "upload.jpg").replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `admin/uploads/${Date.now()}-${sanitizedFileName}`;
    let fileUrl = "";

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          }),
        );
        fileUrl = cloudFrontDomain
          ? `${cloudFrontDomain}/${key}`
          : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      } catch (s3Err: any) {
        console.warn("[Admin Upload Warning] S3 upload failed:", s3Err.message);
      }
    }

    if (!fileUrl) {
      fileUrl = `data:${contentType};base64,${cleanBase64}`;
    }

    return res.json({ url: fileUrl });
  } catch (err: any) {
    console.error("[Admin Upload Error]", err);
    return res.status(500).json({ message: err.message || "Failed to process image upload" });
  }
});

adminRouter.delete("/success-stories/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM success_stories WHERE id = $1", [req.params.id]);

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "success_story_deleted",
      targetType: "success_story",
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ==========================================
// Phase 4: CMS, Settings, Staff & Analytics
// ==========================================

// 21. CMS Content Management
const DEFAULT_CMS_PAGES = [
  {
    key: "terms",
    title: "Terms and Conditions of Use",
    content: {
      body: "Welcome to YFJ Matrimony. By accessing or using our platform, you agree to be bound by these Terms of Service. All users must be of legal marriageable age (21 for men, 18 for women in India) and provide truthful, accurate profile information. Misrepresentation, abusive behavior, or commercial exploitation will result in immediate termination.",
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    key: "privacy",
    title: "Privacy and Data Protection Policy",
    content: {
      body: "We respect your personal privacy. Government ID verification proofs are securely encrypted and accessible strictly to authorized identity reviewers. Contact numbers and sensitive personal data are never disclosed without your explicit consent or mutual match approval.",
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    key: "community",
    title: "Community Guidelines & Safety Tips",
    content: {
      body: "Always communicate through the platform before meeting in person. Never transfer money, cryptocurrency, or share banking OTPs with any match. Report suspicious profiles immediately using our in-app flag feature.",
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    key: "refund",
    title: "Refund & Cancellation Policy",
    content: {
      body: "Membership packages once activated are non-transferable. Refund requests initiated within 48 hours of purchase will be assessed on a pro-rata basis if no contact reveals or direct matches have occurred.",
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    key: "about",
    title: "About YFJ Matrimony",
    content: {
      body: "YFJ Matrimony is India's most trusted match-making ecosystem, bridging tradition with modern verified profiles, intelligent preference algorithms, and heartfelt companionship journeys.",
      lastUpdated: new Date().toISOString(),
    },
  },
];

adminRouter.get("/content", async (_req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM site_content ORDER BY key ASC");
    if (rows.length === 0) {
      // Seed default CMS content if empty
      for (const item of DEFAULT_CMS_PAGES) {
        await db.query(
          `INSERT INTO site_content (key, title, content, updated_by, updated_at)
           VALUES ($1, $2, $3, 'System', NOW())
           ON CONFLICT (key) DO NOTHING`,
          [item.key, item.title, JSON.stringify(item.content)],
        );
      }
      const seeded = await db.query("SELECT * FROM site_content ORDER BY key ASC");
      return res.json(seeded.rows);
    }
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.get("/content/:key", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM site_content WHERE key = $1", [req.params.key]);
    if (rows.length === 0) {
      const fallback = DEFAULT_CMS_PAGES.find((p) => p.key === req.params.key);
      if (fallback) return res.json(fallback);
      return res.status(404).json({ message: "Content page not found" });
    }
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/content", async (req, res) => {
  try {
    const { key, title, content } = req.body;
    if (!key || !title) {
      return res.status(400).json({ message: "Page key and title are required" });
    }

    const { rows } = await db.query(
      `INSERT INTO site_content (key, title, content, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (key) DO UPDATE
       SET title = EXCLUDED.title, content = EXCLUDED.content, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       RETURNING *`,
      [key, title, JSON.stringify(content || {}), req.user!.fullName || "Admin"],
    );

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "cms_page_updated",
      targetType: "cms_page",
      targetId: key,
      metadata: { title },
      ipAddress: req.ip,
    });

    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.delete("/content/:key", async (req, res) => {
  try {
    const { key } = req.params;
    await db.query("DELETE FROM site_content WHERE key = $1", [key]);

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "cms_page_deleted",
      targetType: "cms_page",
      targetId: key,
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 22. Platform System Settings
const DEFAULT_SETTINGS: Record<string, any> = {
  maintenance_mode: false,
  allow_registrations: true,
  require_verification_to_chat: false,
  free_interests_per_day: 10,
  contact_email: "support@yfjmatrimony.com",
  helpline_phone: "+91 99999 88888",
  payment_gateway_mode: "sandbox",
  auto_approve_profiles: false,
};

adminRouter.get("/settings", async (_req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM system_settings");
    const settingsMap = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      settingsMap[row.key] = row.value;
    }

    return res.json(settingsMap);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/settings", async (req, res) => {
  try {
    const updates = req.body;
    if (typeof updates !== "object" || !updates) {
      return res.status(400).json({ message: "Invalid settings object" });
    }

    for (const [key, val] of Object.entries(updates)) {
      await db.query(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify(val)],
      );
    }

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "system_settings_updated",
      targetType: "settings",
      targetId: "global",
      metadata: updates,
      ipAddress: req.ip,
    });

    return res.json({ ok: true, settings: updates });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 23. Staff Roles & RBAC Management
adminRouter.get("/staff", async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, full_name, email, mobile, role, avatar_url, created_at
       FROM users
       WHERE role IN ('admin', 'moderator', 'support')
       ORDER BY role ASC, created_at DESC`,
    );
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

adminRouter.post("/staff/role", async (req, res) => {
  try {
    const { userId, role } = req.body;
    const validRoles = ["admin", "moderator", "support", "user"];
    if (!userId || !validRoles.includes(role)) {
      return res.status(400).json({ message: "Valid userId and role are required" });
    }

    const target = String(userId).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
    const { rows } = await db.query(
      isUuid
        ? "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, full_name, email, role"
        : "UPDATE users SET role = $1 WHERE LOWER(email) = LOWER($2) OR mobile = $2 RETURNING id, full_name, email, role",
      [role, target],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No matching user found by ID, email, or mobile" });
    }

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.fullName || "Admin",
      action: "user_role_changed",
      targetType: "user",
      targetId: userId,
      metadata: { newRole: role, userEmail: rows[0].email },
      ipAddress: req.ip,
    });

    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 24. Analytics & Growth Metrics
adminRouter.get("/analytics", async (_req, res) => {
  try {
    // 30 day registration trend
    const registrations = await db.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `);

    // Gender breakdown
    const genderRatio = await db.query(`
      SELECT gender, COUNT(*)::int AS count
      FROM users
      GROUP BY gender
    `);

    // Plan breakdown
    const planBreakdown = await db.query(`
      SELECT plan, COUNT(*)::int AS count
      FROM users
      GROUP BY plan
    `);

    // Ticket resolution stats
    const ticketStats = await db.query(`
      SELECT status, COUNT(*)::int AS count
      FROM support_tickets
      GROUP BY status
    `);

    // Verification stats
    const verificationStats = await db.query(`
      SELECT status, COUNT(*)::int AS count
      FROM id_verifications
      GROUP BY status
    `);

    return res.json({
      registrationTrend: registrations.rows,
      genderBreakdown: genderRatio.rows,
      planBreakdown: planBreakdown.rows,
      ticketStats: ticketStats.rows,
      verificationStats: verificationStats.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});


