import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { EmptyState, ErrorState, ProfileCardSkeleton } from "@/components/common/states";
import { FilterPanel } from "@/components/profiles/FilterPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { profilesService, subscriptionsService } from "@/services";
import type { Profile, ProfileFilters } from "@/types";

export const Route = createFileRoute("/app/browse")({
  head: () => ({
    meta: [
      { title: "Browse profiles — YFJ Matrimony" },
      {
        name: "description",
        content:
          "Browse verified brides and grooms and filter by community, city, education and more.",
      },
      { property: "og:title", content: "Browse profiles — YFJ Matrimony" },
      { property: "og:description", content: "Verified brides and grooms, filtered your way." },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ProfileFilters>({ page: 1, pageSize: 12, sort: "recent" });

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });
  const profilesQuery = useQuery({
    queryKey: ["profiles", filters],
    queryFn: () => profilesService.list(filters),
    placeholderData: keepPreviousData,
  });

  const handleShortlist = async (profile: Profile) => {
    const result = await profilesService.toggleShortlist(profile.id);
    await queryClient.invalidateQueries({ queryKey: ["profiles"] });
    toast.success(result.shortlisted ? "Added to your shortlist" : "Removed from shortlist");
  };

  const handleInterest = async (profile: Profile) => {
    await profilesService.sendInterest(profile.id);
    await queryClient.invalidateQueries({ queryKey: ["profiles"] });
    toast.success(`Interest sent to ${profile.fullName.split(" ")[0]}`);
  };

  const advancedEnabled = subscriptionQuery.data?.permissions.canUseAdvancedFilters ?? false;

  const filterPanel = (
    <FilterPanel
      value={filters}
      advancedEnabled={advancedEnabled}
      onChange={setFilters}
      onReset={() => setFilters({ page: 1, pageSize: 12, sort: "recent" })}
    />
  );

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden min-w-0">
      <PageHeader
        eyebrow="Discover"
        title="Browse profiles"
        description={
          profilesQuery.data
            ? `${profilesQuery.data.total} profiles match your preferences`
            : "Finding profiles for you"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Select
              value={filters.sort ?? "recent"}
              onValueChange={(sort) =>
                setFilters((prev) => ({ ...prev, sort: sort as ProfileFilters["sort"], page: 1 }))
              }
            >
              <SelectTrigger className="h-10 w-32 sm:w-36 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="age_asc">Age: low to high</SelectItem>
                <SelectItem value="age_desc">Age: high to low</SelectItem>
              </SelectContent>
            </Select>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="neutral" className="lg:hidden">
                  <SlidersHorizontal /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle className="font-display text-2xl">Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{filterPanel}</div>
              </SheetContent>
            </Sheet>
          </div>
        }
      />

      <div className="flex gap-6 w-full max-w-full min-w-0">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-3xl border border-border bg-card p-4 shadow-card">
            <h2 className="mb-4 font-display text-xl font-semibold">Filters</h2>
            {filterPanel}
          </div>
        </aside>

        <div className="min-w-0 flex-1 w-full max-w-full">
          {profilesQuery.isPending ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 w-full max-w-full min-w-0">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProfileCardSkeleton key={index} />
              ))}
            </div>
          ) : profilesQuery.isError ? (
            <ErrorState onRetry={() => void profilesQuery.refetch()} />
          ) : profilesQuery.data && profilesQuery.data.items.length === 0 ? (
            <EmptyState
              title="No profiles match these filters"
              description="Try widening the age range or removing a community filter."
              action={
                <Button
                  variant="neutral"
                  onClick={() => setFilters({ page: 1, pageSize: 12, sort: "recent" })}
                >
                  Reset filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 w-full max-w-full min-w-0">
                {profilesQuery.data?.items.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onShortlist={handleShortlist}
                    onInterest={handleInterest}
                  />
                ))}
              </div>

              {profilesQuery.data && profilesQuery.data.total > profilesQuery.data.pageSize ? (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button
                    variant="neutral"
                    size="sm"
                    disabled={(filters.page ?? 1) <= 1}
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {profilesQuery.data.page} of{" "}
                    {Math.ceil(profilesQuery.data.total / profilesQuery.data.pageSize)}
                  </span>
                  <Button
                    variant="neutral"
                    size="sm"
                    disabled={
                      (filters.page ?? 1) >=
                      Math.ceil(profilesQuery.data.total / profilesQuery.data.pageSize)
                    }
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
