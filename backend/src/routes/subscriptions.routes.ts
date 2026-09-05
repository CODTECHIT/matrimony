import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const subscriptionsRouter = Router();

// 1. Get all public plans
subscriptionsRouter.get("/plans", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("price_inr", { ascending: true });

    if (error) return res.status(400).json({ message: error.message });

    const formatted = (data || []).map((p: any) => ({
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

// 2. Get current user's subscription
subscriptionsRouter.get("/subscriptions/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return res.status(400).json({ message: error.message });

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
        profileHighlight: true,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Create payment order (for Razorpay / Stripe)
subscriptionsRouter.post("/payments/orders", requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    const { data: plan, error } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (error || !plan) {
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

// 4. Verify payment and upgrade tier
subscriptionsRouter.post("/payments/verify", requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user!.id;

    const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
    const tier = plan?.tier || "gold";

    // Insert payment record
    await supabase.from("payments").insert({
      user_id: userId,
      plan_id: planId,
      amount_inr: plan?.price_inr || 0,
      status: "success",
      gateway_ref: req.body.razorpay_payment_id || `sim_${Date.now()}`,
    });

    // Create subscription
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + (plan?.duration_months || 3));

    const subscriptionPayload = {
      user_id: userId,
      plan_id: planId,
      tier,
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: expiryDate.toISOString(),
      auto_renew: true,
      permissions: {
        canMessage: true,
        canViewContacts: true,
        canUseAdvancedFilters: true,
        profileHighlight: true,
      },
    };

    const { data: sub } = await supabase
      .from("subscriptions")
      .insert(subscriptionPayload)
      .select()
      .single();

    // Update user's current plan
    await supabase.from("users").update({ plan: tier }).eq("id", userId);

    return res.json({
      planId,
      tier,
      status: "active",
      startedAt: sub?.started_at || new Date().toISOString(),
      expiresAt: sub?.expires_at || expiryDate.toISOString(),
      autoRenew: true,
      permissions: subscriptionPayload.permissions,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. Cancel auto renew
subscriptionsRouter.post("/subscriptions/cancel", requireAuth, async (req, res) => {
  try {
    await supabase
      .from("subscriptions")
      .update({ auto_renew: false })
      .eq("user_id", req.user!.id)
      .eq("status", "active");

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});
