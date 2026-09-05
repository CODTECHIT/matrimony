import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PlanCard } from "@/components/pricing/PlanCard";
import { ErrorState } from "@/components/common/states";
import { subscriptionsService } from "@/services";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Membership Plans & Pricing — YFJ Matrimony" },
      {
        name: "description",
        content:
          "Compare Free, Silver, Gold and Platinum memberships: profile views, interests, messaging and contact access.",
      },
      { property: "og:title", content: "Membership Plans — YFJ Matrimony" },
      {
        property: "og:description",
        content: "Free, Silver, Gold and Platinum memberships compared side by side.",
      },
    ],
  }),
  component: PricingPage,
});

const faqs = [
  {
    q: "Can I upgrade in the middle of a plan?",
    a: "Yes. Upgrades take effect immediately and the unused value of your current plan is adjusted against the new one.",
  },
  {
    q: "When can I see contact details?",
    a: "Contact details are released by our servers only when your plan includes contact access and the other member has accepted your interest.",
  },
  {
    q: "How do I pay?",
    a: "Payments are collected through a secure payment gateway. Cards, UPI and net banking are supported.",
  },
];

function PricingPage() {
  const navigate = useNavigate();
  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: () => subscriptionsService.plans() });

  return (
    <PublicLayout>
      <section className="blush-canvas">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Membership</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
            Choose the plan that helps you connect
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Start free. Upgrade when you are ready to message matches and view contact details.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {plansQuery.isError ? (
          <ErrorState onRetry={() => void plansQuery.refetch()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plansQuery.isPending
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-[28rem] animate-pulse rounded-3xl bg-muted" />
                ))
              : plansQuery.data?.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    ctaLabel={plan.tier === "free" ? "Start free" : "Choose plan"}
                    onSelect={() =>
                      void navigate({ to: plan.tier === "free" ? "/register" : "/app/upgrade" })
                    }
                  />
                ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold">Frequently asked</h2>
        <dl className="mt-6 space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-2xl border border-border bg-card p-5">
              <dt className="font-semibold">{faq.q}</dt>
              <dd className="mt-1.5 text-sm text-muted-foreground">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PublicLayout>
  );
}
