import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
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
import { useAuth } from "@/hooks/useAuth";
import type { Profile, ProfileFilters, Gender, MaritalStatus } from "@/types";

const browseSearchSchema = z.object({
  gender: z.string().optional(),
  minAge: z.coerce.number().optional(),
  maxAge: z.coerce.number().optional(),
  ageMin: z.coerce.number().optional(),
  ageMax: z.coerce.number().optional(),
  religion: z.string().optional(),
  caste: z.string().optional(),
  motherTongue: z.string().optional(),
  maritalStatus: z.string().optional(),
  education: z.string().optional(),
  occupation: z.string().optional(),
  incomeRange: z.string().optional(),
  city: z.string().optional(),
  query: z.string().optional(),
  sort: z.enum(["recent", "relevance", "age_asc", "age_desc"]).optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
});

export const Route = createFileRoute("/app/browse")({
  validateSearch: (search) => browseSearchSchema.parse(search),
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  const filters: ProfileFilters = useMemo(
    () => ({
      page: searchParams.page ?? 1,
      pageSize: searchParams.pageSize ?? 12,
      sort: searchParams.sort ?? "recent",
      gender: searchParams.gender ? (searchParams.gender.toLowerCase() as Gender) : undefined,
      ageMin: searchParams.ageMin ?? searchParams.minAge,
      ageMax: searchParams.ageMax ?? searchParams.maxAge,
      religion: searchParams.religion,
      caste: searchParams.caste,
      motherTongue: searchParams.motherTongue,
      maritalStatus: searchParams.maritalStatus as MaritalStatus | undefined,
      education: searchParams.education,
      occupation: searchParams.occupation,
      incomeRange: searchParams.incomeRange,
      city: searchParams.city,
      query: searchParams.query,
    }),
    [searchParams],
  );

  const setFilters = (next: ProfileFilters | ((prev: ProfileFilters) => ProfileFilters)) => {
    const resolved = typeof next === "function" ? next(filters) : next;
    void navigate({
      search: (prev) => ({
        ...prev,
        page: resolved.page ?? 1,
        pageSize: resolved.pageSize ?? 12,
        sort: resolved.sort ?? "recent",
        gender: resolved.gender,
        ageMin: resolved.ageMin,
        ageMax: resolved.ageMax,
        minAge: undefined,
        maxAge: undefined,
        religion: resolved.religion,
        caste: resolved.caste,
        motherTongue: resolved.motherTongue,
        maritalStatus: resolved.maritalStatus,
        education: resolved.education,
        occupation: resolved.occupation,
        incomeRange: resolved.incomeRange,
        city: resolved.city,
        query: resolved.query,
      }),
    });
  };

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });
  const profilesQuery = useQuery({
    queryKey: ["profiles", filters],
    queryFn: () => profilesService.list(filters),
    placeholderData: keepPreviousData,
  });

  const displayItems = useMemo(() => {
    return (profilesQuery.data?.items ?? []).filter((p) => !user || p.id !== user.id);
  }, [profilesQuery.data?.items, user]);

  const handleShortlist = async (profile: Profile) => {
    // Optimistic cache update
    queryClient.setQueriesData({ queryKey: ["profiles"] }, (old: any) => {
      if (!old || !old.items) return old;
      return {
        ...old,
        items: old.items.map((item: Profile) =>
          item.id === profile.id ? { ...item, shortlisted: !item.shortlisted } : item,
        ),
      };
    });

    try {
      const result = await profilesService.toggleShortlist(profile.id);
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(result.shortlisted ? "Added to your shortlist" : "Removed from shortlist");
    } catch {
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.error("Failed to update shortlist");
    }
  };

  const handleInterest = async (profile: Profile) => {
    // Optimistic cache update so the button instantly changes from "Connect" to "Sent"
    queryClient.setQueriesData({ queryKey: ["profiles"] }, (old: any) => {
      if (!old || !old.items) return old;
      return {
        ...old,
        items: old.items.map((item: Profile) =>
          item.id === profile.id ? { ...item, interestSent: true } : item,
        ),
      };
    });

    try {
      await profilesService.sendInterest(profile.id);
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(`Interest sent to ${profile.fullName.split(" ")[0]}`);
    } catch {
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.error("Failed to send interest");
    }
  };

  const advancedEnabled = subscriptionQuery.data?.permissions.canUseAdvancedFilters ?? false;

  const filterPanel = (
    <FilterPanel
      value={filters}
      advancedEnabled={advancedEnabled}
      onChange={setFilters}
      onReset={() =>
        void navigate({
          search: {
            page: 1,
            pageSize: 12,
            sort: "recent",
          },
        })
      }
    />
  );

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden min-w-0">
      <PageHeader
        eyebrow="Discover"
        title="Browse profiles"
        description={
          profilesQuery.data
            ? `${displayItems.length} profile${displayItems.length === 1 ? "" : "s"} match your preferences`
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
          ) : profilesQuery.data && displayItems.length === 0 ? (
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
                {displayItems.map((profile) => (
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
