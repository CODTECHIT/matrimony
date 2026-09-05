import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { InterestList } from "@/components/profiles/InterestList";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { profilesService } from "@/services";

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
  const query = useQuery({
    queryKey: ["interests", "sent"],
    queryFn: () => profilesService.interestsSent(),
  });

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
        <InterestList interests={query.data ?? []} mode="sent" />
      )}
    </div>
  );
}
