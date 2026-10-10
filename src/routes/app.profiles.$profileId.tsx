import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  MoreVertical,
  Phone,
  Share2,
  UserMinus,
  X,
  Flag,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState, ErrorState } from "@/components/common/states";
import { messagesService, profilesService, subscriptionsService } from "@/services";
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
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Fake Profile / Impersonation");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      await profilesService.reportProfile(profileId, reportReason, reportDetails);
      toast.success("Profile reported. Our safety team will review the issue promptly.");
      setReportModalOpen(false);
      setReportDetails("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmittingReport(false);
    }
  };

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    dragFree: false,
    containScroll: "trimSnaps",
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPhotoIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
      emblaApi.scrollTo(0, true);
    }
    setPhotoIndex(0);
  }, [profileId, emblaApi]);

  const profileQuery = useQuery({
    queryKey: ["profile", profileId],
    queryFn: () => profilesService.byId(profileId),
  });
  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });
  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagesService.conversations(),
  });

  if (profileQuery.isPending) return <LoadingState label="Loading profile" />;
  if (profileQuery.isError || !profileQuery.data) {
    const errorMsg =
      profileQuery.error instanceof Error ? profileQuery.error.message : "";
    if (errorMsg.startsWith("DAILY_LIMIT_EXCEEDED")) {
      const parts = errorMsg.split(":");
      const limit = parts[1] || "your plan's";
      const tier = parts[2] || "current";
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 space-y-4">
          <span className="flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
            <Lock className="size-8 text-amber-600" />
          </span>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Daily Profile Views Reached
          </h2>
          <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
            You have reached your daily limit of {limit} profile views on the{" "}
            <span className="font-semibold capitalize text-foreground">{tier}</span> membership.
            Upgrade your package to unlock more daily profile views.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              asChild
              className="rounded-full bg-[#D92662] hover:bg-[#C2185B] text-white font-bold px-6"
            >
              <Link to="/app/upgrade">Upgrade Plan</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/app/browse">Back to Browse</Link>
            </Button>
          </div>
        </div>
      );
    }
    return (
      <ErrorState
        title="Profile unavailable"
        description="This profile may have been hidden or removed."
        onRetry={() => void profileQuery.refetch()}
      />
    );
  }

  const profile = profileQuery.data;
  const rawPhotos = profile.photos?.filter(Boolean);
  const photos = rawPhotos && rawPhotos.length > 0 ? rawPhotos : [""];

  const scrollPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (emblaApi) emblaApi.scrollPrev();
    else setPhotoIndex((prev) => Math.max(0, prev - 1));
  };

  const scrollNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (emblaApi) emblaApi.scrollNext();
    else setPhotoIndex((prev) => Math.min(photos.length - 1, prev + 1));
  };

  const handleScrollTo = (idx: number) => {
    if (emblaApi) emblaApi.scrollTo(idx);
    else setPhotoIndex(idx);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    const dt = Date.now() - pointerStartRef.current.time;
    pointerStartRef.current = null;

    // If pointer moved more than 8px or was held down longer than 400ms, it's a swipe/drag, NOT a tap!
    if (dx > 8 || dy > 8 || dt > 400) return;
    if (photos.length <= 1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;

    if (ratio < 0.35) {
      scrollPrev();
    } else if (ratio > 0.65) {
      scrollNext();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollNext();
    }
  };

  // FIX 3: Contact visibility must be driven by the viewer's subscription permission,
  // not a field on the profile itself. Backend controls canViewContacts per subscription.
  const canViewContact =
    (subscriptionQuery.data?.permissions.canViewContacts === true) && !!profile.contact;

  const existingConv = conversationsQuery.data?.find(
    (c) =>
      c.participant.id === profile.id ||
      (profile.displayId && c.participant.displayId === profile.displayId) ||
      c.participant.id === profileId ||
      c.participant.displayId === profileId,
  );
  const isConnected = Boolean(profile.isConnected || existingConv);
  const conversationId = profile.conversationId || existingConv?.id;

  const handleOpenChat = async () => {
    try {
      let convId = conversationId;
      if (!convId) {
        const res = await messagesService.start(profile.id, profile.fullName, profile.photos);
        convId = res.id;
      }
      void navigate({
        to: "/app/messages/$conversationId",
        params: { conversationId: convId },
      });
    } catch {
      toast.error("Could not open chat with this member");
    }
  };

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

  const handleUnfriend = async () => {
    if (!profile) return;
    if (
      !window.confirm(
        `Are you sure you want to unfriend and remove connection with ${profile.fullName}?`,
      )
    ) {
      return;
    }
    try {
      await profilesService.unfriend(profile.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", profileId] }),
        queryClient.invalidateQueries({ queryKey: ["interests"] }),
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["profiles"] }),
      ]);
      toast.success(`Unfriended ${profile.fullName}. Connection removed.`);
    } catch {
      toast.error("Failed to unfriend.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-36 lg:pb-12">
      {/* Top Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between -mx-4 px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/60 sm:mx-0 sm:px-0 sm:border-0 sm:bg-transparent">
        <button
          type="button"
          onClick={() => void navigate({ to: "/app/browse" })}
          className="grid size-10 place-items-center rounded-full border border-border bg-white text-foreground hover:bg-muted shadow-xs transition-colors cursor-pointer"
          aria-label="Back to browse"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-sans text-lg font-bold text-foreground">
          Profile Details · {profile.displayId || profile.id}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="More options"
            >
              <MoreVertical className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 shadow-lg">
            <DropdownMenuItem
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.href);
                toast.success("Profile link copied to clipboard");
              }}
              className="rounded-xl cursor-pointer flex items-center gap-2"
            >
              <Share2 className="size-4" />
              Copy Profile Link
            </DropdownMenuItem>
            {isConnected && (
              <DropdownMenuItem
                onClick={handleUnfriend}
                className="rounded-xl cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
              >
                <UserMinus className="size-4" />
                Unfriend / Disconnect
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setReportModalOpen(true)}
              className="rounded-xl cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
            >
              <Flag className="size-4" />
              Report Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── DESKTOP: rich 2-column layout ── */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-7 items-start">

        {/* ── LEFT: Photo card with gradient overlay (sticky) ── */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">

          {/* Photo + overlaid name/actions card */}
          <div
            className="relative overflow-hidden rounded-3xl shadow-xl bg-black group select-none focus:outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            {/* Carousel Viewport (Swipeable with touch or mouse drag) */}
            <div
              ref={emblaRef}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              className="overflow-hidden w-full cursor-grab active:cursor-grabbing touch-pan-y"
            >
              <div className="flex touch-pan-y">
                {photos.map((src, idx) => (
                  <div
                    key={idx}
                    className="min-w-0 shrink-0 grow-0 basis-full relative overflow-hidden"
                    style={{ aspectRatio: "3/4", maxHeight: "620px" }}
                  >
                    <img
                      src={getProfileAvatar(src, profile.gender)}
                      alt={`${profile.fullName} photo ${idx + 1}`}
                      width={800}
                      height={1000}
                      onError={(e) => handleImageError(e, profile.gender)}
                      className="size-full object-cover select-none pointer-events-none"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Photo count badge */}
            <span className="absolute right-4 top-4 z-20 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md pointer-events-none">
              {photoIndex + 1}/{photos.length}
            </span>

            {/* Bookmark button top-left */}
            <button
              type="button"
              onClick={() => {
                setBookmarked((v) => !v);
                toast.success(!bookmarked ? "Bookmarked profile" : "Bookmark removed");
              }}
              aria-label="Bookmark profile"
              className={`absolute left-4 top-4 z-20 grid size-9 place-items-center rounded-full border backdrop-blur-md transition-all cursor-pointer ${
                bookmarked
                  ? "border-[#D92662] bg-rose-600/80 text-white"
                  : "border-white/30 bg-black/40 text-white hover:bg-white/20"
              }`}
            >
              <Bookmark className={`size-4 ${bookmarked ? "fill-current" : ""}`} />
            </button>

            {/* Prev / Next arrows for click navigation */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={scrollPrev}
                  disabled={photoIndex === 0}
                  aria-label="Previous photo"
                  className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 grid size-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/80 cursor-pointer ${
                    photoIndex === 0
                      ? "opacity-0 pointer-events-none"
                      : "opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-80"
                  }`}
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  disabled={photoIndex === photos.length - 1}
                  aria-label="Next photo"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 grid size-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/80 cursor-pointer ${
                    photoIndex === photos.length - 1
                      ? "opacity-0 pointer-events-none"
                      : "opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-80"
                  }`}
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}

            {/* Bottom gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none bg-gradient-to-t from-black/95 via-black/55 to-transparent pt-28 pb-5 px-5">
              {/* Dot indicators */}
              {photos.length > 1 && (
                <div className="flex justify-center gap-1.5 mb-3 pointer-events-auto">
                  {photos.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleScrollTo(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === photoIndex ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
                      }`}
                      aria-label={`Photo ${idx + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Name & basic info */}
              <div className="flex items-end justify-between gap-2 mb-1">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-sans text-2xl font-bold text-white leading-tight">
                      {profile.fullName.split(" ")[0]}, {profile.age}
                    </h2>
                    {profile.verified && (
                      <span
                        className="flex size-5 items-center justify-center rounded-full bg-amber-400 shadow-xs"
                        title="Verified Profile"
                      >
                        <Check className="size-3 stroke-[3] text-white" />
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
                    {profile.occupation && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="size-3" />
                        {profile.occupation}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {profile.city}, {profile.state}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick pills */}
              <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
                <span className="rounded-full bg-amber-400/25 border border-amber-300/40 px-2.5 py-1 text-[11px] font-bold text-amber-200">
                  ID: {profile.displayId || profile.id}
                </span>
                {[profile.height, profile.religion, profile.caste].filter(Boolean).map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full bg-white/15 border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white/90"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              {/* Action buttons row — embedded in photo */}
              <div className="flex items-center gap-2.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/app/browse" })}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors cursor-pointer"
                  title="Pass"
                >
                  <X className="size-5" />
                </button>

                {isConnected ? (
                  <button
                    type="button"
                    onClick={() => void handleOpenChat()}
                    className="flex flex-1 h-11 items-center justify-center gap-2 rounded-full bg-[#D92662] hover:bg-[#C2185B] text-white font-bold text-sm shadow-lg cursor-pointer transition-colors"
                  >
                    <MessageCircle className="size-4" />
                    Message
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={sendInterest}
                    disabled={profile.interestSent}
                    className="flex flex-1 h-11 items-center justify-center gap-2 rounded-full bg-[#C59B27] hover:bg-[#B38A20] text-white font-bold text-sm shadow-lg cursor-pointer transition-colors disabled:opacity-70"
                  >
                    <Heart className="size-4 fill-white" />
                    {profile.interestSent ? "Interest Sent" : "Send Interest"}
                  </button>
                )}

                {isConnected && (
                  <button
                    type="button"
                    onClick={handleUnfriend}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-rose-400/50 bg-rose-500/20 backdrop-blur-md text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
                    title="Unfriend"
                  >
                    <UserMinus className="size-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={shortlist}
                  aria-label="Shortlist profile"
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 backdrop-blur-md transition-colors cursor-pointer ${
                    profile.shortlisted
                      ? "border-[#D92662] bg-[#D92662] text-white"
                      : "border-white/30 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Heart className={`size-4 ${profile.shortlisted ? "fill-white" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Thumbnail strip (only if multiple photos) */}
          {photos.length > 1 && (
            <div className="hidden lg:flex gap-2 mt-3 overflow-x-auto pb-1">
              {photos.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleScrollTo(idx)}
                  className={`relative size-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === photoIndex
                      ? "border-[#D92662] scale-105"
                      : "border-transparent opacity-60 hover:opacity-100"
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
          )}
        </div>

        {/* ── RIGHT: Details panel ── */}
        <div className="lg:col-span-7 mt-6 lg:mt-0 space-y-4">

          {/* About card */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">About</h3>
            <p className="text-sm leading-relaxed text-foreground/80">
              {bioExpanded ? profile.about : `${(profile.about || "").slice(0, 200)}...`}
              {(profile.about || "").length > 200 ? (
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

          {/* Basic Details — 2-column grid */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Basic Details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-0 divide-y-0">
              {(
                [
                  ["Height", profile.height],
                  ["Religion", profile.religion],
                  ["Caste", profile.caste],
                  ["Mother Tongue", profile.motherTongue],
                  ["Marital Status", profile.maritalStatus?.replace(/_/g, " ")],
                  ["Age", profile.age ? `${profile.age} Years` : undefined],
                ] as [string, string | undefined][]
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col py-2.5 border-b border-border/50 last:border-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-semibold text-foreground mt-0.5">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Education & Profession — 2-column grid */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Education & Profession</h3>
            <dl className="grid grid-cols-2 gap-x-6">
              {(
                [
                  ["Qualification", profile.education],
                  ["Occupation", profile.occupation],
                  ["Employment", profile.employmentStatus],
                  ["Annual Income", profile.incomeRange],
                ] as [string, string | undefined][]
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col py-2.5 border-b border-border/50 last:border-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-semibold text-foreground mt-0.5">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Location & Family — side by side cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Location</h3>
              <dl className="space-y-2.5">
                {(
                  [
                    ["City", profile.city],
                    ["State", profile.state],
                    ["Country", profile.country || "India"],
                  ] as [string, string | undefined][]
                ).map(([label, value]) => (
                  <div key={label} className="flex flex-col">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-semibold text-foreground mt-0.5">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Family</h3>
              <dl className="space-y-2.5">
                {(
                  [
                    ["Family Type", profile.family?.familyType],
                    ["Family Values", profile.family?.familyValues],
                    ["Siblings", profile.family?.siblings],
                  ] as [string, string | undefined][]
                ).map(([label, value]) => (
                  <div key={label} className="flex flex-col">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-semibold text-foreground mt-0.5">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Parents occupation - full width */}
          {(profile.family?.fatherOccupation || profile.family?.motherOccupation) && (
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Parents</h3>
              <dl className="grid grid-cols-2 gap-x-6">
                {(
                  [
                    ["Father's Occupation", profile.family?.fatherOccupation],
                    ["Mother's Occupation", profile.family?.motherOccupation],
                  ] as [string, string | undefined][]
                ).map(([label, value]) => (
                  <div key={label} className="flex flex-col">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-semibold text-foreground mt-0.5">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Contact Details card */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-rose-50/60 to-amber-50/40 p-5 shadow-sm">
            <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Contact Details</h3>
            {canViewContact && profile.contact ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#D92662]">
                  <Phone className="size-4" /> {profile.contact.mobile}
                </p>
                {profile.contact.whatsapp ? (
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <span className="size-4 flex items-center justify-center font-bold text-xs bg-emerald-600 text-white rounded-full">
                      W
                    </span>
                    WhatsApp: {profile.contact.whatsapp}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="size-4 shrink-0 text-[#C59B27]" />
                  <span>Contact details are protected by privacy policy.</span>
                </p>
                <Button
                  asChild
                  size="sm"
                  className="shrink-0 rounded-full bg-[#C59B27] hover:bg-[#B38A20] text-white text-xs font-semibold px-4 shadow-xs"
                >
                  <Link to="/app/upgrade">Upgrade to View</Link>
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

          {isConnected ? (
            /* Message Pill Button — user is already connected */
            <button
              type="button"
              onClick={() => void handleOpenChat()}
              className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-full bg-[#D92662] hover:bg-[#C2185B] px-6 text-base font-bold text-white shadow-xl shadow-rose-950/20 transition-transform active:scale-[0.98] cursor-pointer"
            >
              <MessageCircle className="size-5" />
              <span>Message</span>
            </button>
          ) : (
            /* Send Interest Gold Pill Button */
            <button
              type="button"
              onClick={sendInterest}
              disabled={profile.interestSent}
              className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-full bg-[#C59B27] hover:bg-[#B38A20] px-6 text-base font-bold text-white shadow-xl shadow-amber-950/20 transition-transform active:scale-[0.98] disabled:opacity-75 cursor-pointer"
            >
              <Heart className="size-5 fill-white" />
              <span>{profile.interestSent ? "Interest Sent" : "Send Interest"}</span>
            </button>
          )}

          {isConnected && (
            <button
              type="button"
              onClick={handleUnfriend}
              className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-rose-300 bg-white text-rose-600 shadow-xl transition-transform active:scale-95 hover:bg-rose-50 cursor-pointer"
              title="Unfriend and remove connection"
              aria-label="Unfriend"
            >
              <UserMinus className="size-5" />
            </button>
          )}

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

      {/* Report Profile Dialog */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleReportSubmit}>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1 text-destructive">
                <ShieldAlert className="size-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Safety & Moderation</span>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Report {profile.fullName || "Member"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Help us keep YFJ Matrimony secure. Reports are reviewed strictly by our safety moderators.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Reason for Report
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="Fake Profile / Impersonation">Fake Profile / Impersonation</option>
                  <option value="Misleading Information / False Bio">Misleading Information / False Bio</option>
                  <option value="Harassment / Abusive Messages">Harassment / Abusive Messages</option>
                  <option value="Inappropriate Photos or Content">Inappropriate Photos or Content</option>
                  <option value="Financial Scam / Asking for Money">Financial Scam / Asking for Money</option>
                  <option value="Already Married or Ineligible">Already Married or Ineligible</option>
                  <option value="Other Policy Violation">Other Policy Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any specific context or examples to help our team investigate..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReportModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingReport}
                variant="destructive"
                className="text-xs gap-1.5"
              >
                <Flag className="size-3.5" />
                {submittingReport ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
