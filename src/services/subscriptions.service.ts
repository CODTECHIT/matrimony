import { api } from "@/lib/api-client";
import { env } from "@/lib/env";
import type { Plan, Subscription } from "@/types";
import { delay } from "@/mocks/adapter";
import { mockPayments, mockPlans, mockSubscription } from "@/mocks/data";

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
    if (env.useMockApi) return delay(mockSubscription);
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
        user: "Ananya Sharma",
        plan: plan.name,
        amountInr: plan.priceInr,
        status: "success",
        createdAt: new Date().toISOString().split("T")[0]!,
        gatewayRef: payload["razorpay_payment_id"] || `pay_rzp_${Date.now()}`,
      });
      const updatedSub: Subscription = {
        planId: plan.id,
        tier: plan.tier,
        status: "active",
        startedAt: new Date().toISOString().split("T")[0]!,
        expiresAt: new Date(Date.now() + (plan.durationMonths || 3) * 30 * 86400000)
          .toISOString()
          .split("T")[0]!,
        autoRenew: true,
        permissions: plan.permissions || {
          canMessage: true,
          canViewContacts: true,
          canUseAdvancedFilters: true,
          profileHighlight: plan.tier === "platinum",
        },
      };
      return delay(updatedSub, 150);
    }
    return api.post("/payments/verify", payload);
  },

  async cancelAutoRenew(): Promise<Subscription> {
    if (env.useMockApi) return delay({ ...mockSubscription, autoRenew: false });
    return api.post("/subscriptions/cancel");
  },
};
