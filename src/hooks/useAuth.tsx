import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authService } from "@/services";
import { tokenStore } from "@/lib/api-client";
import type { AuthSession, AuthUser } from "@/types";

export interface AuthContextValue {
  // Member / User session
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  setSession: (session: AuthSession) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;

  // Admin session (strictly isolated)
  adminUser: AuthUser | null;
  adminStatus: "loading" | "authenticated" | "unauthenticated";
  setAdminSession: (session: AuthSession) => void;
  signOutAdmin: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

export interface AdminAuthValue {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  setSession: (session: AuthSession) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Member state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  // Admin state
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null);
  const [adminStatus, setAdminStatus] = useState<AuthContextValue["adminStatus"]>("loading");

  const refreshUser = useCallback(async () => {
    const token = tokenStore.getUserToken();
    if (!token) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      const me = await authService.me();
      if (me && me.role !== "admin") {
        setUser(me);
        setStatus("authenticated");
      } else {
        tokenStore.clearUserToken();
        setUser(null);
        setStatus("unauthenticated");
      }
    } catch {
      tokenStore.clearUserToken();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const refreshAdmin = useCallback(async () => {
    const token = tokenStore.getAdminToken();
    if (!token) {
      setAdminUser(null);
      setAdminStatus("unauthenticated");
      return;
    }
    try {
      const admin = await authService.adminMe();
      if (admin && admin.role === "admin") {
        setAdminUser(admin);
        setAdminStatus("authenticated");
      } else {
        tokenStore.clearAdminToken();
        setAdminUser(null);
        setAdminStatus("unauthenticated");
      }
    } catch {
      tokenStore.clearAdminToken();
      setAdminUser(null);
      setAdminStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refreshUser();
    void refreshAdmin();
  }, [refreshUser, refreshAdmin]);

  // Synchronize across browser tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "yfj.auth.token") {
        void refreshUser();
      } else if (e.key === "yfj.admin.token") {
        void refreshAdmin();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshUser, refreshAdmin]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      setSession: (session) => {
        tokenStore.setUserToken(session.token);
        setUser(session.user);
        setStatus("authenticated");
      },
      signOut: async () => {
        await authService.logout();
        setUser(null);
        setStatus("unauthenticated");
      },
      refresh: refreshUser,

      adminUser,
      adminStatus,
      setAdminSession: (session) => {
        tokenStore.setAdminToken(session.token);
        setAdminUser(session.user);
        setAdminStatus("authenticated");
      },
      signOutAdmin: async () => {
        await authService.logoutAdmin();
        setAdminUser(null);
        setAdminStatus("unauthenticated");
      },
      refreshAdmin,
    }),
    [user, status, refreshUser, adminUser, adminStatus, refreshAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function useAdminAuth(): AdminAuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAdminAuth must be used within AuthProvider");
  return {
    user: context.adminUser,
    status: context.adminStatus,
    setSession: context.setAdminSession,
    signOut: context.signOutAdmin,
    refresh: context.refreshAdmin,
  };
}
