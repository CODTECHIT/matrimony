import { env } from "./env";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const USER_TOKEN_KEY = "yfj.auth.token";
const ADMIN_TOKEN_KEY = "yfj.admin.token";

export const tokenStore = {
  getUserToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(USER_TOKEN_KEY);
  },
  setUserToken(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(USER_TOKEN_KEY, token);
  },
  clearUserToken() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(USER_TOKEN_KEY);
  },

  getAdminToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  },
  setAdminToken(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  },
  clearAdminToken() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  // Backwards compatibility methods
  get(scope?: "user" | "admin"): string | null {
    if (scope === "admin") return this.getAdminToken();
    return this.getUserToken();
  },
  set(token: string, scope?: "user" | "admin") {
    if (scope === "admin") this.setAdminToken(token);
    else this.setUserToken(token);
  },
  clear(scope?: "user" | "admin" | "all") {
    if (scope === "admin") {
      this.clearAdminToken();
    } else if (scope === "all") {
      this.clearUserToken();
      this.clearAdminToken();
    } else {
      this.clearUserToken();
    }
  },
};

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  scope?: "user" | "admin";
}

/**
 * Single entry point for every backend call.
 * Components never call fetch directly — they go through src/services/*.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, scope, ...rest } = options;

  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const base = (env.apiBaseUrl || `${origin}/api`).replace(/\/?$/, "/");
  const url = new URL(path.replace(/^\//, ""), base);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const isAdminScope = scope === "admin" || path.startsWith("/admin") || path.startsWith("admin");
  const token = isAdminScope ? tokenStore.getAdminToken() : tokenStore.getUserToken();
  const response = await fetch(url.toString(), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      (payload as { message?: string } | null)?.message ?? `Request failed (${response.status})`,
      response.status,
      payload,
    );
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
