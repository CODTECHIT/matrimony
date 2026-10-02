import { api, tokenStore } from "@/lib/api-client";
import { env } from "@/lib/env";
import type { AuthSession, AuthUser } from "@/types";
import { mockAdmin, mockUser } from "@/mocks/data";
import { delay } from "@/mocks/adapter";

export interface EmailLoginPayload {
  email: string;
  password: string;
}

export interface MobileLoginPayload {
  mobile?: string;
  email?: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  gender: "male" | "female";
  email: string;
  password?: string;
  mobile?: string;
  dateOfBirth?: string;
  religion?: string;
  caste?: string;
  motherTongue?: string;
  maritalStatus?: string;
  height?: string;
  education?: string;
  occupation?: string;
  employmentStatus?: string;
  incomeRange?: string;
  city?: string;
  state?: string;
  [key: string]: unknown;
}

export interface AdminLoginPayload {
  loginId: string;
  password: string;
}

function session(user: AuthUser): AuthSession {
  return { token: "mock-token", user };
}

export const authService = {
  async loginAdmin(payload: AdminLoginPayload): Promise<AuthSession> {
    if (env.useMockApi) {
      if (
        (payload.loginId.trim().toLowerCase() === "admin@yfjmatrimony.com" ||
          payload.loginId.trim().toLowerCase() === "admin") &&
        payload.password === "Admin@YFJ2026"
      ) {
        const result: AuthSession = { token: "mock-admin-token", user: mockAdmin };
        tokenStore.setAdminToken(result.token);
        return delay(result, 200);
      }
      throw new Error("Invalid administrative credentials");
    }
    const result = await api.post<AuthSession>("/admin/login", payload, { scope: "admin" });
    tokenStore.setAdminToken(result.token);
    return result;
  },

  async loginWithEmail(payload: EmailLoginPayload): Promise<AuthSession> {
    const isMockAdmin =
      payload.email.trim().toLowerCase().startsWith("admin") ||
      payload.email.trim().toLowerCase() === "admin@yfjmatrimony.com";
    if (isMockAdmin) {
      throw new Error(
        "Admin accounts cannot login from the member login page. Please access the Admin Portal.",
      );
    }
    if (env.useMockApi) {
      const user = { ...mockUser, email: payload.email };
      const result: AuthSession = {
        token: "mock-user-token",
        user,
      };
      tokenStore.setUserToken(result.token);
      return delay(result);
    }
    const result = await api.post<AuthSession>("/auth/login", payload, { scope: "user" });
    if (result.user.role === "admin") {
      throw new Error(
        "Admin accounts cannot login from the member login page. Please access the Admin Portal.",
      );
    }
    tokenStore.setUserToken(result.token);
    return result;
  },

  async loginWithMobile(payload: MobileLoginPayload): Promise<AuthSession> {
    if (payload.email) {
      return this.loginWithEmail({ email: payload.email, password: payload.password });
    }
    const isMockAdmin = (payload.mobile || "").endsWith("0000");
    if (isMockAdmin) {
      throw new Error(
        "Admin accounts cannot login from the member login page. Please access the Admin Portal.",
      );
    }
    if (env.useMockApi) {
      const result: AuthSession = {
        token: "mock-user-token",
        user: mockUser,
      };
      tokenStore.setUserToken(result.token);
      return delay(result);
    }
    const result = await api.post<AuthSession>("/auth/login", payload, { scope: "user" });
    if (result.user.role === "admin") {
      throw new Error(
        "Admin accounts cannot login from the member login page. Please access the Admin Portal.",
      );
    }
    tokenStore.setUserToken(result.token);
    return result;
  },

  async requestOtp(mobile: string): Promise<{ sent: boolean; expiresInSeconds: number }> {
    if (env.useMockApi) return delay({ sent: true, expiresInSeconds: 60 });
    return api.post("/auth/otp/request", { mobile });
  },

  async verifyOtp(mobile: string, otp: string): Promise<AuthSession> {
    const isMockAdmin = mobile.endsWith("0000");
    if (isMockAdmin) {
      throw new Error(
        "Admin accounts cannot login from the member login page. Please access the Admin Portal.",
      );
    }
    if (env.useMockApi) {
      const result: AuthSession = {
        token: "mock-user-token",
        user: mockUser,
      };
      tokenStore.setUserToken(result.token);
      return delay(result);
    }
    const result = await api.post<AuthSession>(
      "/auth/otp/verify",
      { mobile, otp },
      { scope: "user" },
    );
    if (result.user.role === "admin") {
      throw new Error(
        "Admin accounts cannot login from the member login page. Please access the Admin Portal.",
      );
    }
    tokenStore.setUserToken(result.token);
    return result;
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    if (env.useMockApi) {
      const newUser: AuthUser = {
        ...mockUser,
        id: `u-${Date.now()}`,
        fullName: payload.fullName,
        gender: payload.gender,
        email: payload.email,
        plan: "free",
        profileCompletion: 20,
        profileStatus: "pending", // Must be approved by admin before browsing
      };

      // Add to mockProfiles so admin Users page shows them
      const { mockProfiles } = await import("@/mocks/data");
      const photos = mockProfiles[0]?.photos ?? [];
      mockProfiles.push({
        id: newUser.id,
        fullName: newUser.fullName,
        age: 25,
        gender: newUser.gender,
        photos,
        about: "",
        height: "—",
        religion: "—",
        caste: "—",
        motherTongue: "—",
        maritalStatus: "never_married",
        education: (payload.education as string) ?? "—",
        occupation: (payload.occupation as string) ?? "—",
        employmentStatus: "—",
        incomeRange: "—",
        city: (payload.city as string) ?? "—",
        state: (payload.state as string) ?? "—",
        country: "India",
        family: {},
        lastActive: "Online now",
        verified: false,
        shortlisted: false,
        interestSent: false,
        isConnected: false,
        canViewContact: false,
        profileStatus: "pending",
        isVip: false,
      });

      // Add to mockAdminUsers so admin can find and approve them
      const { mockAdminUsers } = await import("@/mocks/data");
      mockAdminUsers.unshift({
        id: newUser.id,
        fullName: newUser.fullName,
        mobile: payload.mobile ?? "—",
        gender: newUser.gender,
        city: (payload.city as string) ?? "—",
        plan: "free",
        profileStatus: "pending",
        joinedAt: new Date().toISOString().split("T")[0]!,
      });

      const result: AuthSession = { token: "mock-user-token", user: newUser };
      tokenStore.setUserToken(result.token);
      return delay(result);
    }
    const result = await api.post<AuthSession>("/auth/register", payload, { scope: "user" });
    tokenStore.setUserToken(result.token);
    return result;
  },

  async forgotPassword(
    email: string,
  ): Promise<{ sent: boolean; message?: string; devOtp?: string }> {
    if (env.useMockApi)
      return delay({ sent: true, message: `Verification code sent to ${email}`, devOtp: "123456" });
    return api.post("/auth/password/forgot", { email });
  },

  async verifyResetOtp(payload: { email: string; otp: string }): Promise<{ valid: boolean }> {
    if (env.useMockApi)
      return delay({ valid: payload.otp === "123456" || payload.otp.length === 6 });
    return api.post("/auth/password/verify-otp", payload);
  },

  async resetPassword(payload: {
    email: string;
    otp: string;
    password: string;
  }): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true });
    return api.post<{ ok: boolean }>("/auth/password/reset", payload);
  },

  async me(): Promise<AuthUser | null> {
    const token = tokenStore.getUserToken();
    if (!token) return null;
    if (env.useMockApi) {
      if (token === "mock-admin-token") return null;
      return delay(mockUser, 80);
    }
    try {
      const user = await api.get<AuthUser>("/auth/me", { scope: "user" });
      if (user.role === "admin") return null;
      return user;
    } catch {
      return null;
    }
  },

  async adminMe(): Promise<AuthUser | null> {
    const token = tokenStore.getAdminToken();
    if (!token) return null;
    if (env.useMockApi) {
      if (token === "mock-admin-token") {
        return delay(mockAdmin, 80);
      }
      return null;
    }
    try {
      const user = await api.get<AuthUser>("/admin/me", { scope: "admin" });
      if (user.role !== "admin") return null;
      return user;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    tokenStore.clearUserToken();
    if (env.useMockApi) return delay(undefined, 50);
    await api.post("/auth/logout", undefined, { scope: "user" }).catch(() => {});
  },

  async logoutAdmin(): Promise<void> {
    tokenStore.clearAdminToken();
    if (env.useMockApi) return delay(undefined, 50);
    await api.post("/admin/logout", undefined, { scope: "admin" }).catch(() => {});
  },

  async getPreferences(): Promise<Record<string, boolean>> {
    const defaults = {
      interests: true,
      messages: true,
      matches: false,
      photo: false,
      contact: true,
      online: true,
    };
    if (env.useMockApi) {
      if (typeof window === "undefined") return defaults;
      const raw = window.localStorage.getItem("yfj.auth.preferences");
      return delay(raw ? { ...defaults, ...JSON.parse(raw) } : defaults, 50);
    }
    return api.get<Record<string, boolean>>("/auth/preferences").catch(() => defaults);
  },

  async updatePreferences(preferences: Record<string, boolean>): Promise<Record<string, boolean>> {
    if (env.useMockApi) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("yfj.auth.preferences", JSON.stringify(preferences));
      }
      return delay(preferences, 100);
    }
    return api.patch<Record<string, boolean>>("/auth/preferences", preferences);
  },
};
