import { api } from "@/lib/api-client";
import { env } from "@/lib/env";
import type {
  AdminAnalyticsData,
  AdminFullProfile,
  AdminStats,
  AdminUserRow,
  AuditLogRow,
  BannerRow,
  CouponRow,
  MatchOverviewData,
  PaymentRow,
  Plan,
  PlanTier,
  ReportRow,
  SiteContentRow,
  StaffMemberRow,
  Subscription,
  SuccessStoryRow,
  SupportTicketRow,
  SystemSettings,
  TicketReply,
  VerificationItem,
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

  async users(
    params?: string | { q?: string | undefined; status?: string | undefined; gender?: string | undefined; plan?: string | undefined; religion?: string | undefined } | undefined,
  ): Promise<AdminUserRow[]> {
    if (typeof params === "string") {
      params = { q: params };
    }
    if (env.useMockApi) {
      const q = params?.q?.toLowerCase();
      let res = mockAdminUsers;
      if (q) res = res.filter((u) => u.fullName.toLowerCase().includes(q));
      if (params?.status && params.status !== "all") res = res.filter((u) => u.profileStatus === params?.status);
      if (params?.plan && params.plan !== "all") res = res.filter((u) => u.plan === params?.plan);
      return delay(res);
    }
    return api.get("/admin/users", { query: params as Record<string, string | undefined> });
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

  async subscriptions(allHistory = false): Promise<Array<Subscription & { user: string; email?: string }>> {
    if (env.useMockApi) {
      return delay([...getMockAdminSubs()]);
    }
    return api.get("/admin/subscriptions", { query: { history: allHistory ? "true" : "false" } });
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

  async bulkUsers(userIds: string[], action: "approve" | "block" | "activate" | "delete") {
    if (env.useMockApi) {
      return delay({ ok: true, count: userIds.length }, 150);
    }
    return api.post<{ ok: boolean; count: number }>("/admin/users/bulk", { userIds, action });
  },

  async fullProfile(id: string): Promise<AdminFullProfile> {
    if (env.useMockApi) {
      const u = mockAdminUsers.find((x) => x.id === id);
      return delay({
        id,
        full_name: u?.fullName || "Member",
        mobile: u?.mobile || "+919876543210",
        gender: u?.gender || "female",
        role: "user",
        plan: u?.plan || "free",
        profile_status: u?.profileStatus || "pending",
        profile_completion: 80,
        joined_at: u?.joinedAt || new Date().toISOString(),
      } as AdminFullProfile);
    }
    return api.get(`/admin/profiles/${id}`);
  },

  async updateFullProfile(id: string, data: Partial<AdminFullProfile>) {
    if (env.useMockApi) {
      return delay({ ok: true }, 150);
    }
    return api.patch<{ ok: boolean }>(`/admin/profiles/${id}`, data);
  },

  async verifications(status?: string): Promise<VerificationItem[]> {
    if (env.useMockApi) {
      return delay([]);
    }
    return api.get("/admin/verifications", { query: { status } });
  },

  async verification(id: string): Promise<VerificationItem> {
    return api.get(`/admin/verifications/${id}`);
  },

  async approveVerification(id: string) {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.post<{ ok: boolean }>(`/admin/verifications/${id}/approve`);
  },

  async rejectVerification(id: string, reason: string) {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.post<{ ok: boolean }>(`/admin/verifications/${id}/reject`, { reason });
  },

  async auditLogs(action?: string, limit = 50, offset = 0): Promise<{ logs: AuditLogRow[]; total: number }> {
    if (env.useMockApi) {
      return delay({ logs: [], total: 0 });
    }
    return api.get("/admin/audit-logs", { query: { action, limit: String(limit), offset: String(offset) } });
  },

  async tickets(params?: { status?: string | undefined; priority?: string | undefined; q?: string | undefined } | undefined): Promise<SupportTicketRow[]> {
    if (env.useMockApi) return delay([]);
    return api.get("/admin/tickets", { query: params as Record<string, string | undefined> });
  },

  async ticket(id: string): Promise<SupportTicketRow> {
    return api.get(`/admin/tickets/${id}`);
  },

  async replyTicket(id: string, message: string, newStatus?: string): Promise<{ ok: boolean; reply: TicketReply }> {
    if (env.useMockApi) {
      return delay({
        ok: true,
        reply: {
          id: `reply-${Date.now()}`,
          ticket_id: id,
          sender_type: "admin",
          sender_name: "Admin",
          message,
          created_at: new Date().toISOString(),
        },
      }, 150);
    }
    return api.post(`/admin/tickets/${id}/reply`, { message, newStatus });
  },

  async updateTicket(id: string, updates: { status?: string; priority?: string; assignedTo?: string }): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.patch(`/admin/tickets/${id}/status`, updates);
  },

  async warnUser(userId: string, reason: string, note?: string): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.post(`/admin/users/${userId}/warn`, { reason, note });
  },

  async muteUser(userId: string, durationHours: number, reason: string): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.post(`/admin/users/${userId}/mute`, { durationHours, reason });
  },

  async matchesOverview(): Promise<MatchOverviewData> {
    if (env.useMockApi) {
      return delay({
        metrics: {
          totalInterests: 45,
          acceptedInterests: 18,
          declinedInterests: 6,
          pendingInterests: 21,
          acceptanceRate: 40,
          totalShortlists: 32,
          totalConversations: 18,
        },
        recentActivity: [],
      });
    }
    return api.get("/admin/matches/overview");
  },

  async coupons(): Promise<CouponRow[]> {
    if (env.useMockApi) return delay([]);
    return api.get("/admin/coupons");
  },

  async createCoupon(data: Partial<CouponRow>): Promise<CouponRow> {
    if (env.useMockApi) {
      return delay({
        id: `coupon-${Date.now()}`,
        code: data.code || "SAVE20",
        discount_type: data.discount_type || "percentage",
        discount_value: data.discount_value || 20,
        min_amount: data.min_amount || 0,
        usage_limit: data.usage_limit || 100,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      } as CouponRow, 150);
    }
    return api.post("/admin/coupons", data);
  },

  async updateCoupon(id: string, data: Partial<CouponRow>): Promise<CouponRow> {
    if (env.useMockApi) return delay({ ...data, id } as CouponRow, 150);
    return api.patch(`/admin/coupons/${id}`, data);
  },

  async deleteCoupon(id: string): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.delete(`/admin/coupons/${id}`);
  },

  async broadcastNotification(payload: { title: string; body: string; cohort?: string; type?: string }): Promise<{ ok: boolean; recipientCount: number }> {
    if (env.useMockApi) return delay({ ok: true, recipientCount: 15 }, 150);
    return api.post("/admin/notifications/broadcast", payload);
  },

  async banners(): Promise<BannerRow[]> {
    if (env.useMockApi) return delay([]);
    return api.get("/admin/banners");
  },

  async createBanner(data: Partial<BannerRow>): Promise<BannerRow> {
    if (env.useMockApi) {
      return delay({
        id: `banner-${Date.now()}`,
        title: data.title || "Banner",
        image_url: data.image_url || "",
        is_active: true,
        created_at: new Date().toISOString(),
      } as BannerRow, 150);
    }
    return api.post("/admin/banners", data);
  },

  async updateBanner(id: string, data: Partial<BannerRow>): Promise<BannerRow> {
    if (env.useMockApi) return delay({ ...data, id } as BannerRow, 150);
    return api.patch(`/admin/banners/${id}`, data);
  },

  async deleteBanner(id: string): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.delete(`/admin/banners/${id}`);
  },

  async successStories(): Promise<SuccessStoryRow[]> {
    if (env.useMockApi) return delay([]);
    return api.get("/admin/success-stories");
  },

  async createSuccessStory(data: Partial<SuccessStoryRow>): Promise<SuccessStoryRow> {
    if (env.useMockApi) {
      return delay({
        id: `story-${Date.now()}`,
        couple_name: data.couple_name || "Couple",
        story: data.story || "",
        is_published: true,
        created_at: new Date().toISOString(),
      } as SuccessStoryRow, 150);
    }
    return api.post("/admin/success-stories", data);
  },

  async updateSuccessStory(id: string, data: Partial<SuccessStoryRow>): Promise<SuccessStoryRow> {
    if (env.useMockApi) return delay({ ...data, id } as SuccessStoryRow, 150);
    return api.patch(`/admin/success-stories/${id}`, data);
  },

  async deleteSuccessStory(id: string): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.delete(`/admin/success-stories/${id}`);
  },

  async uploadImage(base64: string, fileName = "image.jpg", contentType = "image/jpeg"): Promise<{ url: string }> {
    if (env.useMockApi) return delay({ url: base64 }, 100);
    return api.post<{ url: string }>("/admin/upload", { base64, fileName, contentType });
  },

  // Phase 4: CMS, Settings, Staff & Analytics
  async contentPages(): Promise<SiteContentRow[]> {
    if (env.useMockApi) {
      return delay([
        {
          key: "terms",
          title: "Terms and Conditions of Use",
          content: { body: "Terms of service preview content...", lastUpdated: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        },
        {
          key: "privacy",
          title: "Privacy and Data Protection Policy",
          content: { body: "Privacy policy preview content...", lastUpdated: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        },
      ]);
    }
    return api.get("/admin/content");
  },

  async contentPage(key: string): Promise<SiteContentRow> {
    if (env.useMockApi) {
      return delay({
        key,
        title: key.toUpperCase(),
        content: { body: "Content body...", lastUpdated: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      });
    }
    return api.get(`/admin/content/${key}`);
  },

  async saveContentPage(key: string, title: string, content: Record<string, unknown>): Promise<SiteContentRow> {
    if (env.useMockApi) {
      return delay({
        key,
        title,
        content,
        updated_at: new Date().toISOString(),
      });
    }
    return api.post("/admin/content", { key, title, content });
  },

  async deleteContentPage(key: string): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.delete(`/admin/content/${key}`);
  },

  async settings(): Promise<SystemSettings> {
    if (env.useMockApi) {
      return delay({
        maintenance_mode: false,
        allow_registrations: true,
        require_verification_to_chat: false,
        free_interests_per_day: 10,
        contact_email: "support@yfjmatrimony.com",
        helpline_phone: "+91 99999 88888",
        payment_gateway_mode: "sandbox",
        auto_approve_profiles: false,
      });
    }
    return api.get("/admin/settings");
  },

  async updateSettings(updates: Partial<SystemSettings>): Promise<{ ok: boolean; settings: Partial<SystemSettings> }> {
    if (env.useMockApi) return delay({ ok: true, settings: updates });
    return api.post("/admin/settings", updates);
  },

  async staffMembers(): Promise<StaffMemberRow[]> {
    if (env.useMockApi) {
      return delay([
        {
          id: "staff-1",
          full_name: "YFJ Super Admin",
          email: "admin@yfjmatrimony.com",
          role: "admin",
          created_at: new Date().toISOString(),
        },
      ]);
    }
    return api.get("/admin/staff");
  },

  async updateStaffRole(userId: string, role: string): Promise<{ id: string; role: string }> {
    if (env.useMockApi) return delay({ id: userId, role });
    return api.post("/admin/staff/role", { userId, role });
  },

  async analytics(): Promise<AdminAnalyticsData> {
    if (env.useMockApi) {
      return delay({
        registrationTrend: [
          { day: "2026-10-01", count: 4 },
          { day: "2026-10-05", count: 8 },
          { day: "2026-10-10", count: 12 },
        ],
        genderBreakdown: [
          { gender: "male", count: 24 },
          { gender: "female", count: 18 },
        ],
        planBreakdown: [
          { plan: "free", count: 30 },
          { plan: "silver", count: 6 },
          { plan: "gold", count: 4 },
          { plan: "platinum", count: 2 },
        ],
        ticketStats: [
          { status: "open", count: 2 },
          { status: "resolved", count: 14 },
        ],
        verificationStats: [
          { status: "pending", count: 5 },
          { status: "approved", count: 22 },
        ],
      });
    }
    return api.get("/admin/analytics");
  },
};



