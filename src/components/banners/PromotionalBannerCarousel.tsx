import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import heroHands from "@/assets/hero-hands.jpg";

export interface ActiveBanner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  button_text?: string;
  button_link?: string;
  is_active: boolean;
}

export interface BroadcastAnnouncement {
  id: string;
  title: string;
  body: string;
  cohort?: string;
  type?: string;
  is_active: boolean;
  created_at: string;
}

export interface BannerSlide {
  id: string;
  kind: "banner" | "broadcast";
  title: string;
  description?: string | undefined;
  imageUrl: string;
  badgeText: string;
  buttonText: string;
  buttonLink?: string | undefined;
  broadcast?: BroadcastAnnouncement | undefined;
}

export function PromotionalBannerCarousel({
  fallback,
}: {
  fallback?: React.ReactNode;
} = {}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [readingAnnouncement, setReadingAnnouncement] =
    useState<BroadcastAnnouncement | null>(null);

  const { data: banners = [] } = useQuery<ActiveBanner[]>({
    queryKey: ["banners", "active"],
    queryFn: () => api.get<ActiveBanner[]>("/banners"),
    staleTime: 60 * 1000,
  });

  const { data: broadcasts = [] } = useQuery<BroadcastAnnouncement[]>({
    queryKey: ["broadcasts", "active"],
    queryFn: () => api.get<BroadcastAnnouncement[]>("/broadcasts"),
    staleTime: 30 * 1000,
  });

  // Combine broadcast announcements and promotional banners into one unified image-carousel
  const slides: BannerSlide[] = [
    ...broadcasts.map((bc) => ({
      id: `broadcast-${bc.id}`,
      kind: "broadcast" as const,
      title: bc.title,
      description: bc.body,
      imageUrl: heroHands,
      badgeText: "Platform Announcement",
      buttonText: "Read Details",
      buttonLink: undefined,
      broadcast: bc,
    })),
    ...banners.map((b) => ({
      id: `banner-${b.id}`,
      kind: "banner" as const,
      title: b.title,
      description: b.description,
      imageUrl: b.image_url || heroHands,
      badgeText: "Featured Offer",
      buttonText: b.button_text || "Explore Matches",
      buttonLink: b.button_link || "/app/browse",
    })),
  ];

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  if (slides.length === 0) {
    return fallback ? <>{fallback}</> : null;
  }

  const safeIndex = currentIndex >= slides.length ? 0 : currentIndex;
  const current = slides[safeIndex] || slides[0]!;

  return (
    <>
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] min-h-[195px] sm:min-h-[235px] shadow-xl shadow-stone-950/20 flex items-center bg-stone-950 w-full max-w-full transition-all border border-border/40 group"
      >
        {/* Background Banner Image */}
        <img
          src={current.imageUrl}
          alt={current.title}
          key={current.id}
          className="absolute inset-0 w-full h-full object-cover object-[75%_center] transition-opacity duration-700 animate-in fade-in"
        />

        {/* Cinematic dark scrim: keeps photo clear while guaranteeing 100% text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 from-20% via-stone-950/70 via-50% to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-transparent to-transparent pointer-events-none" />

        {/* Banner Content */}
        <div className="relative z-10 p-5 sm:p-8 max-w-[85%] sm:max-w-xl space-y-2.5 sm:space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-stone-900/85 px-3 py-1 text-[0.68rem] sm:text-xs font-bold text-amber-300 uppercase tracking-wider backdrop-blur-md shadow-xs">
            {current.kind === "broadcast" ? (
              <Megaphone className="size-3 text-amber-300" />
            ) : (
              <Sparkles className="size-3 text-amber-300" />
            )}
            {current.badgeText}
            {slides.length > 1 && (
              <span className="text-amber-200/70 text-[10px] ml-1 font-normal lowercase">
                ({safeIndex + 1} of {slides.length})
              </span>
            )}
          </span>

          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight drop-shadow-md">
            {current.title}
          </h2>

          {current.description && (
            <p className="text-xs sm:text-sm text-stone-200 line-clamp-2 leading-relaxed font-normal drop-shadow-xs max-w-md">
              {current.description}
            </p>
          )}

          <div className="pt-1">
            {current.kind === "broadcast" && current.broadcast ? (
              <Button
                size="sm"
                onClick={() => setReadingAnnouncement(current.broadcast!)}
                className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold px-6 shadow-md shadow-amber-950/25 transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
              >
                {current.buttonText}
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                className="rounded-full bg-primary hover:bg-primary/90 text-white font-bold px-6 shadow-md shadow-primary/25 transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
              >
                <Link to={current.buttonLink || "/app/browse"}>
                  {current.buttonText}
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Multi-banner Navigation Controls */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 right-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            <button
              type="button"
              onClick={() =>
                setCurrentIndex(
                  (prev) => (prev - 1 + slides.length) % slides.length,
                )
              }
              aria-label="Previous banner"
              className="text-white/80 hover:text-white p-0.5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
            </button>

            <div className="flex gap-1 items-center">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`size-1.5 rounded-full transition-all cursor-pointer ${
                    idx === safeIndex ? "w-4 bg-amber-400" : "bg-white/40"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setCurrentIndex((prev) => (prev + 1) % slides.length)
              }
              aria-label="Next banner"
              className="text-white/80 hover:text-white p-0.5 transition-colors cursor-pointer"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* Full Announcement Reading Modal */}
      {readingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-stone-900 p-6 shadow-2xl space-y-4 text-stone-100">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/20 p-2.5 text-amber-300 border border-amber-400/30">
                  <Megaphone className="size-5" />
                </div>
                <div>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wider mb-1 border-amber-400/40 text-amber-300 bg-amber-500/10"
                  >
                    Official Announcement
                  </Badge>
                  <h4 className="font-display text-lg font-bold text-white">
                    {readingAnnouncement.title}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReadingAnnouncement(null)}
                className="rounded-full p-1 text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-black/40 p-4 border border-white/5 text-sm leading-relaxed text-stone-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {readingAnnouncement.body}
            </div>

            <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
              <span>
                Posted on{" "}
                {new Date(readingAnnouncement.created_at).toLocaleDateString(
                  "en-IN",
                  {
                    dateStyle: "medium",
                  },
                )}
              </span>
              <Button
                size="sm"
                onClick={() => setReadingAnnouncement(null)}
                className="rounded-full px-5 bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
