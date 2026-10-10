import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Megaphone,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface BroadcastAnnouncement {
  id: string;
  title: string;
  body: string;
  cohort?: string;
  type?: string;
  is_active: boolean;
  created_at: string;
}

export function BroadcastAnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readingAnnouncement, setReadingAnnouncement] =
    useState<BroadcastAnnouncement | null>(null);

  const { data: broadcasts = [] } = useQuery<BroadcastAnnouncement[]>({
    queryKey: ["broadcasts", "active"],
    queryFn: () => api.get<BroadcastAnnouncement[]>("/broadcasts"),
    staleTime: 30 * 1000,
  });

  if (dismissed || !broadcasts || broadcasts.length === 0) {
    return null;
  }

  const current = broadcasts[currentIndex] || broadcasts[0]!;

  return (
    <>
      <aside
        aria-label="Community Broadcast Announcements"
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/30 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 p-4 sm:p-5 shadow-lg shadow-amber-950/15 text-white transition-all my-4"
      >
        {/* Ambient glow accent */}
        <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-amber-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Icon + Text Content */}
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-inner">
              <Megaphone className="size-5 text-amber-400 animate-bounce-slow" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                  <Sparkles className="size-2.5 text-amber-300" /> Platform Announcement
                </span>
                {broadcasts.length > 1 && (
                  <span className="text-[11px] text-stone-400 font-medium">
                    {currentIndex + 1} of {broadcasts.length}
                  </span>
                )}
              </div>

              <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                {current.title}
              </h3>

              <p className="text-xs sm:text-sm text-stone-300 line-clamp-1 leading-relaxed max-w-2xl font-normal">
                {current.body}
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {broadcasts.length > 1 && (
              <div className="flex items-center gap-1 mr-1">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex(
                      (prev) => (prev - 1 + broadcasts.length) % broadcasts.length,
                    )
                  }
                  className="rounded-full p-1.5 text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Previous announcement"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((prev) => (prev + 1) % broadcasts.length)
                  }
                  className="rounded-full p-1.5 text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Next announcement"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setReadingAnnouncement(current)}
              className="rounded-full border-amber-400/40 bg-white/5 hover:bg-white/15 text-amber-200 hover:text-white text-xs font-semibold px-4 cursor-pointer"
            >
              Read Details
            </Button>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-full p-1.5 text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss for this session"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Full Announcement Reading Modal */}
      {readingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Megaphone className="size-5" />
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-1">
                    Official Broadcast
                  </Badge>
                  <h4 className="font-display text-lg font-bold text-foreground">
                    {readingAnnouncement.title}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReadingAnnouncement(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4 border border-border/50 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {readingAnnouncement.body}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                Posted on{" "}
                {new Date(readingAnnouncement.created_at).toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}
              </span>
              <Button
                size="sm"
                onClick={() => setReadingAnnouncement(null)}
                className="rounded-full px-5"
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
