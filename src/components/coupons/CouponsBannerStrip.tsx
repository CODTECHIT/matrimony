import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tag, Sparkles, Copy, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export interface ActiveCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_amount?: number;
  max_discount?: number;
  expires_at?: string;
}

export function CouponsBannerStrip() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: coupons = [] } = useQuery<ActiveCoupon[]>({
    queryKey: ["coupons", "active"],
    queryFn: () => api.get<ActiveCoupon[]>("/coupons/active"),
    staleTime: 60 * 1000,
  });

  if (!coupons || coupons.length === 0) {
    return null;
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon "${code}" copied! Apply it on the upgrade page.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/5 p-4 sm:p-5 shadow-xs w-full max-w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
            <Tag className="size-4.5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>Special Membership Discounts Available</span>
              <Sparkles className="size-3.5 text-amber-500" />
            </h3>
            <p className="text-xs text-muted-foreground">
              Save on Gold & Platinum plans using verified promotional coupons.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="flex items-center gap-2 rounded-xl border border-amber-400/60 bg-card px-3 py-1.5 shadow-2xs"
            >
              <div className="text-left">
                <span className="font-mono text-xs font-bold uppercase text-primary tracking-wider">
                  {coupon.code}
                </span>
                <span className="ml-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {coupon.discount_type === "percentage"
                    ? `${Math.round(Number(coupon.discount_value))}% OFF`
                    : `₹${Math.round(Number(coupon.discount_value))} OFF`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(coupon.code)}
                title="Copy coupon code"
                className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {copiedCode === coupon.code ? (
                  <Check className="size-3.5 text-emerald-600" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          ))}

          <Button
            asChild
            size="sm"
            className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs h-8 px-3.5 shadow-xs"
          >
            <Link to="/app/upgrade">
              Upgrade <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
