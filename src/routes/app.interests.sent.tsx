import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { InterestList } from "@/components/profiles/InterestList";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { profilesService } from "@/services";
import type { Interest } from "@/types";

export const Route = createFileRoute("/app/interests/sent")({
  head: () => ({
    meta: [
      { title: "Interests sent — YFJ Matrimony" },
      {
        name: "description",
        content: "Track the interests you have sent and see which members have replied.",
      },
      { property: "og:title", content: "Interests sent — YFJ Matrimony" },
      { property: "og:description", content: "Every interest you have sent, with its status." },
    ],
  }),
  component: InterestsSentPage,
});

function InterestsSentPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["interests", "sent"],
    queryFn: () => profilesService.interestsSent(),
  });

  const handleUnfriend = async (interest: Interest) => {
    const name = interest.profile.fullName;
    if (!window.confirm(`Are you sure you want to unfriend ${name}? This will remove your connection.`)) {
      return;
    }
    try {
      await profilesService.deleteInterest(interest.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["interests"] }),
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
      ]);
      toast.success(`Unfriended ${name}.`);
    } catch {
      toast.error("Failed to unfriend.");
    }
  };

  const handleDelete = async (interest: Interest) => {
    try {
      await profilesService.deleteInterest(interest.id);
      await queryClient.invalidateQueries({ queryKey: ["interests"] });
      toast.info("Interest request cancelled.");
    } catch {
      toast.error("Failed to cancel request.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interests"
        title="Interests sent"
        description="Members you have expressed interest in."
      />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data?.length === 0 ? (
        <EmptyState
          icon={<Send className="size-6" />}
          title="You haven't sent any interests"
          description="Sending an interest is the first step to starting a conversation."
          action={
            <Button asChild>
              <Link to="/app/browse">Browse profiles</Link>
            </Button>
          }
        />
      ) : (
        <InterestList
          interests={query.data ?? []}
          mode="sent"
          onUnfriend={handleUnfriend}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
