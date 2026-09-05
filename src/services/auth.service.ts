import { api, tokenStore } from "@/lib/api-client";
import { env } from "@/lib/env";
import type { AuthSession, AuthUser } from "@/types";
import { mockAdmin, mockUser } from "@/mocks/data";
import { delay } from "@/mocks/adapter";

export interface MobileLoginPayload {
  mobile: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  gender: "male" | "female";
  mobile: string;
  password?: string;
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
  /** Backend returns the Google OAuth redirect URL; the client never holds a secret. */
  async googleAuthUrl(): Promise<{ url: string }> {
    if (env.useMockApi) return delay({ url: "" });
    return api.get("/auth/google/url");
  },

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

  async loginWithMobile(payload: MobileLoginPayload): Promise<AuthSession> {
    if (env.useMockApi) {
      const user = payload.mobile.endsWith("0000") ? mockAdmin : mockUser;
      const result = session(user);
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
      const result = session(mockUser);
      tokenStore.set(result.token);
      return delay(result);
    }
    const result = await api.post<AuthSession>("/auth/otp/verify", { mobile, otp });
    tokenStore.set(result.token);
    return result;
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    if (env.useMockApi) {
      const result = session({ ...mockUser, fullName: payload.fullName, gender: payload.gender });
      tokenStore.set(result.token);
      return delay(result);
    }
    const result = await api.post<AuthSession>("/auth/register", payload);
    tokenStore.set(result.token);
    return result;
  },

  async forgotPassword(mobile: string): Promise<{ sent: boolean }> {
    if (env.useMockApi) return delay({ sent: true });
    return api.post("/auth/password/forgot", { mobile });
  },

  async resetPassword(payload: { mobile: string; otp: string; password: string }) {
    if (env.useMockApi) return delay({ ok: true });
    return api.post<{ ok: boolean }>("/auth/password/reset", payload);
  },

  async me(): Promise<AuthUser | null> {
    // In demo (mock) mode the sample member is always available so the UI is explorable.
    if (env.useMockApi) {
      const token = tokenStore.get();
      if (token === "mock-admin-token") {
        return delay(mockAdmin, 120);
      }
      return delay(mockUser, 120);
    }
    if (!tokenStore.get()) return null;
    return api.get<AuthUser>("/auth/me");
  },

  async logout(): Promise<void> {
    tokenStore.clear();
    if (env.useMockApi) return;
    await api.post("/auth/logout");
  },
};
