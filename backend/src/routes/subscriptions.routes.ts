import { Router } from "express";
import crypto from "crypto";
import { db } from "../config/db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import { quotaService } from "../services/quota.service.js";
import { notificationsService } from "../services/notifications.service.js";
import { sendPlanExpiringEmail, sendPlanExpiredEmail } from "../config/mailer.js";

export const subscriptionsRouter = Router();

/**
 * Maintenance helper: Checks and notifies subscriptions that are expiring soon (<= 3 days)
 * and expires subscriptions that have passed their `expires_at` date.
 * Demotes users without active paid subscriptions back to the 'free' plan.
 */
export async function expireOutdatedSubscriptions() {
  try {
    // Ensure tracking columns exist (idempotent guard)
    await db.query(`
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expiry_warning_sent_at TIMESTAMPTZ;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expired_email_sent_at TIMESTAMPTZ;
    `).catch(() => {});

    // 1. Check for plans expiring soon (within 3 days)
    const expiringSoonRes = await db.query(`
      SELECT s.id, s.user_id, s.plan_id, s.tier, s.expires_at, u.email, u.full_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
        AND s.expires_at IS NOT NULL
        AND s.expires_at > NOW()
        AND s.expires_at <= NOW() + INTERVAL '3 days'
        AND s.expiry_warning_sent_at IS NULL
    `);

    for (const sub of expiringSoonRes.rows) {
      try {
        const daysLeft = Math.max(
          1,
          Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        );

        if (sub.email) {
          await sendPlanExpiringEmail({
            to: sub.email,
            userName: sub.full_name || "Member",
            tier: sub.tier,
            expiresAt: sub.expires_at,
            daysLeft,
          });
        }

        await notificationsService.create({
          userId: sub.user_id,
          type: "system",
          title: "Plan Expiring Soon ⏳",
          body: `Your ${sub.tier.toUpperCase()} membership expires in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}. Renew now to maintain uninterrupted access.`,
          data: { planId: sub.plan_id, tier: sub.tier, expiresAt: sub.expires_at },
        });

        await db.query(
          "UPDATE subscriptions SET expiry_warning_sent_at = NOW() WHERE id = $1",
          [sub.id]
        );
      } catch (subErr: any) {
        console.warn(`[Subscription Expiry Warning Error] Failed for subscription ${sub.id}:`, subErr.message);
      }
    }

    // 2. Check for plans that have expired
    const expiredRes = await db.query(`
      SELECT s.id, s.user_id, s.plan_id, s.tier, s.expires_at, u.email, u.full_name, s.expired_email_sent_at
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
        AND s.expires_at IS NOT NULL
        AND s.expires_at <= NOW()
    `);

    for (const sub of expiredRes.rows) {
      try {
        if (sub.email && !sub.expired_email_sent_at) {
          await sendPlanExpiredEmail({
            to: sub.email,
            userName: sub.full_name || "Member",
            tier: sub.tier,
          });
        }

        await notificationsService.create({
          userId: sub.user_id,
          type: "system",
          title: "Membership Expired",
          body: `Your ${sub.tier.toUpperCase()} membership has expired. Your account has returned to the Free plan. Upgrade anytime to restore premium features.`,
          data: { planId: sub.plan_id, tier: sub.tier },
        });

        await db.query(
          "UPDATE subscriptions SET status = 'expired', expired_email_sent_at = COALESCE(expired_email_sent_at, NOW()) WHERE id = $1",
          [sub.id]
        );
      } catch (subErr: any) {
        console.warn(`[Subscription Expired Error] Failed for subscription ${sub.id}:`, subErr.message);
      }
    }

    // Demote users who no longer have an active paid subscription to 'free'
    await db.query(`
      UPDATE users u
      SET plan = 'free'
      WHERE u.role != 'admin'
        AND u.plan != 'free'
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = u.id
            AND s.status = 'active'
            AND (s.expires_at IS NULL OR s.expires_at > NOW())
        );
    `);
  } catch (err) {
    console.error("[Subscription Expiry Engine Error]", err);
  }
}

