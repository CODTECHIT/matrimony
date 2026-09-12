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
        tokenStore.set(result.token);
        return delay(result, 200);
      }
      throw new Error("Invalid administrative credentials");
    }
    const result = await api.post<AuthSession>("/admin/login", payload);
    tokenStore.set(result.token);
    return result;
  },

  async loginWithEmail(payload: EmailLoginPayload): Promise<AuthSession> {
    if (env.useMockApi) {
      const isAdmin = payload.email.trim().toLowerCase().startsWith("admin");
      const user = isAdmin ? mockAdmin : { ...mockUser, email: payload.email };
      const result: AuthSession = {
        token: isAdmin ? "mock-admin-token" : "mock-user-token",
        user,
      };
      tokenStore.set(result.token);
      return delay(result);
    }
    const result = await api.post<AuthSession>("/auth/login", payload);
    tokenStore.set(result.token);
    return result;
  },

  async loginWithMobile(payload: MobileLoginPayload): Promise<AuthSession> {
    if (payload.email) {
      return this.loginWithEmail({ email: payload.email, password: payload.password });
    }
    if (env.useMockApi) {
      const isAdmin = (payload.mobile || "").endsWith("0000");
      const user = isAdmin ? mockAdmin : mockUser;
      const result: AuthSession = {
        token: isAdmin ? "mock-admin-token" : "mock-user-token",
        user,
      };
      tokenStore.set(result.token);
      return delay(result);
    }
    const result = await api.post<AuthSession>("/auth/login", payload);
    tokenStore.set(result.token);
    return result;
  },

  async requestOtp(mobile: string): Promise<{ sent: boolean; expiresInSeconds: number }> {
    if (env.useMockApi) return delay({ sent: true, expiresInSeconds: 60 });
    return api.post("/auth/otp/request", { mobile });
  },

  async verifyOtp(mobile: string, otp: string): Promise<AuthSession> {
    if (env.useMockApi) {
      const isAdmin = mobile.endsWith("0000");
      const user = isAdmin ? mockAdmin : mockUser;
      const result: AuthSession = {
        token: isAdmin ? "mock-admin-token" : "mock-user-token",
        user,
      };
      tokenStore.set(result.token);
      return delay(result);
    }
    const result = await api.post<AuthSession>("/auth/otp/verify", { mobile, otp });
    tokenStore.set(result.token);
    return result;
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    if (env.useMockApi) {
      const result: AuthSession = {
        token: "mock-user-token",
        user: { ...mockUser, fullName: payload.fullName, gender: payload.gender, email: payload.email },
      };
      tokenStore.set(result.token);
      return delay(result);
    }
    const result = await api.post<AuthSession>("/auth/register", payload);
    tokenStore.set(result.token);
    return result;
  },

  async forgotPassword(email: string): Promise<{ sent: boolean; message?: string; devOtp?: string }> {
    if (env.useMockApi) return delay({ sent: true, message: `Verification code sent to ${email}`, devOtp: "123456" });
    return api.post("/auth/password/forgot", { email });
  },

  async verifyResetOtp(payload: { email: string; otp: string }): Promise<{ valid: boolean }> {
    if (env.useMockApi) return delay({ valid: payload.otp === "123456" || payload.otp.length === 6 });
    return api.post("/auth/password/verify-otp", payload);
  },

  async resetPassword(payload: { email: string; otp: string; password: string }): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true });
    return api.post<{ ok: boolean }>("/auth/password/reset", payload);
  },

  async me(): Promise<AuthUser | null> {
    if (env.useMockApi) {
      const token = tokenStore.get();
      if (!token) return null;
      if (token === "mock-admin-token") {
        return delay(mockAdmin, 80);
      }
      return delay(mockUser, 80);
    }
    if (!tokenStore.get()) return null;
    return api.get<AuthUser>("/auth/me");
  },

  async logout(): Promise<void> {
    tokenStore.clear();
    if (env.useMockApi) return delay(undefined, 50);
    await api.post("/auth/logout").catch(() => {});
  },

  async getPreferences(): Promise<Record<string, boolean>> {
    const defaults = {
      interests: true,
      messages: true,
      matches: false,
      photo: true,
      contact: true,
      online: false,
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
