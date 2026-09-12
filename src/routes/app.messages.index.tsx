import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Check, MessageSquare, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { messagesService, profilesService, subscriptionsService } from "@/services";
import { ListSkeleton, ErrorState } from "@/components/common/states";
import type { Interest } from "@/types";
import lockedChatImg from "@/assets/locked-chat.png";

export const Route = createFileRoute("/app/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — YFJ Matrimony" },
      {
        name: "description",
        content: "Chat privately with members who accepted your interest on YFJ Matrimony.",
      },
      { property: "og:title", content: "Messages — YFJ Matrimony" },
      { property: "og:description", content: "Private, secure conversations with your matches." },
    ],
  }),
  component: MessagesPage,
});

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function MessagesPage() {
  const [tab, setTab] = useState<"chats" | "requests">("chats");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagesService.conversations(),
    refetchInterval: 5000,
  });

  const requestsQuery = useQuery({
    queryKey: ["interests", "received"],
    queryFn: () => profilesService.interestsReceived(),
    refetchInterval: 5000,
  });

  const canMessage = subscriptionQuery.data?.permissions.canMessage ?? false;
  const requests = requestsQuery.data ?? [];
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const pendingCount = pendingRequests.length;

  const handleRespond = async (interest: Interest, action: "accept" | "decline") => {
    try {
      await profilesService.respondToInterest(interest.id, action);
      await queryClient.invalidateQueries({ queryKey: ["interests"] });
      if (action === "accept") {
        toast.success(`Accepted ${interest.profile.fullName}'s interest request.`);
      } else {
        toast.info("Interest declined.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update request");
    }
  };

  const handleStartChat = async (interest: Interest) => {
    try {
      const conv = await messagesService.start(
        interest.profile.id,
        interest.profile.fullName,
        interest.profile.photos,
      );
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void navigate({
        to: "/app/messages/$conversationId",
        params: { conversationId: conv.id },
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not open conversation");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Messages</h1>
        {!canMessage && (
          <Button asChild size="sm" variant="gold" className="rounded-full text-xs font-semibold">
            <Link to="/app/upgrade">
              <Sparkles className="size-3.5 mr-1" />
              Upgrade to Premium
            </Link>
          </Button>
        )}
      </div>

      {/* Segmented Tabs: Chats & Requests */}
      <div className="flex border-b border-border/80 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setTab("chats")}
          className={`flex-1 pb-3 text-center transition-all cursor-pointer ${
            tab === "chats"
              ? "border-b-2 border-[#D92662] text-[#D92662] font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Chats
        </button>
        <button
          type="button"
          onClick={() => setTab("requests")}
          className={`flex-1 pb-3 text-center flex items-center justify-center gap-2 transition-all cursor-pointer ${
            tab === "requests"
              ? "border-b-2 border-[#D92662] text-[#D92662] font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Requests</span>
          {pendingCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-[#D92662] text-[0.68rem] font-bold text-white animate-in zoom-in-50 duration-200">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* REQUESTS TAB */}
      {tab === "requests" && (
        <div className="space-y-4">
          {requestsQuery.isPending ? (
            <ListSkeleton />
          ) : requestsQuery.isError ? (
            <ErrorState onRetry={() => void requestsQuery.refetch()} />
          ) : requests.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-3">
              <p className="text-base font-medium">No connection requests yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                When other members express interest in getting in touch, their requests will appear
                here.
              </p>
              <Button asChild variant="outline" className="mt-2 rounded-full">
                <Link to="/app/browse">Explore Profiles</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {requests.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/30 transition-all"
                >
                  <Link
                    to="/app/profiles/$profileId"
                    params={{ profileId: item.profile.id }}
                    className="flex items-center gap-3.5 min-w-0"
                  >
                    <img
                      src={item.profile.photos[0] || "/placeholder.jpg"}
                      alt={item.profile.fullName}
                      className="size-14 rounded-full object-cover border border-border shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-display text-base font-bold text-foreground">
                          {item.profile.fullName}, {item.profile.age}
                        </span>
                        {item.profile.verified && (
                          <BadgeCheck className="size-4 shrink-0 text-primary" />
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {item.profile.occupation || "Member"} · {item.profile.city || "India"}
                      </p>
                      <span className="text-[0.7rem] text-muted-foreground/80 mt-1 block">
                        Received {formatDate(item.sentAt)}
                      </span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {item.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="neutral"
                          onClick={() => handleRespond(item, "decline")}
                          className="rounded-full text-xs h-8 px-3"
                        >
                          <X className="size-3.5 mr-1" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRespond(item, "accept")}
                          className="rounded-full text-xs h-8 px-3.5 bg-[#D92662] hover:bg-[#C2185B] text-white"
                        >
                          <Check className="size-3.5 mr-1" />
                          Accept
                        </Button>
                      </>
                    ) : item.status === "accepted" ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          Accepted
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleStartChat(item)}
                          className="rounded-full text-xs h-8 px-3.5 bg-[#D92662] hover:bg-[#C2185B] text-white"
                        >
                          <MessageSquare className="size-3.5 mr-1" />
                          Message
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Declined
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* CHATS TAB */}
      {tab === "chats" && (
        <div className="space-y-4">
          {/* Subscribed or Free user with existing conversations */}
          {conversationsQuery.data && conversationsQuery.data.length > 0 ? (
            <>
              {!canMessage && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/25 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                  <span>Upgrade to Premium to send unlimited messages & contact unlocks.</span>
                  <Button asChild size="sm" variant="gold" className="shrink-0 text-xs h-7 px-2.5">
                    <Link to="/app/upgrade">Upgrade</Link>
                  </Button>
                </div>
              )}
              <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card shadow-card">
                {conversationsQuery.data.map((conversation) => (
                  <li key={conversation.id}>
                    <Link
                      to="/app/messages/$conversationId"
                      params={{ conversationId: conversation.id }}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 transition-colors hover:bg-muted/60"
                    >
                      <img
                        src={conversation.participant.photos[0] || "/placeholder.jpg"}
                        alt={conversation.participant.fullName}
                        loading="lazy"
                        width={56}
                        height={56}
                        className="size-14 rounded-full object-cover border border-border"
                      />
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-foreground">
                          {conversation.participant.fullName}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                          {conversation.lastMessage || "No messages yet"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-muted-foreground block">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#D92662] text-[0.65rem] font-bold text-white mt-1">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : !canMessage ? (
            /* Free user with no conversations -> Lock Screen Prompt */
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="relative mb-6">
                <img
                  src={lockedChatImg}
                  alt="Locked Chat Feature"
                  className="size-48 sm:size-56 object-contain drop-shadow-md"
                />
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Premium Feature
              </h2>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
                Unlock direct messaging and start meaningful conversations with a premium plan.
              </p>

              <div className="mt-8 w-full max-w-xs">
                <Button
                  asChild
                  size="lg"
                  className="w-full h-14 rounded-2xl bg-[#D92662] hover:bg-[#C2185B] text-white font-bold text-base shadow-lg shadow-rose-950/20 cursor-pointer"
                >
                  <Link to="/app/upgrade">View Plans</Link>
                </Button>
              </div>
            </div>
          ) : (
            /* Premium user with 0 conversations */
            <div className="py-16 text-center text-muted-foreground space-y-3">
              <p className="text-base font-medium">No active conversations yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                When you connect with matches or accept requests, your chats will appear here.
              </p>
              <Button asChild variant="outline" className="mt-2 rounded-full">
                <Link to="/app/browse">Explore Profiles</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
