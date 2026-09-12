import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authService } from "@/services";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — YFJ Matrimony" },
      {
        name: "description",
        content: "Reset your YFJ Matrimony password using an OTP sent to your registered email.",
      },
      { property: "og:title", content: "Reset your password — YFJ Matrimony" },
      { property: "og:description", content: "Verify your email and set a new password." },
    ],
  }),
  component: ForgotPasswordPage,
});

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .email("Enter a valid email address (e.g. name@gmail.com)");

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [receivedOtpHint, setReceivedOtpHint] = useState<string | null>(null);

  const sendOtp = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      return setError(parsed.error.issues[0]?.message ?? "Invalid email");
    }
    setError(null);
    setPending(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      if (res.devOtp) {
        setReceivedOtpHint(res.devOtp);
        toast.success(`Verification code sent! (Code: ${res.devOtp})`, { duration: 7000 });
      } else {
        toast.success("Verification code sent to your email!");
      }
      setStep("otp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send verification code. Please check your email.");
    } finally {
      setPending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      return setError("Please enter the 6-digit verification code");
    }
    setError(null);
    setPending(true);
    try {
      await authService.verifyResetOtp({ email: email.trim(), otp: otp.trim() });
      toast.success("Code verified! Set your new password.");
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
      toast.error("Invalid verification code. Please check and try again.");
    } finally {
      setPending(false);
    }
  };

  const submitPassword = async () => {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      return setError(parsed.error.issues[0]?.message ?? "Password must be at least 6 characters");
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }
    setError(null);
    setPending(true);
    try {
      await authService.resetPassword({ email: email.trim(), otp: otp.trim(), password });
      toast.success("Password updated successfully! Please log in.");
      void navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      showLogo={false}
      backTo="/login"
      title="Forgot Password"
      subtitle={
        step === "email"
          ? "Enter your registered Gmail / Email address and we will send you a verification code."
          : step === "otp"
            ? `Enter the 6-digit code sent to ${email}`
            : "Choose a new secure password for your account."
      }
    >
      <div className="rounded-3xl border border-border bg-white p-6 shadow-card space-y-5">
        {step === "email" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                Registered Gmail / Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email (e.g. name@gmail.com)"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError(null);
                  }}
                  className="h-13 rounded-2xl text-base px-4 pr-10 border-input bg-white shadow-2xs"
                  autoFocus
                />
                <Mail className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>

            <Button
              className="w-full h-13 rounded-2xl bg-[#D92662] hover:bg-[#C2185B] text-white font-semibold text-base shadow-md shadow-rose-950/20 active:scale-[0.99] transition-all cursor-pointer"
              size="lg"
              onClick={sendOtp}
              disabled={pending}
            >
              {pending ? "Sending code…" : "Send Verification Code"}
            </Button>
          </div>
        ) : null}

        {step === "otp" ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-[#D92662]">
                <ShieldCheck className="size-6" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                We sent a 6-digit OTP to <span className="font-semibold text-foreground">{email}</span>
              </p>
              {receivedOtpHint ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs text-amber-800 font-medium text-center">
                  Testing OTP: <span className="font-mono font-bold tracking-wider">{receivedOtpHint}</span>
                </div>
              ) : null}
            </div>

            <div className="flex justify-center py-2">
              <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} className="size-11 sm:size-12 rounded-xl text-lg font-bold" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error ? <p className="text-xs text-center text-destructive">{error}</p> : null}

            <Button
              className="w-full h-13 rounded-2xl bg-[#D92662] hover:bg-[#C2185B] text-white font-semibold text-base shadow-md shadow-rose-950/20 active:scale-[0.99] transition-all cursor-pointer"
              size="lg"
              disabled={otp.length !== 6 || pending}
              onClick={handleVerifyOtp}
            >
              {pending ? "Verifying…" : "Verify Code"}
            </Button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError(null);
                }}
                className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Change email
              </button>
              <button
                type="button"
                onClick={sendOtp}
                disabled={pending}
                className="cursor-pointer text-xs font-semibold text-[#D92662] hover:underline"
              >
                Resend code
              </button>
            </div>
          </div>
        ) : null}

        {step === "password" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-xl p-2.5 border border-emerald-200">
              <KeyRound className="size-4 shrink-0" />
              <span>Identity verified. Create a new password.</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter new password (min 6 characters)"
                  className="h-13 rounded-2xl text-base px-4 pr-11 border-input bg-white shadow-2xs"
                  autoFocus
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="Re-enter new password"
                className="h-13 rounded-2xl text-base px-4 border-input bg-white shadow-2xs"
              />
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <Button
              className="w-full h-13 rounded-2xl bg-[#D92662] hover:bg-[#C2185B] text-white font-semibold text-base shadow-md shadow-rose-950/20 active:scale-[0.99] transition-all cursor-pointer"
              size="lg"
              onClick={submitPassword}
              disabled={pending}
            >
              {pending ? "Updating…" : "Reset & Save Password"}
            </Button>
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link to="/login" className="font-semibold text-[#D92662] hover:underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
