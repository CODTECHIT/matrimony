import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { subscriptionsService } from "@/services";

export const Route = createFileRoute("/app/subscription")({
  head: () => ({
    meta: [
      { title: "My membership — YFJ Matrimony" },
      {
        name: "description",
        content: "View your YFJ Matrimony membership, benefits, renewal date and billing options.",
      },
      { property: "og:title", content: "My membership — YFJ Matrimony" },
      { property: "og:description", content: "Manage your membership and renewal." },
    ],
  }),
  component: SubscriptionPage,
});

const permissionLabels: Record<string, string> = {
  canMessage: "Send and receive messages",
  canViewContacts: "View contact details",
  canUseAdvancedFilters: "Advanced search filters",
  profileHighlight: "Highlighted profile in search",
};

function SubscriptionPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });

  if (query.isPending) return <LoadingState label="Loading your membership" />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;

  const subscription = query.data;

  const cancel = async () => {
    await subscriptionsService.cancelAutoRenew();
    await queryClient.invalidateQueries({ queryKey: ["subscription"] });
    toast.success("Auto-renewal turned off. Your benefits continue until the expiry date.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Membership"
        title="My membership"
        description="Your current plan, benefits and renewal details."
        actions={
          <Button asChild variant="gold">
            <Link to="/app/upgrade">
              <Crown /> Upgrade plan
            </Link>
          </Button>
        }
      />

      <section className="rounded-3xl border border-gold/40 bg-gold-soft/40 p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current plan
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold capitalize">
              {subscription.tier}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {subscription.expiresAt
                ? `Valid until ${new Date(subscription.expiresAt).toLocaleDateString("en-IN", { dateStyle: "long" })}`
                : "No expiry — free membership"}
            </p>
          </div>
          <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
            {subscription.status}
          </Badge>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-xl font-semibold">What's included</h2>
        <ul className="mt-4 space-y-2.5">
          {Object.entries(subscription.permissions).map(([key, enabled]) => (
            <li key={key} className="flex items-center justify-between gap-4 text-sm">
              <span>{permissionLabels[key] ?? key}</span>
              <span className={enabled ? "font-medium text-primary" : "text-muted-foreground"}>
                {enabled ? "Included" : "Not included"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {subscription.status === "active" && subscription.autoRenew ? (
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-semibold">Auto-renewal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your plan renews automatically. You can turn this off at any time and keep your benefits
            until the expiry date.
          </p>
          <Button variant="neutral" className="mt-4" onClick={cancel}>
            Turn off auto-renewal
          </Button>
        </section>
      ) : null}
    </div>
  );
}
