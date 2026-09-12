import { Link } from "@tanstack/react-router";
import { Briefcase, Check, Heart, MapPin, Sparkles } from "lucide-react";
import type { Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  profile: Profile;
  onShortlist?: (profile: Profile) => void;
  onInterest?: (profile: Profile) => void;
  layout?: "grid" | "row";
}

export function ProfileCard({
  profile,
  onShortlist,
  onInterest,
  layout = "grid",
}: ProfileCardProps) {
  if (layout === "row") {
    return (
      <article className="flex gap-3 rounded-2xl border border-amber-500/25 bg-card p-3 shadow-card hover:border-amber-400/60 hover:shadow-raised transition-all duration-300 w-full min-w-0 max-w-full overflow-hidden">
        <Link to="/app/profiles/$profileId" params={{ profileId: profile.id }} className="shrink-0">
          <img
            src={profile.photos[0]}
            alt={profile.fullName}
            loading="lazy"
            width={160}
            height={200}
            className="size-24 rounded-xl object-cover"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <Link
                to="/app/profiles/$profileId"
                params={{ profileId: profile.id }}
                className="flex items-center gap-1.5"
              >
                <h3 className="truncate font-sans text-base font-bold text-foreground">
                  {profile.fullName}, {profile.age}
                </h3>
                {profile.verified ? (
                  <span
                    className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-xs"
                    title="Verified Profile"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </span>
                ) : null}
              </Link>
              {profile.matchScore ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[0.65rem] font-bold text-[#D92662] border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60">
                  <Sparkles className="size-2.5 text-amber-500 fill-amber-500" />
                  {profile.matchScore}% Match
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {profile.occupation} · {profile.city}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted-foreground">
              {profile.height} · {profile.religion} · {profile.caste}
            </p>
            {onShortlist ? (
              <button
                type="button"
                aria-label={profile.shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                aria-pressed={profile.shortlisted}
                onClick={() => onShortlist(profile)}
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-primary-soft text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Heart className={cn("size-4", profile.shortlisted && "fill-current")} />
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm hover:border-amber-400/70 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative overflow-hidden w-full">
        <Link
          to="/app/profiles/$profileId"
          params={{ profileId: profile.id }}
          className="block w-full"
        >
          <img
            src={profile.photos[0]}
            alt={profile.fullName}
            loading="lazy"
            width={800}
            height={1000}
            className="aspect-[3/3.8] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
        {onShortlist ? (
          <button
            type="button"
            aria-label={profile.shortlisted ? "Remove from shortlist" : "Add to shortlist"}
            aria-pressed={profile.shortlisted}
            onClick={() => onShortlist(profile)}
            className="absolute right-2 top-2 grid size-7.5 sm:size-9 cursor-pointer place-items-center rounded-full bg-white/90 text-[#D92662] shadow-sm backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
          >
            <Heart
              className={cn(
                "size-3.5 sm:size-4.5",
                profile.shortlisted ? "fill-[#D92662] text-[#D92662]" : "text-[#D92662]",
              )}
            />
          </button>
        ) : null}
        {profile.lastActive === "Online now" ? (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[0.6rem] font-bold text-white shadow-xs backdrop-blur-xs">
            Online
          </span>
        ) : null}
        {profile.matchScore ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-2 py-0.5 text-[0.62rem] sm:text-[0.68rem] font-semibold text-white shadow-xs flex items-center gap-1">
            <Sparkles className="size-2.5 text-amber-400 fill-amber-400" />
            <span>{profile.matchScore}% Match</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-1.5 sm:space-y-2 p-2.5 sm:p-3.5 min-w-0 w-full">
        <div className="space-y-1 sm:space-y-1.5 min-w-0 w-full">
          {/* Name & Age Header */}
          <div className="flex items-center justify-between gap-1 min-w-0 w-full">
            <Link
              to="/app/profiles/$profileId"
              params={{ profileId: profile.id }}
              className="flex items-center gap-1 min-w-0 truncate"
            >
              <h3 className="truncate font-sans text-xs sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                {profile.fullName}
              </h3>
              {profile.verified ? (
                <span
                  className="flex size-3.5 sm:size-4 shrink-0 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-xs"
                  title="Verified Member"
                >
                  <Check className="size-2 sm:size-2.5 stroke-[3]" />
                </span>
              ) : null}
            </Link>
            <span className="shrink-0 text-xs sm:text-sm font-bold text-primary whitespace-nowrap">
              {profile.age} yrs
            </span>
          </div>

          {/* Profession & City */}
          <div className="space-y-0.5 text-[0.7rem] sm:text-xs text-muted-foreground min-w-0 w-full">
            <p className="flex items-center gap-1 min-w-0 font-medium text-foreground/90">
              <Briefcase className="size-3 sm:size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate min-w-0">{profile.occupation}</span>
            </p>
            <p className="flex items-center gap-1 min-w-0">
              <MapPin className="size-3 sm:size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate min-w-0">
                {profile.city}, {profile.state}
              </span>
            </p>
          </div>

          {/* Clean Pills for Height & Community */}
          <div className="flex items-center gap-1 pt-0.5 overflow-hidden text-[0.62rem] sm:text-[0.68rem] font-semibold min-w-0 w-full">
            <span className="rounded-md bg-rose-50/90 border border-rose-100/80 px-1.5 py-0.5 text-rose-900/90 dark:bg-rose-950/40 dark:text-rose-300 shrink-0 whitespace-nowrap">
              {profile.height}
            </span>
            <span className="rounded-md bg-amber-50/90 border border-amber-200/70 px-1.5 py-0.5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 truncate min-w-0">
              {profile.caste && profile.caste !== "—"
                ? `${profile.religion}, ${profile.caste}`
                : profile.religion}
            </span>
          </div>
        </div>

        {/* Action Row: Side-by-side View & Connect buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 pt-2 border-t border-border/60 min-w-0 w-full">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-7.5 sm:h-8 flex-1 min-w-0 rounded-xl text-[0.7rem] sm:text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/80 border-border/80 transition-colors cursor-pointer px-1 sm:px-2"
          >
            <Link
              to="/app/profiles/$profileId"
              params={{ profileId: profile.id }}
              className="truncate"
            >
              View
            </Link>
          </Button>
          {onInterest ? (
            <Button
              size="sm"
              onClick={() => onInterest(profile)}
              disabled={profile.interestSent}
              className={cn(
                "h-7.5 sm:h-8 flex-[1.4] min-w-0 rounded-xl text-[0.7rem] sm:text-xs font-bold transition-all shadow-xs cursor-pointer gap-1 px-1 sm:px-2",
                profile.interestSent
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-default"
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20 hover:shadow-md active:scale-[0.98]",
              )}
            >
              {profile.interestSent ? (
                <>
                  <Check className="size-3 shrink-0 stroke-[2.5]" />
                  <span className="truncate min-w-0">Sent</span>
                </>
              ) : (
                <>
                  <Heart className="size-3 shrink-0 fill-white" />
                  <span className="truncate min-w-0">Connect</span>
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
