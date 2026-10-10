import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Gift, Sparkles, Tag, ArrowRight } from "lucide-react";
import { api } from "@/lib/api-client";

interface ActiveCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string | number;
  min_amount?: string | number;
  max_discount?: string | number;
  expires_at?: string;
}

export function PromoMarquee() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: coupons = [] } = useQuery<ActiveCoupon[]>({
    queryKey: ["coupons", "active"],
    queryFn: () => api.get<ActiveCoupon[]>("/coupons/active"),
    staleTime: 60 * 1000,
  });

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      void navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Coupon "${code}" copied! Apply at checkout for instant savings.`);
      setTimeout(() => setCopiedCode(null), 3000);
    } catch {
      toast.info(`Coupon code: ${code}`);
    }
  };

  // Compile list of marquee announcements
  const promoItems: Array<{
    id: string;
    icon: typeof Sparkles;
    title: string;
    badge?: string;
    code?: string;
    link: string;
  }> = [];

  if (coupons.length > 0) {
    for (const c of coupons) {
      const discountText =
        c.discount_type === "percentage"
          ? `${Number(c.discount_value)}% OFF`
          : `₹${Number(c.discount_value)} FLAT OFF`;

      promoItems.push({
        id: c.id,
        icon: Tag,
        badge: discountText,
        title: `Use code ${c.code} at checkout for instant savings!`,
        code: c.code,
        link: "/pricing",
      });
    }
  }

  // Complement with platform trust highlights
  promoItems.push(
    {
      id: "trust-verified",
      icon: Sparkles,
      badge: "VERIFIED",
      title: "100% Mobile & Government ID Verified Profiles Across India",
      link: "/pricing",
    },
    {
      id: "festive-special",
      icon: Gift,
      badge: "FESTIVE SALE",
      title: "Unlock Unlimited Contacts & Direct Messaging on Premium Plans",
      link: "/pricing",
    },
  );

  return (
    <div className="relative w-full overflow-hidden bg-stone-950 text-stone-200 border-b border-amber-500/25 py-1.5 sm:py-2 text-xs select-none">
      {/* Soft gradient edge masks for smooth entrance/exit */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-stone-950 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-stone-950 to-transparent z-10" />

      {/* Marquee Track (Repeated twice for seamless loop) */}
      <div className="animate-marquee flex items-center gap-8 cursor-pointer">
        {[...promoItems, ...promoItems].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={`${item.id}-${idx}`}
              className="inline-flex items-center gap-2.5 shrink-0 px-2 group"
            >
              {item.badge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 tracking-wider">
                  <Icon className="size-3 text-amber-400" />
                  {item.badge}
                </span>
              )}

              <span className="text-stone-200 text-xs font-medium group-hover:text-amber-200 transition-colors">
                {item.title}
              </span>

              {item.code ? (
                <button
                  type="button"
                  onClick={(e) => handleCopyCode(item.code!, e)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    copiedCode === item.code
                      ? "bg-emerald-500 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  }`}
                  title="Click to copy coupon code"
                >
                  <Copy className="size-2.5" />
                  {copiedCode === item.code ? "COPIED!" : item.code}
                </button>
              ) : null}

              <Link
                to={item.link}
                className="hidden sm:inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 ml-1"
              >
                <span>View Plans</span>
                <ArrowRight className="size-3" />
              </Link>

              <span className="text-amber-500/40 select-none ml-4">•</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
