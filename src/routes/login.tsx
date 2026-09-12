import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services";
import { useAuth } from "@/hooks/useAuth";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: (search) => loginSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Login — YFJ Matrimony" },
      {
        name: "description",
        content: "Sign in to YFJ Matrimony with your registered email and password.",
      },
      { property: "og:title", content: "Login — YFJ Matrimony" },
      { property: "og:description", content: "Access your matches, interests and messages." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address")
    .email("Enter a valid email address (e.g. name@gmail.com)"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { setSession, status, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const getDestination = (role: string) => {
    if (role === "admin") return "/admin";
    if (search.redirect && search.redirect.startsWith("/")) return search.redirect;
    return "/app";
  };

  // Redirect if user is already authenticated
  useEffect(() => {
    if (status === "authenticated" && user) {
      void navigate({ to: getDestination(user.role) });
    }
  }, [status, user, navigate]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const session = await authService.loginWithEmail(parsed.data);
      setSession(session);
      toast.success(`Welcome back, ${session.user.fullName.split(" ")[0]}`);
      void navigate({ to: getDestination(session.user.role) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-4">

        {/* Email & Password Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
              Gmail / Email address
            </Label>
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors["email"]) setErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="Enter your email (e.g. name@gmail.com)"
                className="h-13 rounded-2xl text-base px-4 pr-10 border-input bg-white shadow-2xs"
                required
                aria-invalid={Boolean(errors["email"])}
                aria-describedby={errors["email"] ? "email-error" : undefined}
              />
              <Mail className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            </div>
            {errors["email"] ? (
              <p id="email-error" className="text-xs text-destructive">{errors["email"]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors["password"]) setErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="Enter password"
                className="h-13 rounded-2xl text-base px-4 pr-11 border-input bg-white shadow-2xs"
                required
                aria-invalid={Boolean(errors["password"])}
                aria-describedby={errors["password"] ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors["password"] ? (
              <p id="password-error" className="text-xs text-destructive">{errors["password"]}</p>
            ) : null}
          </div>

          <div className="flex justify-end pt-0.5">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[#D92662] hover:underline cursor-pointer"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-13 rounded-2xl bg-[#D92662] hover:bg-[#C2185B] text-white font-semibold text-base shadow-md shadow-rose-950/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/register" className="font-semibold text-[#D92662] hover:underline">
          Create Account
        </Link>
      </p>
    </AuthLayout>
  );
}
