import { Link } from "@tanstack/react-router";
import { Briefcase, Check, GraduationCap, Heart, MapPin } from "lucide-react";
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
      <article className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-raised">
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
                  className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#C59B27] text-white shadow-xs"
                  title="Verified Profile"
                >
                  <Check className="size-2.5 stroke-[3]" />
                </span>
              ) : null}
            </Link>
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
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-shadow hover:shadow-raised">
      <div className="relative overflow-hidden">
        <Link to="/app/profiles/$profileId" params={{ profileId: profile.id }}>
          <img
            src={profile.photos[0]}
            alt={profile.fullName}
            loading="lazy"
            width={800}
            height={1000}
            className="aspect-[4/3.8] sm:aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>
        {onShortlist ? (
          <button
            type="button"
            aria-label={profile.shortlisted ? "Remove from shortlist" : "Add to shortlist"}
            aria-pressed={profile.shortlisted}
            onClick={() => onShortlist(profile)}
            className="absolute right-3 top-3 grid size-10 cursor-pointer place-items-center rounded-full bg-white/95 text-[#D92662] shadow-md backdrop-blur transition-transform hover:scale-110 active:scale-95"
          >
            <Heart
              className={cn(
                "size-5",
                profile.shortlisted ? "fill-[#D92662] text-[#D92662]" : "text-[#D92662]",
              )}
            />
          </button>
        ) : null}
        {profile.lastActive === "Online now" ? (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[0.65rem] font-bold text-white shadow-xs backdrop-blur-xs">
            Online
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-3 p-4">
        <div className="space-y-2">
          <Link
            to="/app/profiles/$profileId"
            params={{ profileId: profile.id }}
            className="flex items-center gap-1.5"
          >
            <h3 className="truncate font-sans text-lg font-bold text-foreground">
              {profile.fullName}, {profile.age}
            </h3>
            {profile.verified ? (
              <span
                className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-[#C59B27] text-white shadow-xs"
                title="Verified Member"
              >
                <Check className="size-3 stroke-[3]" />
              </span>
            ) : null}
          </Link>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <Briefcase className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{profile.occupation}</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {profile.city}, {profile.state}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <GraduationCap className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{profile.education}</span>
            </li>
          </ul>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[profile.height, profile.religion, profile.caste].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-rose-50/80 border border-rose-100/80 px-2.5 py-0.5 text-[0.68rem] font-semibold text-foreground/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2.5 border-t border-border/60">
          <Button
            asChild
            variant="neutral"
            size="sm"
            className="h-9 flex-1 px-2.5 sm:px-3 rounded-xl text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/80 border-border/80 transition-colors whitespace-nowrap"
          >
            <Link to="/app/profiles/$profileId" params={{ profileId: profile.id }}>
              View Profile
            </Link>
          </Button>
          {onInterest ? (
            <Button
              size="sm"
              onClick={() => onInterest(profile)}
              disabled={profile.interestSent}
              className={cn(
                "h-9 flex-1 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer gap-1.5 whitespace-nowrap",
                profile.interestSent
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-default"
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20 hover:shadow-md active:scale-[0.98]"
              )}
            >
              {profile.interestSent ? (
                <>
                  <Check className="size-3.5 shrink-0 stroke-[2.5]" />
                  <span>Interest Sent</span>
                </>
              ) : (
                <>
                  <Heart className="size-3.5 shrink-0 fill-white" />
                  <span>Send Interest</span>
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
