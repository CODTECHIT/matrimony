import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  Crown,
  Eye,
  Gem,
  Handshake,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/common/states";
import { subscriptionsService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { env } from "@/lib/env";
import { openRazorpayCheckout } from "@/lib/razorpay";
import type { Plan } from "@/types";
import goldCrown from "@/assets/gold-crown.png";

export const Route = createFileRoute("/app/upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade to Premium — YFJ Matrimony" },
      {
        name: "description",
        content: "Compare Silver, Gold and Platinum matrimony plans and upgrade securely.",
      },
      { property: "og:title", content: "Upgrade to Premium — YFJ Matrimony" },
      { property: "og:description", content: "Unlock unlimited messaging and contact details." },
    ],
  }),
  component: UpgradePage,
});

const premiumFeatures = [
  {
    icon: MessageCircle,
    iconColor: "text-primary",
    bgColor: "bg-primary-soft",
    title: "Send Unlimited Messages",
    description: "Connect directly with verified profiles without any limits",
  },
  {
    icon: Eye,
    iconColor: "text-[#9E7314] dark:text-amber-300",
    bgColor: "bg-gold-soft",
    title: "View Contact Numbers",
    description: "Instant phone numbers & WhatsApp details of interested matches",
  },
  {
    icon: Zap,
    iconColor: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-950/40",
    title: "Priority Profile Listing",
    description: "Get highlighted at the top of search results and match feeds",
  },
  {
    icon: Lock,
    iconColor: "text-stone-700 dark:text-stone-300",
    bgColor: "bg-stone-100 dark:bg-stone-800",
    title: "Enhanced Privacy Controls",
    description: "Full control over who can view your photos and bio",
  },
  {
    icon: Handshake,
    iconColor: "text-primary",
    bgColor: "bg-primary-soft",
    title: "Dedicated Relationship Manager",
    description: "Personal assistance and expert guidance on your journey",
  },
] as const;

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function UpgradePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("plan-gold");
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: () => subscriptionsService.plans() });
  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });

  const activeCouponsQuery = useQuery<{ id: string; code: string; discount_type: string; discount_value: number; min_amount?: number }[]>({
    queryKey: ["coupons", "active"],
    queryFn: () => api.get("/coupons/active"),
    staleTime: 60 * 1000,
  });
  const activeCoupons = activeCouponsQuery.data ?? [];

  const paidPlans = plansQuery.data?.filter((p) => p.tier !== "free") ?? [];
  const selectedPlan = paidPlans.find((p) => p.id === selectedPlanId) ?? paidPlans[1];

  const { user } = useAuth();

  const handleApplyCoupon = async (e?: React.FormEvent, directCode?: string) => {
    if (e) e.preventDefault();
    const targetCode = (directCode || couponCode).trim();
    if (!targetCode) {
      toast.error("Please enter a coupon code");
      return;
    }
    if (!selectedPlan) return;

    setValidatingCoupon(true);
    const basePrice = isYearly ? Math.round(selectedPlan.priceInr * 0.8) : selectedPlan.priceInr;
    try {
      const res = await subscriptionsService.validateCoupon(targetCode, basePrice);
      setAppliedCoupon({
        code: res.code,
        discountAmount: res.discountAmount,
        finalAmount: res.finalAmount,
        discountType: res.discountType,
        discountValue: res.discountValue,
      });
      setCouponCode(res.code);
      toast.success(res.message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.info("Coupon removed");
  };

  const handleSelect = async (plan: Plan) => {
    if (plan.priceInr === 0) return;
    setPendingPlan(plan.id);
    const basePrice = isYearly ? Math.round(plan.priceInr * 0.8) : plan.priceInr;
    const finalAmount = appliedCoupon ? appliedCoupon.finalAmount : basePrice;

    try {
      const order = await subscriptionsService.createOrder(plan.id);

      // If Razorpay publishable key is set, open real Razorpay checkout modal
      if (env.paymentPublicKey) {
        const opened = await openRazorpayCheckout({
          key: env.paymentPublicKey,
          amountInr: finalAmount,
          ...(order.orderId.startsWith("order_mock") ? {} : { orderId: order.orderId }),
          planName: plan.name,
          description: `${plan.name} Membership (${plan.durationMonths} months)`,
          user: {
            ...(user?.fullName ? { fullName: user.fullName } : {}),
            ...(user?.email ? { email: user.email } : {}),
            ...(user?.mobile ? { mobile: user.mobile } : {}),
          },
          onSuccess: async (payment) => {
            await subscriptionsService.verifyPayment({
              planId: plan.id,
              razorpay_payment_id: payment.razorpay_payment_id,
              razorpay_order_id: payment.razorpay_order_id || order.orderId,
              razorpay_signature: payment.razorpay_signature || "",
            });
            await queryClient.invalidateQueries({ queryKey: ["subscription"] });
            await queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
            toast.success(`🎉 Upgrade Successful! You are now subscribed to ${plan.name}.`);
            void navigate({ to: "/app" });
          },
        });
        if (opened) return;
      }

      // Seamless simulation mode when in mock mode or when gateway key is pending
      await subscriptionsService.verifyPayment({
        planId: plan.id,
        orderId: order.orderId,
        razorpay_payment_id: `pay_sim_${Date.now()}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
      toast.success(`🎉 Upgrade Successful (Simulated)! ${plan.name} plan activated.`);
      void navigate({ to: "/app" });
    } catch {
      toast.error("Could not process subscription. Please try again.");
    } finally {
      setPendingPlan(null);
    }
  };

  if (plansQuery.isPending) return <LoadingState label="Loading plans" />;
  if (plansQuery.isError) return <ErrorState onRetry={() => void plansQuery.refetch()} />;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Top Bar Header matching Screen 7 & Screen 5 */}
      <div className="flex items-center gap-3 border-b border-border/70 pb-4">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="rounded-full size-10 hover:bg-muted text-foreground shrink-0"
          aria-label="Go back"
        >
          <Link to="/app">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Upgrade to Premium
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Choose the membership that helps you find your life partner faster
          </p>
        </div>
      </div>

      {/* Screen 5 Hero: Premium Features Showcase */}
      <section className="relative overflow-hidden rounded-3xl border border-[#C59B27]/30 bg-gradient-to-br from-amber-50/70 via-rose-50/40 to-background p-6 sm:p-8 shadow-sm">
        <div className="grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 flex flex-col items-center text-center">
            <div className="relative size-36 sm:size-44 mb-3">
              <img
                src={goldCrown}
                alt="3D Gold Crown"
                className="w-full h-full object-contain drop-shadow-xl animate-pulse"
              />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#C59B27]/15 px-3 py-1 text-xs font-bold text-[#C59B27]">
              <Crown className="size-3.5" />
              YFJ Premium Benefits
            </span>
            <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold text-foreground">
              Everything You Need To Connect
            </h2>
          </div>

          <div className="md:col-span-7 space-y-3">
            {premiumFeatures.map((feat) => (
              <div
                key={feat.title}
                className="flex items-start gap-3 rounded-2xl bg-white/80 dark:bg-stone-900/80 p-3 shadow-2xs border border-border/50"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${feat.bgColor}`}
                >
                  <feat.icon className={`size-5 ${feat.iconColor}`} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">{feat.title}</h3>
                  <p className="text-[0.72rem] sm:text-xs text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screen 7: Plan Selection */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              Select Your Plan
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Transparent pricing with no hidden renewal charges
            </p>
          </div>

          {/* Billing Switch Toggle matching Screen 7 */}
          <div
            role="tablist"
            aria-label="Billing frequency"
            className="inline-flex items-center gap-2.5 rounded-full bg-muted/80 p-1.5 self-start sm:self-auto border border-border/60"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isYearly}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                !isYearly ? "bg-white shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setIsYearly(false)}
            >
              Standard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isYearly}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isYearly
                  ? "bg-gold text-gold-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setIsYearly(true)}
            >
              Yearly{" "}
              <span className="text-[0.65rem] bg-rose-500 text-white rounded-full px-1.5 py-0.2">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Tiered Plan Cards matching Screen 7 (Silver, Gold, Platinum) */}
        <div role="radiogroup" aria-label="Membership plans" className="grid gap-4 sm:grid-cols-3">
          {paidPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isCurrent = subscriptionQuery.data?.planId === plan.id;
            const price = isYearly ? Math.round(plan.priceInr * 0.8) : plan.priceInr;

            return (
              <div
                key={plan.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => setSelectedPlanId(plan.id)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setSelectedPlanId(plan.id);
                  }
                }}
                className={`relative flex flex-col rounded-3xl p-5 cursor-pointer transition-all border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "border-[#D92662] ring-2 ring-[#D92662]/20 bg-rose-50/30 dark:bg-rose-950/20 shadow-lg sm:scale-[1.02]"
                    : plan.popular
                      ? "border-[#C59B27] bg-amber-50/20 dark:bg-amber-950/10 shadow-sm hover:border-[#C59B27]/80"
                      : "border-border bg-card shadow-2xs hover:border-border/80"
                }`}
              >
                {plan.popular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#C59B27] to-amber-600 px-3.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white shadow-sm">
                    POPULAR
                  </span>
                ) : null}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid size-9 place-items-center rounded-2xl ${
                        plan.tier === "platinum"
                          ? "bg-primary-soft text-primary"
                          : plan.popular
                            ? "bg-gold-soft text-[#9E7314] dark:text-amber-300"
                            : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                      }`}
                    >
                      {plan.tier === "platinum" ? (
                        <Gem className="size-5" />
                      ) : plan.popular ? (
                        <Crown className="size-5" />
                      ) : (
                        <Award className="size-5" />
                      )}
                    </span>
                    <h3 className="font-display text-xl font-bold text-foreground">{plan.name}</h3>
                  </div>

                  <div
                    className={`size-6 rounded-full border-2 grid place-items-center transition-colors ${
                      isSelected
                        ? "border-[#D92662] bg-[#D92662] text-white"
                        : "border-muted-foreground/40 bg-transparent"
                    }`}
                  >
                    {isSelected ? <Check className="size-3.5 stroke-[3]" /> : null}
                  </div>
                </div>

                <div className="mt-4 pb-4 border-b border-border/60">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-3xl font-extrabold text-foreground">
                      {formatInr(price)}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      / {plan.durationMonths} Months
                    </span>
                  </div>
                  {isYearly ? (
                    <span className="text-[0.7rem] text-emerald-600 font-semibold mt-0.5 inline-block">
                      Original: <del>{formatInr(plan.priceInr)}</del>
                    </span>
                  ) : null}
                </div>

                <ul className="mt-4 flex-1 space-y-2 text-xs sm:text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-foreground/80">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#C59B27]" />
                      <span className="text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-3 border-t border-border/50 text-[0.7rem] text-muted-foreground grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="block text-muted-foreground/70">Messages</span>
                    <span className="font-semibold text-foreground">{plan.limits.messaging}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground/70">Contacts</span>
                    <span className="font-semibold text-foreground">{plan.limits.contacts}</span>
                  </div>
                </div>

                {isCurrent ? (
                  <span className="mt-3 text-center text-xs font-semibold text-primary">
                    Your Current Active Plan
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Coupon Code Bar & CTA Section */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          {/* Coupon Code Section */}
          <div className="space-y-3 border-b border-border/60 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Have a Promotional Code?</span>
              </div>

              {appliedCoupon ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Check className="size-3.5" />
                  <span>{appliedCoupon.code} applied (-{formatInr(appliedCoupon.discountAmount)})</span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="ml-2 text-destructive hover:underline text-[11px] cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME50"
                    className="rounded-xl border border-border bg-background px-3 py-1.5 font-mono text-xs uppercase text-foreground focus:border-primary focus:outline-none w-36 sm:w-40"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="text-xs h-8 px-3 rounded-xl cursor-pointer"
                  >
                    {validatingCoupon ? "Checking..." : "Apply Code"}
                  </Button>
                </form>
              )}
            </div>

            {/* Clickable Active Coupon Chips */}
            {activeCoupons.length > 0 && !appliedCoupon && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-[11px] text-muted-foreground font-medium">Available Coupons:</span>
                {activeCoupons.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void handleApplyCoupon(undefined, c.code)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 transition-all active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="size-3 text-amber-500" />
                    <span>{c.code}</span>
                    <span className="rounded bg-white/70 dark:bg-black/40 px-1 py-0.2 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      {c.discount_type === "percentage" ? `${Math.round(Number(c.discount_value))}% OFF` : `₹${Math.round(Number(c.discount_value))} OFF`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Selected Membership
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-foreground">
                  {selectedPlan ? selectedPlan.name : "Choose a plan"}
                </span>
                {selectedPlan ? (
                  appliedCoupon ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm line-through text-muted-foreground">
                        {formatInr(
                          isYearly ? Math.round(selectedPlan.priceInr * 0.8) : selectedPlan.priceInr,
                        )}
                      </span>
                      <span className="text-lg font-bold text-[#D92662]">
                        {formatInr(appliedCoupon.finalAmount)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-[#D92662]">
                      {formatInr(
                        isYearly ? Math.round(selectedPlan.priceInr * 0.8) : selectedPlan.priceInr,
                      )}
                    </span>
                  )
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Immediate access to messaging, contacts, and priority listings
              </p>
            </div>

            <Button
              size="lg"
              className="w-full sm:w-auto min-w-[220px] rounded-full bg-[#D92662] hover:bg-[#c2185b] text-white font-bold text-base py-6 shadow-md cursor-pointer"
              disabled={!selectedPlan || pendingPlan === selectedPlan.id}
              onClick={() => selectedPlan && void handleSelect(selectedPlan)}
            >
              {pendingPlan === selectedPlan?.id ? "Activating..." : "Continue to Payment"}
            </Button>
          </div>
        </div>

        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground text-center pt-2">
          <ShieldCheck className="size-4 text-emerald-600" />
          PCI-DSS Compliant 256-Bit SSL Encrypted. Verified by YFJ Matrimony Security.
        </p>
      </section>
    </div>
  );
}
