import { Award, Check, Crown, Gem, Sparkles } from "lucide-react";
import type { Plan } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PlanCard({
  plan,
  current,
  ctaLabel = "Choose plan",
  onSelect,
  pending,
}: {
  plan: Plan;
  current?: boolean;
  ctaLabel?: string;
  onSelect?: (plan: Plan) => void;
  pending?: boolean;
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl border bg-card p-5 shadow-card",
        plan.popular ? "border-gold bg-gold-soft/40" : "border-border",
        current && "ring-2 ring-primary",
      )}
    >
      {plan.popular ? (
        <span className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-primary-foreground">
          Popular
        </span>
      ) : null}

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-2xl",
            plan.tier === "platinum"
              ? "bg-primary-soft text-primary"
              : plan.popular
                ? "bg-gold-soft text-[#9E7314] dark:text-amber-300"
                : plan.tier === "silver"
                  ? "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  : "bg-muted text-muted-foreground",
          )}
        >
          {plan.tier === "platinum" ? (
            <Gem className="size-5" />
          ) : plan.popular ? (
            <Crown className="size-5" />
          ) : plan.tier === "silver" ? (
            <Award className="size-5" />
          ) : (
            <Sparkles className="size-5" />
          )}
        </span>
        <h3 className="font-display text-2xl font-semibold">{plan.name}</h3>
      </div>

      <p className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-3xl font-semibold">{formatInr(plan.priceInr)}</span>
        <span className="text-xs text-muted-foreground">
          {plan.durationMonths ? `/ ${plan.durationMonths} months` : "forever"}
        </span>
      </p>

      <ul className="mt-4 flex-1 space-y-2.5 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-3 text-[0.7rem]">
        <div>
          <dt className="text-muted-foreground">Profile views</dt>
          <dd className="font-semibold">{plan.limits.profileViews}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Interests</dt>
          <dd className="font-semibold">{plan.limits.interests}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Messaging</dt>
          <dd className="font-semibold">{plan.limits.messaging}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Contacts</dt>
          <dd className="font-semibold">{plan.limits.contacts}</dd>
        </div>
      </dl>

      <Button
        className="mt-5 w-full"
        variant={current ? "neutral" : plan.popular ? "gold" : "default"}
        disabled={current || pending}
        onClick={() => onSelect?.(plan)}
      >
        {current ? "Current plan" : pending ? "Processing…" : ctaLabel}
      </Button>
    </article>
  );
}
