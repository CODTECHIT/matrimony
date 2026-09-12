import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  ChevronRight,
  GraduationCap,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  ShieldCheck,
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

// Quick filters with brand-themed vector icons and rich desktop metadata
export const quickFilters = [
  {
    label: "Caste",
    title: "Caste & Gotra",
    description: "Gotra, sect & community",
    icon: Users,
    iconColor: "text-primary",
    bgColor: "bg-primary-soft border border-primary/20 hover:bg-primary-soft/80",
    to: "/app/search",
  },
  {
    label: "Age",
    title: "Age & Height",
    description: "Preferred age bracket",
    icon: Calendar,
    iconColor: "text-gold-foreground dark:text-amber-300",
    bgColor: "bg-gold-soft border border-gold/30 hover:bg-gold-soft/80",
    to: "/app/search",
  },
  {
    label: "Location",
    title: "City & Location",
    description: "Matches in your state / city",
    icon: MapPin,
    iconColor: "text-rose-600 dark:text-rose-400",
    bgColor:
      "bg-rose-50/80 border border-rose-200/80 hover:bg-rose-100/80 dark:bg-rose-950/25 dark:border-rose-900/30",
    to: "/app/search",
  },
  {
    label: "Education",
    title: "Education & Career",
    description: "Graduates & professionals",
    icon: GraduationCap,
    iconColor: "text-indigo-600 dark:text-indigo-400",
    bgColor:
      "bg-[#F2EDFD] border border-[#D8C7F8]/70 hover:bg-[#e4d8fb] dark:bg-indigo-950/25 dark:border-indigo-900/30",
    to: "/app/search",
  },
] as const;

