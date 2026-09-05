import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, Edit3, MessageCircle, Phone, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, ListSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatInr } from "@/components/pricing/PlanCard";
import { PackageEditorDialog } from "@/components/admin/PackageEditorDialog";
import { adminService } from "@/services";
import type { Plan } from "@/types";

export const Route = createFileRoute("/admin/matrimony/packages")({
  head: () => ({
    meta: [
      { title: "Membership Packages — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Create and edit the matrimony membership packages offered to members.",
      },
      { property: "og:title", content: "Membership Packages — YFJ Matrimony Admin" },
      {
        property: "og:description",
        content: "Manage pricing, user limitations, and plan benefits.",
      },
    ],
  }),
  component: AdminPackagesPage,
});

function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const query = useQuery({
    queryKey: ["admin", "packages"],
    queryFn: () => adminService.packages(),
  });

  const handleNewPackage = () => {
    setSelectedPlan(null);
    setEditorOpen(true);
  };

  const handleEditPackage = (plan: Plan) => {
    setSelectedPlan(plan);
    setEditorOpen(true);
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove the "${name}" package?`)) return;
    try {
      await adminService.deletePackage(id);
      await queryClient.invalidateQueries({ queryKey: ["admin", "packages"] });
      await queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success(`Package "${name}" removed`);
    } catch {
      toast.error("Failed to delete package");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Membership packages"
        description="Manage pricing, duration, features, and strict user access limitations."
        actions={
          <Button onClick={handleNewPackage} className="gap-1.5">
            <Plus className="size-4" /> New package
          </Button>
        }
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {query.data?.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border bg-card p-5 shadow-card transition-all ${
                plan.popular ? "border-primary/60 ring-2 ring-primary/20" : "border-border"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[0.7rem] font-bold text-primary-foreground shadow-sm">
                  <Sparkles className="size-3" /> Popular
                </span>
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold">{plan.name}</h2>
                  <Badge variant="outline" className="mt-1 capitalize text-xs">
                    {plan.tier} tier
                  </Badge>
                </div>
                {plan.tier === "platinum" && <Crown className="size-5 text-amber-500" />}
              </div>

              <p className="mt-3 font-display text-2xl font-bold text-primary">
                {formatInr(plan.priceInr)}
              </p>
              <p className="text-xs text-muted-foreground">
                {plan.durationMonths === 0
                  ? "Lifetime / Free access"
                  : `${plan.durationMonths} month${plan.durationMonths === 1 ? "" : "s"} validity`}
              </p>

              {/* Limitations Box */}
              <div className="mt-4 rounded-2xl bg-muted/40 p-3 text-xs space-y-1.5 border border-border/50">
                <p className="font-semibold text-foreground text-[0.75rem] uppercase tracking-wider">
                  Access Limitations:
                </p>
                <div className="flex justify-between text-muted-foreground">
                  <span>Profile views:</span>
                  <span className="font-medium text-foreground">
                    {plan.limits?.profileViews || "Unlimited"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Interests:</span>
                  <span className="font-medium text-foreground">
                    {plan.limits?.interests || "Unlimited"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Messaging:</span>
                  <span className="font-medium text-foreground">
                    {plan.limits?.messaging || "Unlimited"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Contacts unlocked:</span>
                  <span className="font-medium text-foreground">
                    {plan.limits?.contacts || "Unlimited"}
                  </span>
                </div>
              </div>

              {/* Permissions Pills */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {plan.permissions?.canMessage !== false && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-[0.7rem] font-medium text-primary">
                    <MessageCircle className="size-3" /> Chat
                  </span>
                )}
                {plan.permissions?.canViewContacts && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 text-[0.7rem] font-medium text-amber-700 dark:text-amber-300">
                    <Phone className="size-3" /> Phone
                  </span>
                )}
                {plan.permissions?.canUseAdvancedFilters && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
                    <Search className="size-3" /> Filters
                  </span>
                )}
                {plan.permissions?.profileHighlight && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 dark:bg-rose-950/50 px-2 py-0.5 text-[0.7rem] font-medium text-rose-700 dark:text-rose-300">
                    <Crown className="size-3" /> Boost
                  </span>
                )}
              </div>

              {/* Features preview */}
              <ul className="mt-4 flex-1 space-y-1 text-xs text-muted-foreground">
                {plan.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="truncate">
                    · {feature}
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li className="text-[0.7rem] text-primary font-medium">
                    +{plan.features.length - 3} more benefits
                  </li>
                )}
              </ul>

              <div className="mt-5 flex gap-2 pt-3 border-t border-border/50">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => handleEditPackage(plan)}
                >
                  <Edit3 className="size-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => remove(plan.id, plan.name)}
                  disabled={plan.tier === "free"}
                  title={
                    plan.tier === "free" ? "Default Free plan cannot be deleted" : "Delete package"
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <PackageEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialPlan={selectedPlan}
      />
    </div>
  );
}
