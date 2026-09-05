import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
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
        content: "Reset your YFJ Matrimony password using an OTP sent to your registered mobile.",
      },
      { property: "og:title", content: "Reset your password — YFJ Matrimony" },
      { property: "og:description", content: "Verify your mobile number and set a new password." },
    ],
  }),
  component: ForgotPasswordPage,
});

const mobileSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{10}$/, "Enter your 10-digit mobile number");
const passwordSchema = z.string().min(8, "Use at least 8 characters");

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"mobile" | "otp" | "password">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sendOtp = async () => {
    const parsed = mobileSchema.safeParse(mobile);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid value");
    setError(null);
    setPending(true);
    try {
      await authService.forgotPassword(mobile);
      toast.success("OTP sent to your mobile number");
      setStep("otp");
    } catch {
      toast.error("Could not send the OTP. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const submitPassword = async () => {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid value");
    setError(null);
    setPending(true);
    try {
      await authService.resetPassword({ mobile, otp, password });
      toast.success("Password updated. Please sign in.");
      void navigate({ to: "/login" });
    } catch {
      toast.error("Could not reset the password. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      showLogo={false}
      backTo="/login"
      title="Forgot password"
      subtitle={
        step === "mobile"
          ? "Enter your registered mobile number and we will send you a verification code."
          : step === "otp"
            ? `Enter the 6-digit code sent to +91 ${mobile}`
            : "Choose a new password for your account."
      }
    >
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        {step === "mobile" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile number</Label>
              <div className="flex gap-2">
                <span className="grid h-11 w-16 shrink-0 place-items-center rounded-xl border border-input bg-muted text-sm">
                  +91
                </span>
                <Input
                  id="mobile"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button className="w-full" size="lg" onClick={sendOtp} disabled={pending}>
              {pending ? "Sending…" : "Send OTP"}
            </Button>
          </div>
        ) : null}

        {step === "otp" ? (
          <div className="space-y-5">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={otp.length !== 6}
              onClick={() => setStep("password")}
            >
              Verify code
            </Button>
            <button
              type="button"
              onClick={sendOtp}
              className="w-full cursor-pointer text-center text-xs font-medium text-primary"
            >
              Resend code
            </button>
          </div>
        ) : null}

        {step === "password" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button className="w-full" size="lg" onClick={submitPassword} disabled={pending}>
              {pending ? "Updating…" : "Update password"}
            </Button>
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link to="/login" className="font-semibold text-primary">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
