import { api } from "@/lib/api-client";
import { env } from "@/lib/env";
import type {
  AdminStats,
  AdminUserRow,
  PaymentRow,
  Plan,
  PlanTier,
  ReportRow,
  Subscription,
} from "@/types";
import { delay } from "@/mocks/adapter";
import {
  mockAdminStats,
  mockAdminUsers,
  mockPayments,
  mockPlans,
  mockProfiles,
  mockReports,
  mockSubscription,
} from "@/mocks/data";

let mockAdminSubs: Array<Subscription & { user: string }> | null = null;

function getMockAdminSubs() {
  if (!mockAdminSubs) {
    mockAdminSubs = mockAdminUsers.slice(0, 8).map((user, i) => ({
      ...mockSubscription,
      tier: user.plan,
      status: i % 4 === 3 ? ("expired" as const) : ("active" as const),
      user: user.fullName,
      expiresAt: i % 4 === 3 ? "2026-03-01" : "2026-11-14",
    }));
  }
  return mockAdminSubs;
}

export const adminService = {
  async stats(): Promise<AdminStats> {
    if (env.useMockApi) return delay(mockAdminStats);
    return api.get("/admin/stats");
  },

  async users(query?: string): Promise<AdminUserRow[]> {
    if (env.useMockApi) {
      const q = query?.toLowerCase();
      return delay(
        q ? mockAdminUsers.filter((u) => u.fullName.toLowerCase().includes(q)) : mockAdminUsers,
      );
    }
    return api.get("/admin/users", { query: { q: query } });
  },

  async user(id: string): Promise<AdminUserRow> {
    if (env.useMockApi) {
      const user = mockAdminUsers.find((u) => u.id === id);
      if (!user) throw new Error("User not found");
      return delay(user);
    }
    return api.get(`/admin/users/${id}`);
  },

  async setUserStatus(id: string, status: "approved" | "blocked" | "pending") {
    if (env.useMockApi) {
      const user = mockAdminUsers.find((u) => u.id === id);
      if (user) user.profileStatus = status;
      // Live sync: update mockProfiles so Browse immediately shows approved and hides blocked/pending
      const profile = mockProfiles.find((p) => p.id === id);
      if (profile) profile.profileStatus = status;
      return delay({ ok: true }, 150);
    }
    return api.patch<{ ok: boolean }>(`/admin/users/${id}/status`, { status });
  },

  async updateUserPlan(id: string, plan: PlanTier) {
    if (env.useMockApi) {
      const user = mockAdminUsers.find((u) => u.id === id);
      if (user) user.plan = plan;
      // Live sync: VIP boost immediately updates
      const profile = mockProfiles.find((p) => p.id === id);
      if (profile) {
        profile.isVip = plan === "platinum";
      }
      return delay({ ok: true }, 150);
    }
    return api.patch<{ ok: boolean }>(`/admin/users/${id}/plan`, { plan });
  },

  async deleteUser(id: string) {
    if (env.useMockApi) {
      const idx = mockAdminUsers.findIndex((u) => u.id === id);
      if (idx !== -1) mockAdminUsers.splice(idx, 1);
      const pIdx = mockProfiles.findIndex((p) => p.id === id);
      if (pIdx !== -1) mockProfiles.splice(pIdx, 1);
      return delay({ ok: true }, 150);
    }
    return api.delete<{ ok: boolean }>(`/admin/users/${id}`);
  },

  async subscriptions(): Promise<Array<Subscription & { user: string }>> {
    if (env.useMockApi) {
      return delay([...getMockAdminSubs()]);
    }
    return api.get("/admin/subscriptions");
  },

  async cancelSubscription(user: string) {
    if (env.useMockApi) {
      const subs = getMockAdminSubs();
      const sub = subs.find((s) => s.user.toLowerCase() === user.toLowerCase());
      if (sub) {
        sub.status = "expired";
        sub.autoRenew = false;
      }
      return delay({ ok: true }, 150);
    }
    return api.post<{ ok: boolean }>(`/admin/subscriptions/cancel`, { user });
  },

  async extendSubscription(user: string, days = 30) {
    if (env.useMockApi) {
      const subs = getMockAdminSubs();
      const sub = subs.find((s) => s.user.toLowerCase() === user.toLowerCase());
      if (sub) {
        sub.status = "active";
        const currentExp = sub.expiresAt ? new Date(sub.expiresAt).getTime() : Date.now();
        const base = Math.max(currentExp, Date.now());
        sub.expiresAt = new Date(base + days * 86400000).toISOString().split("T")[0]!;
      }
      return delay({ ok: true }, 150);
    }
    return api.post<{ ok: boolean }>(`/admin/subscriptions/extend`, { user, days });
  },

  async packages(): Promise<Plan[]> {
    if (env.useMockApi) return delay([...mockPlans]);
    return api.get("/admin/packages");
  },

  async savePackage(plan: Partial<Plan>): Promise<Plan> {
    if (env.useMockApi) {
      if (plan.id) {
        const idx = mockPlans.findIndex((p) => p.id === plan.id);
        if (idx !== -1) {
          mockPlans[idx] = { ...mockPlans[idx]!, ...plan } as Plan;
          return delay({ ...mockPlans[idx]! }, 150);
        }
      }
      const newPlan: Plan = {
        id: plan.id || `plan-${Date.now()}`,
        tier: plan.tier || "silver",
        name: plan.name || "New Package",
        priceInr: plan.priceInr ?? 999,
        durationMonths: plan.durationMonths ?? 3,
        popular: plan.popular ?? false,
        features: plan.features || ["Browse profiles", "Express interest"],
        limits: plan.limits || {
          profileViews: "50 / day",
          interests: "25 / month",
          messaging: "Matched members",
          contacts: "10 / month",
        },
        permissions: plan.permissions || {
          canMessage: true,
          canViewContacts: true,
          canUseAdvancedFilters: false,
          profileHighlight: false,
        },
      };
      mockPlans.push(newPlan);
      return delay(newPlan, 150);
    }
    return plan.id
      ? api.patch(`/admin/packages/${plan.id}`, plan)
      : api.post("/admin/packages", plan);
  },

  async deletePackage(id: string) {
    if (env.useMockApi) {
      const idx = mockPlans.findIndex((p) => p.id === id);
      if (idx !== -1) mockPlans.splice(idx, 1);
      return delay({ ok: true }, 150);
    }
    return api.delete<{ ok: boolean }>(`/admin/packages/${id}`);
  },

  async payments(): Promise<PaymentRow[]> {
    if (env.useMockApi) return delay([...mockPayments]);
    return api.get("/admin/payments");
  },

  async refundPayment(id: string) {
    if (env.useMockApi) {
      const payment = mockPayments.find((p) => p.id === id);
      if (payment) payment.status = "refunded";
      return delay({ ok: true }, 150);
    }
    return api.post<{ ok: boolean }>(`/admin/payments/${id}/refund`);
  },

  async reports(): Promise<ReportRow[]> {
    if (env.useMockApi) return delay([...mockReports]);
    return api.get("/admin/reports");
  },

  async resolveReport(id: string) {
    if (env.useMockApi) {
      const report = mockReports.find((r) => r.id === id);
      if (report) report.status = "resolved";
      return delay({ ok: true }, 150);
    }
    return api.post<{ ok: boolean }>(`/admin/reports/${id}/resolve`);
  },

  async blockAndResolveReport(reportId: string, reportedUserName: string) {
    if (env.useMockApi) {
      const report = mockReports.find((r) => r.id === reportId);
      if (report) report.status = "resolved";
      const user = mockAdminUsers.find(
        (u) => u.fullName.toLowerCase() === reportedUserName.toLowerCase(),
      );
      if (user) user.profileStatus = "blocked";
      const profile = mockProfiles.find(
        (p) => p.fullName.toLowerCase() === reportedUserName.toLowerCase(),
      );
      if (profile) profile.profileStatus = "blocked";
      return delay({ ok: true }, 150);
    }
    return api.post<{ ok: boolean }>(`/admin/reports/${reportId}/block-and-resolve`);
  },
};
