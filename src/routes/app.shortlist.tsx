import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { EmptyState, ErrorState, ProfileCardSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { profilesService } from "@/services";
import type { Profile } from "@/types";

export const Route = createFileRoute("/app/shortlist")({
  head: () => ({
    meta: [
      { title: "Shortlisted profiles — YFJ Matrimony" },
      {
        name: "description",
        content: "Every profile you and your family have shortlisted, kept in one private list.",
      },
      { property: "og:title", content: "Shortlisted profiles — YFJ Matrimony" },
      { property: "og:description", content: "Your private shortlist of favourite profiles." },
    ],
  }),
  component: ShortlistPage,
});

function ShortlistPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["profiles", "shortlisted"],
    queryFn: () => profilesService.shortlisted(),
  });

  const handleShortlist = async (profile: Profile) => {
    await profilesService.toggleShortlist(profile.id);
    await queryClient.invalidateQueries({ queryKey: ["profiles"] });
    toast.success("Removed from shortlist");
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden min-w-0">
      <PageHeader
        eyebrow="Saved"
        title="Shortlisted profiles"
        description="Profiles you have saved to review with your family."
      />

      {query.isPending ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 w-full max-w-full min-w-0">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProfileCardSkeleton key={index} />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data?.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-6" />}
          title="No shortlisted profiles yet"
          description="Tap the heart on any profile to save it here."
          action={
            <Button asChild>
              <Link to="/app/browse">Browse profiles</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 w-full max-w-full min-w-0">
          {query.data?.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} onShortlist={handleShortlist} />
          ))}
        </div>
      )}
    </div>
  );
}
