import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Calendar,
  GraduationCap,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { ProfileCardSkeleton, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { profilesService, subscriptionsService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/types";
import heroHands from "@/assets/hero-hands.jpg";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Find your perfect match — YFJ Matrimony" },
      {
        name: "description",
        content:
          "Your personalised matrimony dashboard: recommended profiles, interests and messages.",
      },
      { property: "og:title", content: "Your matches — YFJ Matrimony" },
      { property: "og:description", content: "Recommended profiles picked for you today." },
    ],
  }),
  component: DashboardPage,
});

// Quick filters with icons matching the brand color theme
const quickFilters = [
  {
    label: "Caste",
    icon: Users,
    iconColor: "text-primary",
    bgColor: "bg-primary-soft border border-primary/20 hover:bg-primary-soft/80",
    to: "/app/search",
  },
  {
    label: "Age",
    icon: Calendar,
    iconColor: "text-[#9E7314] dark:text-amber-300",
    bgColor: "bg-gold-soft border border-gold/30 hover:bg-gold-soft/80",
    to: "/app/search",
  },
  {
    label: "Location",
    icon: MapPin,
    iconColor: "text-primary",
    bgColor:
      "bg-rose-50/80 border border-rose-200/80 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:border-rose-900/30",
    to: "/app/search",
  },
  {
    label: "Education",
    icon: GraduationCap,
    iconColor: "text-indigo-600 dark:text-indigo-400",
    bgColor:
      "bg-[#F2EDFD] border border-[#D8C7F8]/70 hover:bg-[#e4d8fb] dark:bg-indigo-950/20 dark:border-indigo-900/30",
    to: "/app/search",
  },
] as const;

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const profilesQuery = useQuery({
    queryKey: ["profiles", "recommended"],
    queryFn: () => profilesService.recommended(),
  });
  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });

  const handleShortlist = async (profile: Profile) => {
    const result = await profilesService.toggleShortlist(profile.id);
    await queryClient.invalidateQueries({ queryKey: ["profiles"] });
    toast.success(result.shortlisted ? "Added to your shortlist" : "Removed from shortlist");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      void navigate({ to: "/app/browse" });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Promo Banner matching Screen 9 */}
      <section className="relative overflow-hidden rounded-[28px] min-h-[190px] sm:min-h-[215px] shadow-xl shadow-rose-950/20 flex items-center bg-[#D92662]">
        {/* Full-bleed photo aligned to show the hands on the right */}
        <img
          src={heroHands}
          alt="Wedding celebration"
          className="absolute inset-0 w-full h-full object-cover object-[75%_center]"
        />

        {/* Smooth gradient overlay: solid magenta on left, smoothly fading out to reveal hands on right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#D92662] from-30% via-[#D92662]/90 via-55% to-transparent" />

        {/* Left Content */}
        <div className="relative z-10 p-6 sm:p-8 max-w-[65%] sm:max-w-md space-y-2.5">
          <h2 className="font-sans text-2xl sm:text-3xl font-bold leading-tight text-white tracking-tight">
            Find your <br />
            perfect match
          </h2>
          <p className="text-xs sm:text-sm text-white/95 font-normal leading-snug">
            Trusted by Families. <br />
            Chosen by Hearts.
          </p>
          <div className="pt-2">
            <Button
              asChild
              size="sm"
              className="rounded-full bg-white hover:bg-rose-50 text-[#D92662] font-semibold text-xs sm:text-sm px-5 py-2.5 shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <Link to="/app/browse">Explore Profiles</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Search Bar matching Screen 9 */}
      <section className="flex items-center gap-2.5">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID"
            className="h-13 rounded-2xl pl-12 pr-4 bg-white border-border text-sm sm:text-base shadow-2xs"
            aria-label="Search by name or ID"
          />
        </form>
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-13 rounded-2xl shrink-0 bg-white border-border shadow-2xs hover:bg-muted text-foreground"
          aria-label="Filter options"
        >
          <Link to="/app/search">
            <SlidersHorizontal className="size-5" />
          </Link>
        </Button>
      </section>

      {/* Quick Filters Row with Real Emojis matching Screen 9 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-foreground">Quick Filters</h2>
          <Link
            to="/app/search"
            className="text-xs sm:text-sm font-semibold text-[#D92662] hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
          {quickFilters.map((qf) => {
            const Icon = qf.icon;
            return (
              <Link
                key={qf.label}
                to={qf.to}
                className="flex flex-col items-center gap-2 group transition-transform active:scale-95 text-center"
              >
                <div
                  className={`flex size-16 sm:size-18 items-center justify-center rounded-full shadow-xs transition-all group-hover:shadow-md group-hover:scale-105 ${qf.bgColor}`}
                >
                  <Icon className={`size-7 sm:size-8 ${qf.iconColor}`} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-foreground/80 group-hover:text-foreground">
                  {qf.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Profile Completion banner if user profile incomplete */}
      {user && user.profileCompletion < 100 ? (
        <section className="rounded-3xl border border-amber-300/40 bg-amber-50/50 dark:bg-stone-900/50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-foreground">
                Complete your profile
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Profiles above 90% get up to 3× more responses.
              </p>
            </div>
            <span className="font-display text-2xl font-bold text-[#D92662]">
              {user.profileCompletion}%
            </span>
          </div>
          <Progress value={user.profileCompletion} className="mt-3 h-2 bg-amber-200/50" />
          <Button
            asChild
            size="sm"
            className="mt-3.5 rounded-full bg-[#C59B27] hover:bg-[#B38A20] text-white"
          >
            <Link to="/app/my-profile/edit">Complete now</Link>
          </Button>
        </section>
      ) : null}

      {/* Recommended Profiles Section matching Screen 9 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-foreground">Recommended Profiles</h2>
          <Link
            to="/app/browse"
            className="text-xs sm:text-sm font-semibold text-[#D92662] hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:px-0">
          {profilesQuery.isPending ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="w-72 shrink-0 sm:w-auto sm:shrink">
                <ProfileCardSkeleton />
              </div>
            ))
          ) : profilesQuery.isError ? (
            <div className="w-full sm:col-span-2 lg:col-span-3">
              <ErrorState onRetry={() => void profilesQuery.refetch()} />
            </div>
          ) : (
            profilesQuery.data?.slice(0, 6).map((profile) => (
              <div key={profile.id} className="w-72 shrink-0 sm:w-auto sm:shrink">
                <ProfileCard profile={profile} onShortlist={handleShortlist} />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
