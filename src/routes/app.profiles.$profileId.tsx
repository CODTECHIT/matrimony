import { useState } from "react";
import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Check,
  Heart,
  Lock,
  MapPin,
  MoreVertical,
  Phone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/common/states";
import { profilesService, subscriptionsService } from "@/services";
import type { Profile } from "@/types";
import { getProfileAvatar, handleImageError } from "@/lib/images";

export const Route = createFileRoute("/app/profiles/$profileId")({
  head: () => ({
    meta: [
      { title: "Profile details — YFJ Matrimony" },
      {
        name: "description",
        content: "View full matrimony profile details including family, education and community.",
      },
      { property: "og:title", content: "Profile details — YFJ Matrimony" },
      { property: "og:description", content: "Full profile details for a verified member." },
    ],
  }),
  component: ProfileDetailsPage,
});

function DetailRow({ label, value }: { label: string; value?: string | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

function ProfileDetailsPage() {
  const { profileId } = useParams({ from: "/app/profiles/$profileId" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile", profileId],
    queryFn: () => profilesService.byId(profileId),
  });
  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });

  if (profileQuery.isPending) return <LoadingState label="Loading profile" />;
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ErrorState
        title="Profile unavailable"
        description="This profile may have been hidden or removed."
        onRetry={() => void profileQuery.refetch()}
      />
    );
  }

  const profile = profileQuery.data;
  const canViewContact = profile.canViewContact;

  const shortlist = async () => {
    queryClient.setQueryData(["profile", profileId], (old: Profile | undefined) => {
      if (!old) return old;
      return { ...old, shortlisted: !old.shortlisted };
    });
    try {
      const result = await profilesService.toggleShortlist(profile.id);
      await queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(result.shortlisted ? "Added to your shortlist" : "Removed from shortlist");
    } catch {
      await queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      toast.error("Failed to update shortlist");
    }
  };

  const sendInterest = async () => {
    queryClient.setQueryData(["profile", profileId], (old: Profile | undefined) => {
      if (!old) return old;
      return { ...old, interestSent: true };
    });
    try {
      await profilesService.sendInterest(profile.id);
      await queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(`Interest sent to ${profile.fullName.split(" ")[0]}`);
    } catch {
      await queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      toast.error("Failed to send interest");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-36 lg:pb-12">
      {/* Top Header matching Screen 8 */}
      <div className="sticky top-0 z-30 flex items-center justify-between -mx-4 px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/60 sm:mx-0 sm:px-0 sm:border-0 sm:bg-transparent">
        <button
          type="button"
          onClick={() => void navigate({ to: "/app/browse" })}
          className="grid size-10 place-items-center rounded-full border border-border bg-white text-foreground hover:bg-muted shadow-xs transition-colors cursor-pointer"
          aria-label="Back to browse"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-sans text-lg font-bold text-foreground">Profile Details</h1>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="More options"
        >
          <MoreVertical className="size-5" />
        </button>
      </div>

      {/* Main Grid: Responsive 2-column on desktop (lg:grid-cols-12), stacked on mobile */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Column: Photo Gallery & Desktop Actions (Sticky on desktop) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          {/* Hero Photo Carousel Card matching Screen 8 */}
          <div className="relative overflow-hidden rounded-3xl bg-card shadow-card">
            <img
              src={getProfileAvatar(profile.photos[photoIndex] ?? profile.photos[0], profile.gender)}
              alt={profile.fullName}
              width={800}
              height={1000}
              onError={(e) => handleImageError(e, profile.gender)}
              className="aspect-[4/5] w-full object-cover max-h-[500px]"
            />

            {/* Photo count indicator badge: e.g. 1/5 */}
            <span className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
              {photoIndex + 1}/{profile.photos.length || 1}
            </span>

            {/* Multiple photos indicator dots */}
            {profile.photos.length > 1 ? (
              <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5">
                {profile.photos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoIndex(idx)}
                    className={`size-2 rounded-full transition-all cursor-pointer ${
                      idx === photoIndex ? "w-6 bg-white" : "bg-white/50"
                    }`}
                    aria-label={`Photo ${idx + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Desktop Thumbnail Gallery */}
          {profile.photos.length > 1 ? (
            <div className="hidden lg:flex gap-2 overflow-x-auto pb-1">
              {profile.photos.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhotoIndex(idx)}
                  className={`relative size-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === photoIndex
                      ? "border-[#D92662] scale-105"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={getProfileAvatar(src, profile.gender)}
                    alt=""
                    onError={(e) => handleImageError(e, profile.gender)}
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}

          {/* Desktop Action Buttons (Visible on desktop, replaces floating bottom bar) */}
          <div className="hidden lg:flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => void navigate({ to: "/app/browse" })}
              className="size-12 rounded-2xl border-rose-200 text-rose-500 hover:bg-rose-50 cursor-pointer"
              title="Pass"
            >
              <X className="size-5" />
            </Button>
            <Button
              onClick={sendInterest}
              disabled={profile.interestSent}
              className="flex-1 rounded-2xl bg-[#C59B27] hover:bg-[#B38A20] text-white font-bold h-12 shadow-sm cursor-pointer"
            >
              <Heart className="size-4 fill-white mr-2" />
              {profile.interestSent ? "Interest Sent" : "Send Interest"}
            </Button>
            <Button
              size="icon"
              onClick={shortlist}
              className={`size-12 rounded-2xl text-white shadow-sm cursor-pointer ${
                profile.shortlisted ? "bg-[#D92662]" : "bg-[#D92662] hover:bg-[#C2185B]"
              }`}
              title="Shortlist"
            >
              <Heart className="size-5 fill-white" />
            </Button>
          </div>
        </div>

        {/* Right Column: Profile Details */}
        <div className="lg:col-span-7 mt-6 lg:mt-0 space-y-5 rounded-3xl bg-white p-6 shadow-card border border-border">
          {/* Name, Verified Badge & Bookmark */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans text-2xl sm:text-3xl font-bold text-foreground">
                  {profile.fullName.split(" ")[0]}, {profile.age}
                </h2>
                {profile.verified ? (
                  <span
                    className="flex size-5.5 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-xs"
                    title="Verified Profile"
                  >
                    <Check className="size-3.5 stroke-[3]" />
                  </span>
                ) : null}
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Briefcase className="size-4 text-muted-foreground" />
                  <span>{profile.occupation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span>
                    {profile.city}, {profile.state}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setBookmarked((v) => !v);
                toast.success(!bookmarked ? "Bookmarked profile" : "Bookmark removed");
              }}
              aria-label="Bookmark profile"
              className={`grid size-11 place-items-center rounded-2xl border transition-all cursor-pointer ${
                bookmarked
                  ? "border-[#D92662] bg-rose-50 text-[#D92662]"
                  : "border-border bg-white text-muted-foreground hover:bg-muted"
              }`}
            >
              <Bookmark className={`size-5 ${bookmarked ? "fill-current" : ""}`} />
            </button>
          </div>

          {/* Soft Pastel Pills matching Screen 8 */}
          <div className="flex flex-wrap gap-2 pt-1 border-b border-border/80 pb-5">
            {[profile.height, profile.religion, profile.caste].map((pill) => (
              <span
                key={pill}
                className="rounded-full bg-rose-50/90 border border-rose-100 px-4 py-1.5 text-xs font-semibold text-foreground/90"
              >
                {pill}
              </span>
            ))}
          </div>

          {/* About Section matching Screen 8 */}
          <div className="space-y-2">
            <h3 className="font-sans text-base font-bold text-foreground">About</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {bioExpanded ? profile.about : `${profile.about.slice(0, 120)}...`}
              {profile.about.length > 120 ? (
                <button
                  type="button"
                  onClick={() => setBioExpanded((v) => !v)}
                  className="ml-1.5 font-semibold text-[#D92662] hover:underline cursor-pointer"
                >
                  {bioExpanded ? "Read less" : "Read more"}
                </button>
              ) : null}
            </p>
          </div>

          {/* Basic Details Section */}
          <div className="space-y-2 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-base font-bold text-foreground">Basic Details</h3>
              <span className="text-xs font-semibold text-[#D92662]">View all</span>
            </div>
            <dl className="space-y-1">
              <DetailRow label="Height" value={profile.height} />
              <DetailRow label="Religion" value={profile.religion} />
              <DetailRow label="Caste" value={profile.caste} />
              <DetailRow label="Mother Tongue" value={profile.motherTongue} />
              <DetailRow label="Marital Status" value={profile.maritalStatus.replace(/_/g, " ")} />
              <DetailRow label="Education" value={profile.education} />
            </dl>
          </div>

          {/* Contact info with protection lock */}
          <div className="rounded-2xl border border-border bg-stone-50/70 dark:bg-stone-900/60 p-4 space-y-2.5">
            <h3 className="font-sans text-base font-bold text-foreground">Contact Details</h3>
            {canViewContact && profile.contact ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-[#D92662]">
                <Phone className="size-4" /> {profile.contact.mobile}
              </p>
            ) : (
              <div className="space-y-2.5">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="size-4 shrink-0 text-[#C59B27]" />
                  <span>Contact details are protected by privacy policy.</span>
                </p>
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-[#C59B27] hover:bg-[#B38A20] text-white text-xs font-semibold px-4 shadow-xs"
                >
                  <Link to="/app/upgrade">Upgrade to View Contact</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar matching Screen 8 (Mobile only - hidden on lg) */}
      <div className="fixed inset-x-0 bottom-6 z-40 px-4 lg:hidden pointer-events-none">
        <div className="mx-auto flex max-w-md items-center justify-center gap-4 pointer-events-auto">
          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => void navigate({ to: "/app/browse" })}
            className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-rose-200 bg-white text-rose-500 shadow-xl shadow-black/10 transition-transform active:scale-95 hover:bg-rose-50 cursor-pointer"
            aria-label="Dismiss profile"
          >
            <X className="size-6 stroke-[2.5]" />
          </button>

          {/* Send Interest Gold Pill Button */}
          <button
            type="button"
            onClick={sendInterest}
            disabled={profile.interestSent}
            className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-full bg-[#C59B27] hover:bg-[#B38A20] px-6 text-base font-bold text-white shadow-xl shadow-amber-950/20 transition-transform active:scale-[0.98] disabled:opacity-75 cursor-pointer"
          >
            <Heart className="size-5 fill-white" />
            <span>{profile.interestSent ? "Interest Sent" : "Send Interest"}</span>
          </button>

          {/* Shortlist Pink Heart Circle Button */}
          <button
            type="button"
            onClick={shortlist}
            aria-label="Shortlist profile"
            className={`flex size-14 shrink-0 items-center justify-center rounded-full shadow-xl shadow-rose-950/20 transition-transform active:scale-95 cursor-pointer ${
              profile.shortlisted
                ? "bg-[#D92662] text-white"
                : "bg-[#D92662] text-white hover:bg-[#C2185B]"
            }`}
          >
            <Heart className="size-6 fill-white stroke-none" />
          </button>
        </div>
      </div>
    </div>
  );
}
