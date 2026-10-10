import { api } from "@/lib/api-client";
import { env } from "@/lib/env";
import type { Plan, Subscription } from "@/types";
import { delay } from "@/mocks/adapter";
import { mockPayments, mockPlans, mockSubscription, mockUser } from "@/mocks/data";

export interface PaymentOrder {
  orderId: string;
  amountInr: number;
  currency: string;
  /** Publishable gateway key returned by the backend for the checkout widget. */
  gatewayKey: string;
}

export const subscriptionsService = {
  async plans(): Promise<Plan[]> {
    if (env.useMockApi) return delay([...mockPlans]);
    return api.get("/plans");
  },

  async current(): Promise<Subscription> {
    if (env.useMockApi) {
      // FIX 7: Check subscription expiry in real-time
      const isExpired =
        mockSubscription.expiresAt && mockSubscription.status === "active"
          ? new Date(mockSubscription.expiresAt).getTime() < Date.now()
          : false;

      const plan =
        mockPlans.find(
          (p) => p.id === mockSubscription.planId || p.tier === mockSubscription.tier,
        ) || mockPlans[0]!;

      if (isExpired) {
        mockSubscription.status = "expired";
      }

      const active = mockSubscription.status === "active";
      const sub: Subscription = {
        ...mockSubscription,
        limits: plan.limits,
        permissions: active
          ? (plan.permissions || mockSubscription.permissions)
          : {
              canMessage: false,
              canViewContacts: false,
              canUseAdvancedFilters: false,
              profileHighlight: false,
            },
      };

      return delay(sub);
    }
    return api.get("/subscriptions/me");
  },

  /** Step 1 of checkout — the backend creates the order with the gateway. */
  async createOrder(planId: string): Promise<PaymentOrder> {
    if (env.useMockApi) {
      const plan = mockPlans.find((p) => p.id === planId);
      return delay({
        orderId: `order_mock_${planId}`,
        amountInr: plan?.priceInr ?? 0,
        currency: "INR",
        gatewayKey: env.paymentPublicKey,
      });
    }
    return api.post("/payments/orders", { planId });
  },

  /** Step 2 — the backend verifies the gateway signature. Never done client-side. */
  async verifyPayment(payload: Record<string, string>): Promise<Subscription> {
    if (env.useMockApi) {
      const plan = mockPlans.find((p) => p.id === payload["planId"]) || mockPlans[2]!;
      mockPayments.unshift({
        id: `pay-${Date.now()}`,
        user: mockUser.fullName,
        plan: plan.name,
        amountInr: plan.priceInr,
        status: "success",
        createdAt: new Date().toISOString().split("T")[0]!,
        gatewayRef: payload["razorpay_payment_id"] || `pay_rzp_${Date.now()}`,
      });

      // Mutate mockSubscription so all subsequent calls reflect the upgraded membership
      mockSubscription.planId = plan.id;
      mockSubscription.tier = plan.tier;
      mockSubscription.status = "active";
      mockSubscription.startedAt = new Date().toISOString().split("T")[0]!;
      mockSubscription.expiresAt = new Date(
        Date.now() + (plan.durationMonths || 3) * 30 * 86400000,
      )
        .toISOString()
        .split("T")[0]!;
      mockSubscription.autoRenew = true;
      mockSubscription.limits = plan.limits;
      mockSubscription.permissions = plan.permissions || {
        canMessage: plan.tier !== "free",
        canViewContacts: plan.tier === "gold" || plan.tier === "platinum",
        canUseAdvancedFilters: plan.tier !== "free",
        profileHighlight: plan.tier === "platinum",
      };

      mockUser.plan = plan.tier;

      return delay({ ...mockSubscription }, 150);
    }
    return api.post("/payments/verify", payload);
  },

  async cancelAutoRenew(): Promise<Subscription> {
    if (env.useMockApi) {
      mockSubscription.autoRenew = false;
      return delay({ ...mockSubscription, autoRenew: false });
    }
    return api.post("/subscriptions/cancel");
  },

  async validateCoupon(code: string, amount: number): Promise<{
    valid: boolean;
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    discountAmount: number;
    finalAmount: number;
    message: string;
  }> {
    if (env.useMockApi) {
      const discount = Math.round((amount * 20) / 100);
      return delay({
        valid: true,
        code: code.toUpperCase(),
        discountType: "percentage",
        discountValue: 20,
        discountAmount: discount,
        finalAmount: Math.max(0, amount - discount),
        message: `Coupon "${code.toUpperCase()}" applied! You save ₹${discount}.`,
      }, 150);
    }
    return api.post("/coupons/validate", { code, amount });
  },
};

