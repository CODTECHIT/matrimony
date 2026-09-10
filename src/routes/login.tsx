import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { authService } from "@/services";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — YFJ Matrimony" },
      {
        name: "description",
        content: "Sign in to YFJ Matrimony with Google or your registered mobile number.",
      },
      { property: "og:title", content: "Login — YFJ Matrimony" },
      { property: "og:description", content: "Access your matches, interests and messages." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Enter your 10-digit mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userParam = params.get("user");
    const errorParam = params.get("error");

    if (errorParam) {
      toast.error("Google sign-in could not be completed. Please use phone login.");
    } else if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        setSession({ token, user });
        toast.success(`Welcome, ${user.fullName.split(" ")[0]}!`);
        void navigate({ to: user.role === "admin" ? "/admin" : "/app" });
      } catch (err) {
        console.error("Failed to parse OAuth session", err);
      }
    }
  }, [setSession, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const session = await authService.loginWithMobile(parsed.data);
      setSession(session);
      toast.success(`Welcome back, ${session.user.fullName.split(" ")[0]}`);
      void navigate({ to: session.user.role === "admin" ? "/admin" : "/app" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-3">
        <GoogleButton onFallback={() => setShowPasswordForm(true)} />
        {!showPasswordForm ? (
          <button
            type="button"
            className="flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-[#D92662] bg-white px-4 text-base font-semibold text-[#D92662] hover:bg-rose-50/50 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
            onClick={() => setShowPasswordForm(true)}
          >
            <Phone className="size-4" />
            <span>Login with Phone</span>
          </button>
        ) : null}
      </div>

      {showPasswordForm ? (
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mobile" className="text-xs font-semibold text-muted-foreground">
              Mobile number
            </Label>
            <div className="flex gap-2">
              <span className="grid h-12 w-16 shrink-0 place-items-center rounded-2xl border border-input bg-muted/60 text-sm font-medium">
                +91
              </span>
              <Input
                id="mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter mobile number"
                className="h-12 rounded-2xl text-base"
                required
              />
            </div>
            {errors["mobile"] ? (
              <p className="text-xs text-destructive">{errors["mobile"]}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              className="h-12 rounded-2xl text-base"
              required
            />
            {errors["password"] ? (
              <p className="text-xs text-destructive">{errors["password"]}</p>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[#D92662] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full h-13 rounded-2xl bg-[#D92662] hover:bg-[#C2185B] text-white font-semibold text-base shadow-md shadow-rose-950/20"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Login"}
          </Button>
        </form>
      ) : null}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/register" className="font-semibold text-[#D92662] hover:underline">
          Create Account
        </Link>
      </p>
    </AuthLayout>
  );
}