export function DashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const profilesQuery = useQuery({
    queryKey: ["profiles", "recommended", user?.id],
    queryFn: () => profilesService.recommended(user),
  });
  const _subscriptionQuery = useQuery({
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
      void navigate({
        to: "/app/browse",
        search: {
          query: searchQuery.trim(),
        },
      });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Hero Promo Banner matching Screen 9 */}
      <section className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] min-h-[180px] sm:min-h-[215px] shadow-xl shadow-rose-950/20 flex items-center bg-[#D92662] w-full max-w-full">
        {/* Full-bleed photo aligned to show the hands on the right */}
        <img
          src={heroHands}
          alt="Wedding celebration"
          className="absolute inset-0 w-full h-full object-cover object-[75%_center]"
        />

        {/* Smooth gradient overlay: solid magenta on left, smoothly fading out to reveal hands on right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#D92662] from-30% via-[#D92662]/90 via-55% to-transparent" />

        {/* Left Content */}
        <div className="relative z-10 p-5 sm:p-8 max-w-[65%] sm:max-w-md space-y-2 sm:space-y-2.5">
          <h2 className="font-sans text-xl sm:text-3xl font-bold leading-tight text-white tracking-tight">
            Find your <br />
            perfect match
          </h2>
          <p className="text-xs sm:text-sm text-white/95 font-normal leading-snug">
            Trusted by Families. <br />
            Chosen by Hearts.
          </p>
          <div className="pt-1.5 sm:pt-2">
            <Button
              asChild
              size="sm"
              className="rounded-full bg-white hover:bg-rose-50 text-[#D92662] font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <Link to="/app/browse">Explore Profiles</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Search Bar with Light Gold circular border matching Requirement 3 */}
      <section className="flex items-center gap-2 sm:gap-2.5 w-full max-w-full min-w-0">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3.5 sm:left-4 top-1/2 size-4 sm:size-5 -translate-y-1/2 text-[#C59B27]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID"
            className="h-11 sm:h-13 rounded-full pl-10 sm:pl-12 pr-4 bg-white border-2 border-[#E5C05B]/85 text-xs sm:text-base shadow-[0_2px_12px_rgba(229,192,91,0.18)] focus-visible:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#E5C05B]/40 w-full min-w-0"
            aria-label="Search by name or ID"
          />
        </form>
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-11 sm:size-13 rounded-full shrink-0 bg-white border-2 border-[#E5C05B]/85 shadow-[0_2px_12px_rgba(229,192,91,0.18)] hover:bg-amber-50/60 hover:border-[#D4AF37] text-foreground transition-all cursor-pointer"
          aria-label="Filter options"
        >
          <Link to="/app/search">
            <SlidersHorizontal className="size-4.5 sm:size-5" />
          </Link>
        </Button>
      </section>

      {/* Quick Filters */}
      <section className="space-y-3 w-full max-w-full min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-foreground">Quick Filters</h2>
          <Link
            to="/app/search"
            className="group flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:underline"
          >
            <span>View all</span>
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile View: Balanced 4-column circular badges matching Screen 9 */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 sm:hidden w-full max-w-full">
          {quickFilters.map((qf) => {
            const Icon = qf.icon;
            return (
              <Link
                key={qf.label}
                to={qf.to}
                className="group flex flex-col items-center gap-1 text-center transition-transform active:scale-95 min-w-0 w-full"
              >
                <div
                  className={`flex size-12 items-center justify-center rounded-full shadow-2xs transition-all group-hover:scale-105 ${qf.bgColor}`}
                >
                  <Icon className={`size-5 ${qf.iconColor}`} />
                </div>
                <span className="text-[0.65rem] font-semibold text-foreground/80 group-hover:text-foreground line-clamp-2 w-full text-center leading-tight break-words px-0.5">
                  {qf.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Desktop / Tablet View: Symmetrical 4-card interactive grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {quickFilters.map((qf) => {
            const Icon = qf.icon;
            return (
              <Link
                key={qf.label}
                to={qf.to}
                className="group flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card active:scale-[0.99]"
              >
                <div
                  className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-2xs transition-transform duration-200 group-hover:scale-105 ${qf.bgColor}`}
                >
                  <Icon className={`size-5 ${qf.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground transition-colors group-hover:text-primary truncate">
                    {qf.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{qf.description}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Profile Completion banner with Light Gold circular border matching Requirement 3 */}
      {user && user.profileCompletion < 100 ? (
        <section className="rounded-3xl border-2 border-[#E5C05B]/85 bg-gradient-to-br from-[#FFFDF8] via-amber-50/50 to-[#FFF9EE] dark:bg-stone-900/60 p-4 sm:p-6 shadow-[0_4px_20px_rgba(229,192,91,0.15)] ring-1 ring-[#E5C05B]/30 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-xl font-bold text-foreground">
                Complete your profile
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                Profiles above 90% get up to 3× more responses.
              </p>
            </div>
            <span className="font-display text-xl sm:text-3xl font-bold text-primary shrink-0">
              {user.profileCompletion}%
            </span>
          </div>
          <Progress value={user.profileCompletion} className="mt-3.5 h-2.5 bg-amber-200/60" />
          <Button
            asChild
            size="sm"
            className="mt-4 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E5C05B] hover:from-[#C59B27] hover:to-[#D4AF37] text-amber-950 font-bold shadow-xs px-5 cursor-pointer"
          >
            <Link to="/app/my-profile/edit">Complete now</Link>
          </Button>
        </section>
      ) : null}

      {/* Recommended Profiles Section: 2*n grid on mobile matching Requirement 4 */}
      <section className="space-y-4 w-full max-w-full min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-foreground">Recommended Profiles</h2>
          <Link
            to="/app/browse"
            className="text-xs sm:text-sm font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-full min-w-0">
          {profilesQuery.isPending ? (
            Array.from({ length: 4 }).map((_, idx) => <ProfileCardSkeleton key={idx} />)
          ) : profilesQuery.isError ? (
            <div className="col-span-2 sm:col-span-2 lg:col-span-3">
              <ErrorState onRetry={() => void profilesQuery.refetch()} />
            </div>
          ) : (
            (profilesQuery.data ?? [])
              .filter((p) => !user || p.id !== user.id)
              .slice(0, 6)
              .map((profile) => (
                <ProfileCard key={profile.id} profile={profile} onShortlist={handleShortlist} />
              ))
          )}
        </div>
      </section>

      {/* Informational & Legal Quick Links Footer */}
      <footer className="pt-6 pb-8 border-t border-border/60 text-center space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild variant="neutral" size="sm" className="rounded-full text-xs h-8 px-3.5 shadow-2xs hover:border-primary/40">
            <Link to="/about">About Us</Link>
          </Button>
          <Button asChild variant="neutral" size="sm" className="rounded-full text-xs h-8 px-3.5 shadow-2xs hover:border-primary/40">
            <Link to="/contact">Contact Us</Link>
          </Button>
          <Button asChild variant="neutral" size="sm" className="rounded-full text-xs h-8 px-3.5 shadow-2xs hover:border-primary/40">
            <Link to="/privacy">Privacy Policy</Link>
          </Button>
          <Button asChild variant="neutral" size="sm" className="rounded-full text-xs h-8 px-3.5 shadow-2xs hover:border-primary/40">
            <Link to="/terms">Terms of Service</Link>
          </Button>
        </div>

        <p className="text-[0.72rem] text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
          <span>100% Verified Profiles & Family-First Matchmaking</span>
        </p>

        <p className="text-[0.68rem] text-muted-foreground/70">
          © {new Date().getFullYear()} YFJ Matrimony. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
