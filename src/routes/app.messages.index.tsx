import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { messagesService, subscriptionsService } from "@/services";
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
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function MessagesPage() {
  const [tab, setTab] = useState<"chats" | "requests">("chats");

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });
  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagesService.conversations(),
  });

  const canMessage = subscriptionQuery.data?.permissions.canMessage ?? false;

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-20">
      {/* Top Header matching Screen 6 */}
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Messages</h1>

      {/* Segmented Tabs: Chats & Requests (3) */}
      <div className="flex border-b border-border/80 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setTab("chats")}
          className={`flex-1 pb-3 text-center transition-all ${
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
          className={`flex-1 pb-3 text-center flex items-center justify-center gap-2 transition-all ${
            tab === "requests"
              ? "border-b-2 border-[#D92662] text-[#D92662] font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Requests</span>
          <span className="flex size-5 items-center justify-center rounded-full bg-[#D92662] text-[0.68rem] font-bold text-white">
            3
          </span>
        </button>
      </div>

      {/* Premium Feature Locked State matching Screen 6 */}
      {!canMessage ? (
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
            Unlock chats and start meaningful conversations with premium plan.
          </p>

          <div className="mt-8 w-full max-w-xs">
            <Button
              asChild
              size="lg"
              className="w-full h-14 rounded-2xl bg-[#D92662] hover:bg-[#C2185B] text-white font-bold text-base shadow-lg shadow-rose-950/20"
            >
              <Link to="/app/upgrade">View Plans</Link>
            </Button>
          </div>
        </div>
      ) : conversationsQuery.data?.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-sm">No conversations yet.</p>
          <Button asChild variant="outline" className="mt-4 rounded-full">
            <Link to="/app/browse">Explore Profiles</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-white shadow-card">
          {conversationsQuery.data?.map((conversation) => (
            <li key={conversation.id}>
              <Link
                to="/app/messages/$conversationId"
                params={{ conversationId: conversation.id }}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 transition-colors hover:bg-muted/60"
              >
                <img
                  src={conversation.participant.photos[0]}
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
                    {conversation.lastMessage}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTime(conversation.lastMessageAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