// 1. Get all public plans
subscriptionsRouter.get("/plans", async (_req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, tier, name, price_inr, duration_months, popular, features, limits FROM plans ORDER BY price_inr ASC",
    );

    const formatted = rows.map((p) => ({
      id: p.id,
      tier: p.tier,
      name: p.name,
      priceInr: p.price_inr,
      durationMonths: p.duration_months,
      popular: p.popular,
      features: p.features || [],
      limits: p.limits || {
        profileViews: "Unlimited",
        interests: "Unlimited",
        messaging: "Unlimited",
        contacts: "Unlimited",
      },
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. Get current user's subscription with strict expiry enforcement
subscriptionsRouter.get("/subscriptions/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Run active expiry check
    await expireOutdatedSubscriptions();

    const { rows } = await db.query(
      `SELECT plan_id, tier, status, started_at, expires_at, auto_renew, permissions
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );

    const data = rows[0];
    if (!data) {
      return res.json({
        planId: "plan-free",
        tier: "free",
        status: "none",
        autoRenew: false,
        permissions: {
          canMessage: false,
          canViewContacts: false,
          canUseAdvancedFilters: false,
          profileHighlight: false,
        },
      });
    }

    return res.json({
      planId: data.plan_id,
      tier: data.tier,
      status: data.status,
      startedAt: data.started_at,
      expiresAt: data.expires_at,
      autoRenew: data.auto_renew,
      permissions: data.permissions || {
        canMessage: true,
        canViewContacts: true,
        canUseAdvancedFilters: true,
        profileHighlight: data.tier === "platinum",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2b. Get current user's plan quota usage summary
subscriptionsRouter.get("/subscriptions/usage", requireAuth, async (req, res) => {
  try {
    const summary = await quotaService.getUsageSummary(req.user!.id, req.user!.plan);
    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to load quota usage" });
  }
});

// 3. Create payment order
subscriptionsRouter.post("/payments/orders", requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    const { rows } = await db.query("SELECT * FROM plans WHERE id = $1", [planId]);
    const plan = rows[0];

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return res.json({
      orderId,
      amountInr: plan.price_inr,
      currency: "INR",
      gatewayKey: process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_GATEWAY_KEY || "rzp_test_key",
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Verify payment, validate signature, and upgrade tier with precise expiry
subscriptionsRouter.post("/payments/verify", requireAuth, async (req, res) => {
  const client = await db.getClient();
  try {
    const { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user!.id;

    if (!planId) {
      return res.status(400).json({ message: "Plan ID is required" });
    }

    // Enforce cryptographic Razorpay signature verification
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    const isSimulationAllowed =
      process.env.NODE_ENV !== "production" && process.env.ALLOW_PAYMENT_SIMULATION === "true";

    if (!razorpaySecret && !isSimulationAllowed) {
      return res.status(500).json({
        message: "Payment gateway is not configured on this server.",
      });
    }

    if (razorpaySecret) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          message: "Payment verification failed: missing payment confirmation tokens",
        });
      }

      const generatedSignature = crypto
        .createHmac("sha256", razorpaySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const generatedBuf = Buffer.from(generatedSignature, "utf8");
      const providedBuf = Buffer.from(String(razorpay_signature), "utf8");

      if (
        generatedBuf.length !== providedBuf.length ||
        !crypto.timingSafeEqual(generatedBuf, providedBuf)
      ) {
        return res.status(400).json({ message: "Invalid payment gateway signature" });
      }
    } else if (isSimulationAllowed) {
      console.warn(
        `[SECURITY WARNING] Simulated payment verification accepted for user ${userId} (development mode only).`,
      );
    }

    await client.query("BEGIN");

    const planRes = await client.query("SELECT * FROM plans WHERE id = $1", [planId]);
    const plan = planRes.rows[0];
    if (!plan) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Selected plan does not exist" });
    }

    const tier = plan.tier || "gold";

    // Expire any existing active subscriptions for this user
    await client.query(
      `UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`,
      [userId],
    );

    // Record the payment
    const paymentRef = razorpay_payment_id || `sim_${Date.now()}`;
    await client.query(
      `INSERT INTO payments (user_id, plan_id, amount_inr, status, gateway_ref)
       VALUES ($1, $2, $3, 'success', $4)`,
      [userId, planId, plan.price_inr || 0, paymentRef],
    );

    // Compute precise expiration date
    const durationMonths = Number(plan.duration_months) || 3;
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

    const isPlatinum = tier === "platinum";
    const isGold = tier === "gold" || isPlatinum;
    const isSilver = tier === "silver" || isGold;

    const permissions = {
      canMessage: isSilver,
      canViewContacts: isSilver,
      canUseAdvancedFilters: isGold,
      profileHighlight: isPlatinum,
    };

    // Expire any existing active subscriptions for this member
    await client.query(
      `UPDATE subscriptions SET status = 'expired', auto_renew = false WHERE user_id = $1 AND status = 'active'`,
      [userId],
    );

    const subRes = await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, tier, status, started_at, expires_at, auto_renew, permissions)
       VALUES ($1, $2, $3, 'active', NOW(), $4, TRUE, $5)
       RETURNING plan_id, tier, status, started_at, expires_at, auto_renew, permissions`,
      [userId, planId, tier, expiryDate.toISOString(), JSON.stringify(permissions)],
    );

    // Update user's plan in users table
    await client.query("UPDATE users SET plan = $1 WHERE id = $2", [tier, userId]);

    await client.query("COMMIT");

    const sub = subRes.rows[0];
    return res.json({
      planId: sub.plan_id,
      tier: sub.tier,
      status: sub.status,
      startedAt: sub.started_at,
      expiresAt: sub.expires_at,
      autoRenew: sub.auto_renew,
      permissions: sub.permissions,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// 5. Cancel auto renew
subscriptionsRouter.post("/subscriptions/cancel", requireAuth, async (req, res) => {
  try {
    await db.query(
      "UPDATE subscriptions SET auto_renew = FALSE WHERE user_id = $1 AND status = 'active'",
      [req.user!.id],
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. Validate Coupon for Checkout
subscriptionsRouter.post("/coupons/validate", optionalAuth, async (req, res) => {
  try {
    const { code, amount } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const orderAmount = Number(amount) || 0;
    const cleanCode = code.trim().toUpperCase();

    const { rows } = await db.query(
      `SELECT * FROM coupons WHERE UPPER(code) = $1`,
      [cleanCode],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: `Coupon "${cleanCode}" is invalid` });
    }

    const coupon = rows[0];

    if (!coupon.is_active) {
      return res.status(400).json({ message: `Coupon "${cleanCode}" has been disabled` });
    }

    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: `Coupon "${cleanCode}" has expired` });
    }

    if (coupon.usage_limit && (coupon.used_count || 0) >= coupon.usage_limit) {
      return res.status(400).json({ message: `Coupon "${cleanCode}" usage limit reached` });
    }

    const minAmount = Number(coupon.min_amount) || 0;
    if (orderAmount > 0 && orderAmount < minAmount) {
      return res.status(400).json({
        message: `Coupon requires a minimum order of ₹${minAmount}. Current plan is ₹${orderAmount}.`,
      });
    }

    const discountVal = Number(coupon.discount_value);
    let discountAmount = 0;

    if (coupon.discount_type === "percentage") {
      discountAmount = Math.round((orderAmount * discountVal) / 100);
      const maxDiscount = Number(coupon.max_discount);
      if (maxDiscount > 0 && discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
      }
    } else {
      discountAmount = Math.min(orderAmount, discountVal);
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);

    return res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: discountVal,
      discountAmount,
      finalAmount,
      message: `Coupon "${coupon.code}" applied! You save ₹${discountAmount}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

