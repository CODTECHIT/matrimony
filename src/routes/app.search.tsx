import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterPanel } from "@/components/profiles/FilterPanel";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { EmptyState, ErrorState, ProfileCardSkeleton } from "@/components/common/states";
import { Input } from "@/components/ui/input";
import { profilesService, subscriptionsService } from "@/services";
import type { ProfileFilters } from "@/types";

export const Route = createFileRoute("/app/search")({
  head: () => ({
    meta: [
      { title: "Search & filters — YFJ Matrimony" },
      {
        name: "description",
        content: "Search matrimony profiles by name or ID and refine with detailed filters.",
      },
      { property: "og:title", content: "Search & filters — YFJ Matrimony" },
      { property: "og:description", content: "Precise search across verified matrimony profiles." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [filters, setFilters] = useState<ProfileFilters>({ page: 1, pageSize: 12 });

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });
  const results = useQuery({
    queryKey: ["profiles", "search", filters],
    queryFn: () => profilesService.list(filters),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden min-w-0">
      <PageHeader
        eyebrow="Search"
        title="Find a specific profile"
        description="Search by name or profile ID, then narrow the results with filters."
      />

      <div className="relative w-full min-w-0">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#C59B27]" />
        <Input
          placeholder="Search by name or profile ID"
          aria-label="Search by name or profile ID"
          className="h-12 rounded-full pl-11 border-2 border-[#E5C05B]/85 shadow-[0_2px_12px_rgba(229,192,91,0.18)] focus-visible:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#E5C05B]/40 w-full min-w-0"
          value={filters.query ?? ""}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, query: event.target.value, page: 1 }))
          }
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row w-full max-w-full min-w-0">
        <aside className="lg:w-64 lg:shrink-0">
          <div className="rounded-3xl border border-border bg-card p-4 shadow-card lg:sticky lg:top-24">
            <FilterPanel
              value={filters}
              advancedEnabled={subscriptionQuery.data?.permissions.canUseAdvancedFilters ?? false}
              onChange={setFilters}
              onReset={() => setFilters({ page: 1, pageSize: 12 })}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1 w-full max-w-full">
          {results.isPending ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 w-full max-w-full min-w-0">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProfileCardSkeleton key={index} />
              ))}
            </div>
          ) : results.isError ? (
            <ErrorState onRetry={() => void results.refetch()} />
          ) : results.data?.items.length === 0 ? (
            <EmptyState
              title="No results"
              description="We couldn't find a profile matching this search."
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 w-full max-w-full min-w-0">
              {results.data?.items.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
