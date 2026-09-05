import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { InterestList } from "@/components/profiles/InterestList";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { profilesService } from "@/services";
import type { Interest } from "@/types";

export const Route = createFileRoute("/app/interests/received")({
  head: () => ({
    meta: [
      { title: "Interests received — YFJ Matrimony" },
      {
        name: "description",
        content: "Review the members who have expressed interest in your profile and reply.",
      },
      { property: "og:title", content: "Interests received — YFJ Matrimony" },
      { property: "og:description", content: "Accept or decline the interests you receive." },
    ],
  }),
  component: InterestsReceivedPage,
});

function InterestsReceivedPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["interests", "received"],
    queryFn: () => profilesService.interestsReceived(),
  });

  const respond = async (interest: Interest, action: "accept" | "decline") => {
    await profilesService.respondToInterest(interest.id, action);
    await queryClient.invalidateQueries({ queryKey: ["interests"] });
    toast.success(
      action === "accept"
        ? `You accepted ${interest.profile.fullName.split(" ")[0]}'s interest`
        : "Interest declined",
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interests"
        title="Interests received"
        description="Members who would like to connect with you."
      />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data?.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" />}
          title="No interests yet"
          description="A complete profile with photos receives far more interests."
          action={
            <Button asChild>
              <Link to="/app/my-profile/edit">Complete your profile</Link>
            </Button>
          }
        />
      ) : (
        <InterestList interests={query.data ?? []} mode="received" onRespond={respond} />
      )}
    </div>
  );
}
