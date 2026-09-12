import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Shield, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { authService } from "@/services";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/matrimony/login")({
  head: () => ({
    meta: [
      { title: "Admin Portal Login — YFJ Matrimony" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { setSession, status, user } = useAuth();

  // Auto-redirect if already authenticated as admin
  useEffect(() => {
    if (status === "authenticated" && user?.role === "admin") {
      void navigate({ to: "/admin/matrimony" });
    }
  }, [status, user, navigate]);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      toast.error("Please enter your Admin Login ID and Password");
      return;
    }

    setIsLoading(true);
    try {
      const session = await authService.loginAdmin({
        loginId: loginId.trim(),
        password,
      });
      setSession(session);
      toast.success("Welcome back, Administrator");
      void navigate({ to: "/admin/matrimony" });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Invalid administrative credentials. Please verify your Login ID and Password.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-background via-surface to-muted/40 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-4" /> Admin Portal
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
            Restricted Admin Access
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter your authorized administrative ID and password to proceed.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-7 shadow-xl shadow-stone-950/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-login-id" className="text-xs font-medium">
                Admin Login ID
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-login-id"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="admin@yfjmatrimony.com"
                  autoComplete="username"
                  required
                  className="h-11 rounded-2xl pl-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-xs font-medium">
                Admin Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="h-11 rounded-2xl pl-10 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-2xl font-semibold gap-2 mt-2"
            >
              {isLoading ? (
                "Authenticating…"
              ) : (
                <>
                  <Shield className="size-4" /> Secure Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/60 text-center">
            <p className="text-[0.7rem] text-muted-foreground leading-relaxed">
              Protected with 256-bit encryption & role validation. Unauthorized access attempts are
              monitored and logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
