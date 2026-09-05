import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ChevronDown } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicField } from "@/components/forms/DynamicField";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { profileSections } from "@/config/profile-fields";
import { authService } from "@/services";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your free profile — YFJ Matrimony" },
      {
        name: "description",
        content:
          "Register free on YFJ Matrimony in a few guided steps and start receiving verified matches.",
      },
      { property: "og:title", content: "Create your free profile — YFJ Matrimony" },
      {
        property: "og:description",
        content: "A guided, three-step registration built for families.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [step, setStep] = useState(0); // 0, 1, 2
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [mobile, setMobile] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Total 3 steps matching mockup
  const totalSteps = 3;

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs["fullName"] = "Full name is required";
    if (!mobile.trim() || !/^[0-9]{10}$/.test(mobile.trim())) {
      errs["mobile"] = "Enter a valid 10-digit mobile number";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!validateStep1()) return;
      setValues((prev) => ({ ...prev, fullName, gender, mobile }));
      setStep(1);
      toast.success("OTP sent to +91 " + mobile);
      return;
    }

    if (step === 1) {
      // Step 2: Community & details
      setStep(2);
      return;
    }

    // Step 3: Complete registration
    setSubmitting(true);
    try {
      const session = await authService.register({
        ...values,
        fullName: fullName || values["fullName"] || "New Member",
        gender: gender.toLowerCase() as "male" | "female",
        mobile: mobile || values["mobile"] || "",
      });
      setSession(session);
      toast.success("Account created successfully. Welcome to YFJ Matrimony!");
      void navigate({ to: "/app" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Registration failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      showLogo={false}
      backTo={step > 0 ? undefined : "/login"}
      title="Create Account"
      subtitle="Complete quick details to start your partner search"
    >
      {/* 3-Step Horizontal Indicator matching Screen 4 */}
      <div className="mb-8 flex items-center justify-center gap-3">
        {[1, 2, 3].map((num, idx) => (
          <div key={num} className="flex items-center gap-3">
            <span
              className={`flex size-10 items-center justify-center rounded-full text-sm font-bold transition-all shadow-xs ${
                idx === step
                  ? "bg-[#D92662] text-white shadow-rose-950/20 shadow-md"
                  : idx < step
                    ? "bg-[#D92662] text-white"
                    : "border-2 border-border bg-white text-muted-foreground"
              }`}
            >
              {idx < step ? <Check className="size-4" /> : num}
            </span>
            {idx < totalSteps - 1 ? (
              <span
                className={`h-0.5 w-8 rounded-full transition-colors ${
                  idx < step ? "bg-[#D92662]" : "bg-border"
                }`}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Step 1 Form matching Screen 4 */}
      {step === 0 ? (
        <div className="space-y-5">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-semibold text-foreground">
              Full Name
            </Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="h-13 rounded-2xl text-base px-4 border-input bg-white shadow-2xs"
            />
            {errors["fullName"] ? (
              <p className="text-xs text-destructive">{errors["fullName"]}</p>
            ) : null}
          </div>

          {/* Gender Tile Selectors */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Gender</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender("Male")}
                className={`flex h-14 items-center justify-center gap-3 rounded-2xl border-2 px-4 text-base font-semibold transition-all ${
                  gender === "Male"
                    ? "border-[#D92662] bg-rose-50/60 text-foreground shadow-xs"
                    : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full transition-all ${
                    gender === "Male"
                      ? "bg-[#D92662] text-white"
                      : "border-2 border-muted-foreground/40 bg-transparent"
                  }`}
                >
                  {gender === "Male" ? <Check className="size-3.5 stroke-[3]" /> : null}
                </span>
                <span>Male</span>
              </button>

              <button
                type="button"
                onClick={() => setGender("Female")}
                className={`flex h-14 items-center justify-center gap-3 rounded-2xl border-2 px-4 text-base font-semibold transition-all ${
                  gender === "Female"
                    ? "border-[#D92662] bg-rose-50/60 text-foreground shadow-xs"
                    : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full transition-all ${
                    gender === "Female"
                      ? "bg-[#D92662] text-white"
                      : "border-2 border-muted-foreground/40 bg-transparent"
                  }`}
                >
                  {gender === "Female" ? <Check className="size-3.5 stroke-[3]" /> : null}
                </span>
                <span>Female</span>
              </button>
            </div>
          </div>

          {/* Mobile Number with +91 country selector */}
          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-sm font-semibold text-foreground">
              Mobile Number
            </Label>
            <div className="flex gap-2">
              <div className="flex h-13 w-20 shrink-0 items-center justify-center gap-1 rounded-2xl border border-input bg-white text-base font-semibold text-foreground shadow-2xs">
                <span>+91</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </div>
              <Input
                id="mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter mobile number"
                className="h-13 rounded-2xl text-base px-4 border-input bg-white shadow-2xs"
              />
            </div>
            {errors["mobile"] ? (
              <p className="text-xs text-destructive">{errors["mobile"]}</p>
            ) : null}
          </div>

          {/* Send OTP Action */}
          <button
            type="button"
            onClick={handleNext}
            className="w-full h-13 rounded-2xl bg-[#D92662] hover:bg-[#C2185B] text-white font-semibold text-base shadow-md shadow-rose-950/20 transition-all active:scale-[0.99] mt-2"
          >
            Send OTP
          </button>
        </div>
      ) : (
        /* Steps 2 & 3: Additional profile information */
        <div className="space-y-4 rounded-3xl border border-border bg-white p-6 shadow-card">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {step === 1 ? "Community & Values" : "Education & Profession"}
          </h2>

          <div className="space-y-4">
            {profileSections[step]?.fields.map((field) => (
              <DynamicField
                key={field.name}
                field={field}
                value={values[field.name] ?? ""}
                error={errors[field.name]}
                onChange={(val) => setValues((prev) => ({ ...prev, [field.name]: val }))}
              />
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl h-13"
              onClick={() => setStep((v) => v - 1)}
            >
              <ArrowLeft className="mr-1 size-4" /> Back
            </Button>
            <Button
              className="flex-1 rounded-2xl h-13 bg-[#D92662] hover:bg-[#C2185B] text-white font-semibold text-base"
              size="lg"
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting ? "Creating…" : step === 2 ? "Complete Registration" : "Continue"}
              {!submitting && step < 2 ? <ArrowRight className="ml-1 size-4" /> : null}
            </Button>
          </div>
        </div>
      )}

      {step === 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">or</p>
          <GoogleButton label="Sign up with Google" />
        </div>
      ) : null}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-[#D92662] hover:underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
