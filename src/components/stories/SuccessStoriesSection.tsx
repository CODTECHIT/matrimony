import { useQuery } from "@tanstack/react-query";
import { Heart, Quote, Calendar, Sparkles } from "lucide-react";
import { api } from "@/lib/api-client";

export interface SuccessStoryItem {
  id: string;
  couple_name: string;
  photo_url?: string;
  story: string;
  marriage_date?: string;
  is_published: boolean;
  created_at: string;
}

export function SuccessStoriesSection() {
  const { data: stories = [], isLoading } = useQuery<SuccessStoryItem[]>({
    queryKey: ["success-stories", "published"],
    queryFn: () => api.get<SuccessStoryItem[]>("/success-stories"),
    staleTime: 60 * 1000,
  });

  if (!isLoading && stories.length === 0) {
    return null;
  }

  return (
    <section className="bg-surface/60 py-16 sm:py-24 border-y border-border/80">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400 mb-3">
            <Sparkles className="size-3.5" />
            <span>Real Weddings, Real Joy</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground">
            YFJ Matrimony Success Stories
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Read inspiring journeys of happy couples who found their life partner through our platform.
          </p>
          <div className="mt-3.5 mx-auto h-0.5 w-16 bg-gradient-to-r from-primary to-amber-500 rounded-full" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-3xl bg-muted/60 animate-pulse border border-border"
              />
            ))
          ) : (
            stories.map((story) => (
              <article
                key={story.id}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/60 hover:shadow-raised"
              >
                {/* Couple Image with warm gradient overlay */}
                <div className="relative h-56 w-full overflow-hidden bg-stone-900">
                  <img
                    src={
                      story.photo_url ||
                      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800"
                    }
                    alt={story.couple_name}
                    className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                    <h3 className="font-display text-xl font-bold tracking-wide drop-shadow-sm flex items-center gap-1.5">
                      <Heart className="size-4 fill-rose-500 text-rose-500 shrink-0" />
                      {story.couple_name}
                    </h3>
                    {story.marriage_date && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-200/90 bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        <Calendar className="size-3" />
                        {new Date(story.marriage_date).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Testimonial Quote */}
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div className="relative">
                    <Quote className="size-6 text-amber-500/25 mb-1 -ml-1" />
                    <p className="text-sm text-foreground/80 leading-relaxed italic">
                      "{story.story}"
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">Happily Married</span>
                    <span>Matched on YFJ</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
