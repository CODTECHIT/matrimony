import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCheck, MoreVertical, Paperclip, Search, Send, Smile } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchSidebar, setSearchSidebar] = useState("");
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
      setShowEmojiPicker(false);
      await queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    } catch {
      toast.error("Message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleQuickEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
  };

  if (messagesQuery.isPending) return <LoadingState label="Loading conversation" />;
  if (messagesQuery.isError) {
    return <ErrorState onRetry={() => void messagesQuery.refetch()} />;
  }

  const quickEmojis = ["❤️", "😊", "🌹", "💍", "👋", "✨", "🙏", "👍"];

  const filteredConversations = conversationsQuery.data?.filter((c) =>
    c.participant.fullName.toLowerCase().includes(searchSidebar.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-9.5rem)] overflow-hidden rounded-3xl border border-border bg-card shadow-card w-full max-w-full min-w-0">
      {/* Desktop Sidebar: Conversation list matching enhanced desktop view */}
      <aside className="hidden md:flex w-80 shrink-0 flex-col border-r border-border/80 bg-card">
        <div className="p-4 border-b border-border/70 space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">Conversations</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchSidebar}
              onChange={(e) => setSearchSidebar(e.target.value)}
              placeholder="Search matches"
              className="h-9 rounded-xl pl-9 text-xs border-border"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {filteredConversations?.map((conv) => {
            const isActive = conv.id === conversationId;
            return (
              <Link
                key={conv.id}
                to="/app/messages/$conversationId"
                params={{ conversationId: conv.id }}
                className={cn(
                  "flex items-center gap-3 p-3.5 transition-colors hover:bg-muted/60",
                  isActive && "bg-rose-50/70 dark:bg-rose-950/25 font-semibold",
                )}
              >
                <div className="relative shrink-0">
                  <img
                    src={conv.participant.photos[0]}
                    alt={conv.participant.fullName}
                    className="size-11 rounded-full object-cover border border-border"
                  />
                  <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {conv.participant.fullName}
                    </p>
                    <span className="text-[0.65rem] text-muted-foreground">
                      {new Date(conv.lastMessageAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    {conv.lastMessage}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Chat Interface matching Image 5 Phone 1 */}
      <div className="flex flex-1 min-w-0 flex-col bg-[#FFF5F8]/60 dark:bg-stone-950/60">
        {/* Header matching Image 5 Phone 1 */}
        <header className="flex items-center justify-between border-b border-border/80 bg-white/95 dark:bg-card/95 backdrop-blur-md px-3 sm:px-5 py-2.5 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Back to messages"
              className="size-9 rounded-xl md:hidden"
            >
              <Link to="/app/messages">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>

            {participant ? (
              <div className="relative shrink-0">
                <img
                  src={participant.photos[0]}
                  alt={participant.fullName}
                  width={80}
                  height={80}
                  className="size-10 sm:size-11 rounded-full object-cover border border-border"
                />
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-stone-900" />
              </div>
            ) : null}

            <div className="min-w-0">
              <p className="truncate font-sans text-sm sm:text-base font-bold text-foreground">
                {participant?.fullName ?? "Conversation"}
              </p>
              <p className="text-[0.68rem] text-emerald-600 dark:text-emerald-400 font-medium">
                Online now
              </p>
            </div>
          </div>

          {/* Header Right Actions: Menu options (only chat, no audio/video) */}
          <div className="flex items-center gap-1 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="More options"
                >
                  <MoreVertical className="size-4.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 shadow-lg">
                {participant ? (
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                    <Link to="/app/profiles/$profileId" params={{ profileId: participant.id }}>
                      View Full Profile
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => toast.info("Notifications muted for 8 hours")}
                  className="rounded-xl cursor-pointer"
                >
                  Mute Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => toast.success("Chat history cleared")}
                  className="rounded-xl cursor-pointer text-destructive focus:text-destructive"
                >
                  Clear Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Messages Body with soft romantic background and Image 5 bubbles */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5 relative">
          {/* Soft decorative date pill */}
          <div className="flex justify-center my-2">
            <span className="rounded-full bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200/50 px-3.5 py-1 text-[0.65rem] font-semibold text-rose-900/80 dark:text-rose-300 shadow-2xs">
              Today
            </span>
          </div>

          {messagesQuery.data.map((message) => {
            const mine = message.senderId === user?.id;
            return (
              <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[82%] sm:max-w-[70%] px-4 py-2.5 text-sm transition-all shadow-xs",
                    mine
                      ? "rounded-2xl rounded-tr-xs bg-gradient-to-r from-[#B81D53] to-[#8E103E] text-white shadow-rose-950/10"
                      : "rounded-2xl rounded-tl-xs bg-white dark:bg-card border border-rose-100/80 dark:border-border text-foreground shadow-2xs",
                  )}
                >
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
                  <div
                    className={cn(
                      "mt-1 flex items-center justify-end gap-1 text-[0.65rem]",
                      mine ? "text-rose-100/90" : "text-muted-foreground",
                    )}
                  >
                    <span>
                      {new Date(message.sentAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {mine ? <CheckCheck className="size-3.5 text-rose-200 stroke-[2.5]" /> : null}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Quick Emoji Bar when triggered */}
        {showEmojiPicker ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-white/95 dark:bg-card/95 border-t border-rose-100/80 shadow-inner">
            <span className="text-xs text-muted-foreground mr-1">Quick:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {quickEmojis.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => handleQuickEmoji(em)}
                  className="size-8 rounded-full hover:bg-rose-100/60 dark:hover:bg-rose-950/50 flex items-center justify-center text-base transition-transform active:scale-125 cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Floating Pill Input Bar matching Image 5 Phone 1 */}
        <div className="p-3 sm:p-4 bg-transparent shrink-0">
          <form
            onSubmit={submit}
            className="flex items-center gap-2 rounded-full border border-rose-200/90 dark:border-rose-900/40 bg-white/95 dark:bg-card/95 p-1.5 pl-3 shadow-md shadow-rose-950/5 backdrop-blur-md"
          >
            {/* Emoji Smiley Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-primary hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              aria-label="Insert emoji"
            >
              <Smile className="size-5.5 text-muted-foreground" />
            </button>

            {/* Text Input */}
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
              aria-label="Type a message"
              className="h-10 flex-1 min-w-0 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              maxLength={1000}
            />

            {/* Attachment Paperclip Button */}
            <button
              type="button"
              onClick={() => toast.info("Attach photo or biodata")}
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-primary hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              aria-label="Attach file"
            >
              <Paperclip className="size-5 text-muted-foreground -rotate-45" />
            </button>

            {/* Circular Magenta Send Button matching Image 5 */}
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#D92662] to-[#B81D53] text-white shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
              )}
              aria-label="Send message"
            >
              <Send className="size-4.5 translate-x-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
