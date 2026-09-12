import { Router } from "express";
import crypto from "crypto";
import { db } from "../config/db.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const subscriptionsRouter = Router();

/**
 * Maintenance helper: Checks and expires subscriptions that have passed their `expires_at` date.
 * Demotes users without active paid subscriptions back to the 'free' plan using an atomic query.
 */
export async function expireOutdatedSubscriptions() {
  try {
    await db.query(`
      WITH expired_subs AS (
        UPDATE subscriptions
        SET status = 'expired'
        WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW()
        RETURNING user_id
      )
      UPDATE users u
      SET plan = 'free'
      FROM expired_subs es
      WHERE u.id = es.user_id
        AND u.role != 'admin'
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = es.user_id
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
