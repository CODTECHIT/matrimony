import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState, LoadingState } from "@/components/common/states";
import { messagesService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

export const Route = createFileRoute("/app/messages/$conversationId")({
  head: () => ({
    meta: [
      { title: "Conversation — YFJ Matrimony" },
      { name: "description", content: "Your private conversation with a YFJ Matrimony member." },
      { property: "og:title", content: "Conversation — YFJ Matrimony" },
      { property: "og:description", content: "Private chat with a verified member." },
    ],
  }),
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = useParams({ from: "/app/messages/$conversationId" });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagesService.conversations(),
  });
  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => messagesService.messages(conversationId),
  });

  // Realtime integration point: swap messagesService.subscribe's transport only.
  useEffect(() => {
    return messagesService.subscribe(conversationId, (message: Message) => {
      queryClient.setQueryData<Message[]>(["messages", conversationId], (prev) => [
        ...(prev ?? []),
        message,
      ]);
    });
  }, [conversationId, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messagesQuery.data]);

  const participant = conversationsQuery.data?.find((c) => c.id === conversationId)?.participant;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      await messagesService.send(conversationId, body);
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    } catch {
      toast.error("Message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (messagesQuery.isPending) return <LoadingState label="Loading conversation" />;
  if (messagesQuery.isError) {
    return <ErrorState onRetry={() => void messagesQuery.refetch()} />;
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card lg:h-[calc(100vh-10rem)]">
      <header className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 border-b border-border p-4">
        <Button asChild variant="ghost" size="icon" aria-label="Back to messages">
          <Link to="/app/messages">
            <ArrowLeft />
          </Link>
        </Button>
        {participant ? (
          <img
            src={participant.photos[0]}
            alt={participant.fullName}
            width={80}
            height={80}
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span />
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{participant?.fullName ?? "Conversation"}</p>
          <p className="text-xs text-muted-foreground">
            Messages are private and encrypted in transit
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messagesQuery.data.map((message) => {
          const mine = message.senderId === user?.id;
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                  mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground",
                )}
              >
                <p>{message.body}</p>
                <p
                  className={cn(
                    "mt-1 text-[0.65rem]",
                    mine ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {new Date(message.sentAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message"
          aria-label="Write a message"
          className="h-11 rounded-2xl"
          maxLength={1000}
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send message"
          disabled={sending || !draft.trim()}
        >
          <Send />
        </Button>
      </form>
    </div>
  );
}
