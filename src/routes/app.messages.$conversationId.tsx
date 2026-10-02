import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCheck,
  Lock,
  Maximize2,
  Minimize2,
  MoreVertical,
  Search,
  Send,
  Smile,
  Sparkles,
  Trash2,
  UserMinus,
} from "lucide-react";
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
import { messagesService, profilesService, subscriptionsService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { Conversation, Message } from "@/types";
import { getProfileAvatar, handleImageError } from "@/lib/images";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchSidebar, setSearchSidebar] = useState("");
  const [isDesktopFullscreen, setIsDesktopFullscreen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Close desktop fullscreen on Escape key
  useEffect(() => {
    if (!isDesktopFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDesktopFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDesktopFullscreen]);

  // FIX 4: Fetch subscription to check canMessage permission
  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => subscriptionsService.current(),
  });

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagesService.conversations(),
    refetchInterval: 8000,
  });
  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => messagesService.messages(conversationId),
    refetchInterval: 3000,
  });

  // Realtime integration point: swap messagesService.subscribe's transport only.
  useEffect(() => {
    return messagesService.subscribe(conversationId, (message: Message) => {
      queryClient.setQueryData<Message[]>(["messages", conversationId], (prev) => {
        if (!prev) return [message];
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Update conversations list preview snippet in real-time
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return old;
        return old.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastMessage: message.body,
              lastMessageAt: message.sentAt,
            };
          }
          return conv;
        });
      });
    });
  }, [conversationId, queryClient]);

  // Guaranteed single-instance deduplication of messages by unique database ID
  const messages = useMemo(() => {
    const raw = messagesQuery.data ?? [];
    const seen = new Set<string>();
    const unique: Message[] = [];
    for (const msg of raw) {
      if (!seen.has(msg.id)) {
        seen.add(msg.id);
        unique.push(msg);
      }
    }
    return unique;
  }, [messagesQuery.data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

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

  const handleClearChat = async () => {
    if (!window.confirm("Are you sure you want to clear this chat history?")) return;
    try {
      await messagesService.clearConversation(conversationId);
      await queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Chat history cleared.");
    } catch {
      toast.error("Failed to clear chat history.");
    }
  };

  const handleDeleteConversation = async () => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this conversation and all its messages?",
      )
    ) {
      return;
    }
    try {
      await messagesService.deleteConversation(conversationId);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation deleted.");
      void navigate({ to: "/app/messages" });
    } catch {
      toast.error("Failed to delete conversation.");
    }
  };

  const handleUnfriend = async () => {
    if (!participant) return;
    if (
      !window.confirm(
        `Are you sure you want to unfriend ${participant.fullName}? This will disconnect your match and delete your conversation.`,
      )
    ) {
      return;
    }
    try {
      await profilesService.unfriend(participant.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["interests"] }),
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["profiles"] }),
      ]);
      toast.success(`Unfriended ${participant.fullName}. Connection removed.`);
      void navigate({ to: "/app/messages" });
    } catch {
      toast.error("Failed to unfriend.");
    }
  };

  if (messagesQuery.isPending) return <LoadingState label="Loading conversation" />;
  if (messagesQuery.isError) {
    return <ErrorState onRetry={() => void messagesQuery.refetch()} />;
  }

  // FIX 4: Block access if user doesn't have messaging permission (closes URL bypass)
  const canMessage = subscriptionQuery.data?.permissions.canMessage ?? true;
  if (!canMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 space-y-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40">
          <Lock className="size-8 text-[#D92662]" />
        </span>
        <h2 className="font-display text-xl font-bold text-foreground">Premium Feature</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Direct messaging is available on Silver, Gold and Platinum plans. Upgrade to start chatting with your matches.
        </p>
        <Button asChild className="rounded-full bg-[#D92662] hover:bg-[#C2185B] text-white font-bold px-8">
          <Link to="/app/upgrade">
            <Sparkles className="size-4 mr-1.5" /> Upgrade to Premium
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/app/messages">← Back to Messages</Link>
        </Button>
      </div>
    );
  }

  const quickEmojis = ["❤️", "😊", "🌹", "💍", "👋", "✨", "🙏", "👍"];

  const filteredConversations = conversationsQuery.data?.filter((c) =>
    c.participant.fullName.toLowerCase().includes(searchSidebar.toLowerCase()),
  );

  return (
    <div
      className={cn(
        "flex overflow-hidden bg-card w-full max-w-full min-w-0 transition-all",
        isDesktopFullscreen
          ? "fixed inset-0 z-50 h-[100dvh] w-screen rounded-none border-0 shadow-none"
          : "fixed inset-0 z-30 h-[100dvh] w-screen rounded-none border-0 shadow-none md:relative md:inset-auto md:z-auto md:h-[calc(100dvh-5.5rem)] lg:h-[calc(100dvh-6.5rem)] md:rounded-3xl md:border md:border-border md:shadow-card",
      )}
    >
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
                    src={getProfileAvatar(conv.participant.photos?.[0])}
                    alt={conv.participant.fullName}
                    onError={(e) => handleImageError(e)}
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
      <div className="flex flex-1 min-w-0 flex-col bg-[#FFF5F8]/60 dark:bg-stone-950/60 h-full">
        {/* Header matching Image 5 Phone 1 */}
        <header className="flex items-center justify-between border-b border-border/80 bg-white/95 dark:bg-card/95 backdrop-blur-md px-3 sm:px-5 py-2.5 shrink-0 shadow-2xs pt-[calc(0.625rem+env(safe-area-inset-top,0px))]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {isDesktopFullscreen ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Exit full screen"
                onClick={() => setIsDesktopFullscreen(false)}
                className="size-9 rounded-xl cursor-pointer"
                title="Exit full screen (Esc)"
              >
                <ArrowLeft className="size-5" />
              </Button>
            ) : (
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Back to messages"
                className="size-9 rounded-xl md:hidden cursor-pointer"
              >
                <Link to="/app/messages">
                  <ArrowLeft className="size-5" />
                </Link>
              </Button>
            )}

            {participant ? (
              <Link
                to="/app/profiles/$profileId"
                params={{ profileId: participant.displayId || participant.id }}
                className="relative shrink-0 block hover:opacity-90 transition-opacity"
              >
                <img
                  src={getProfileAvatar(participant.photos?.[0])}
                  alt={participant.fullName}
                  width={80}
                  height={80}
                  onError={(e) => handleImageError(e)}
                  className="size-10 sm:size-11 rounded-full object-cover border border-border"
                />
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-stone-900" />
              </Link>
            ) : null}

            <div className="min-w-0">
              <Link
                to="/app/profiles/$profileId"
                params={{ profileId: participant?.displayId || participant?.id || "" }}
                className="truncate font-sans text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors block"
              >
                {participant?.fullName ?? "Conversation"}
              </Link>
              <p className="text-[0.68rem] text-emerald-600 dark:text-emerald-400 font-medium">
                Online now
              </p>
            </div>
          </div>

          {/* Header Right Actions: Full screen toggle and menu options */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDesktopFullscreen((prev) => !prev)}
              className="hidden md:grid size-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              title={isDesktopFullscreen ? "Exit full screen (Esc)" : "Full screen"}
              aria-label={isDesktopFullscreen ? "Exit full screen" : "Full screen"}
            >
              {isDesktopFullscreen ? (
                <Minimize2 className="size-4.5" />
              ) : (
                <Maximize2 className="size-4.5" />
              )}
            </Button>

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
              <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-lg">
                {participant ? (
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                    <Link to="/app/profiles/$profileId" params={{ profileId: participant.displayId || participant.id }}>
                      View Full Profile
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => setIsDesktopFullscreen((prev) => !prev)}
                  className="hidden md:flex rounded-xl cursor-pointer items-center gap-2"
                >
                  {isDesktopFullscreen ? (
                    <>
                      <Minimize2 className="size-4" />
                      <span>Exit Full Screen</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="size-4" />
                      <span>Full Screen</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toast.info("Notifications muted for 8 hours")}
                  className="rounded-xl cursor-pointer"
                >
                  Mute Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleClearChat}
                  className="rounded-xl cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  Clear Chat
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDeleteConversation}
                  className="rounded-xl cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
                >
                  <Trash2 className="size-4" />
                  Delete Conversation
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleUnfriend}
                  className="rounded-xl cursor-pointer text-destructive focus:text-destructive flex items-center gap-2 font-semibold"
                >
                  <UserMinus className="size-4" />
                  Unfriend & Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Messages Body with soft romantic background and Image 5 bubbles */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5 relative">
          {/* Love watermarks — decorative, non-interactive */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden="true">
            <span className="absolute top-[8%] left-[7%] text-5xl opacity-[0.06] rotate-[-15deg]">❤️</span>
            <span className="absolute top-[18%] right-[9%] text-4xl opacity-[0.07] rotate-[12deg]">💕</span>
            <span className="absolute top-[35%] left-[15%] text-3xl opacity-[0.05] rotate-[-8deg]">🌹</span>
            <span className="absolute top-[30%] right-[20%] text-6xl opacity-[0.05] rotate-[20deg]">❤️</span>
            <span className="absolute top-[52%] left-[5%] text-4xl opacity-[0.06] rotate-[10deg]">💖</span>
            <span className="absolute top-[55%] right-[6%] text-3xl opacity-[0.07] rotate-[-18deg]">💕</span>
            <span className="absolute top-[70%] left-[22%] text-5xl opacity-[0.05] rotate-[-5deg]">🌹</span>
            <span className="absolute top-[72%] right-[15%] text-4xl opacity-[0.06] rotate-[14deg]">💖</span>
            <span className="absolute top-[88%] left-[10%] text-3xl opacity-[0.07] rotate-[-20deg]">❤️</span>
            <span className="absolute top-[85%] right-[8%] text-5xl opacity-[0.05] rotate-[8deg]">💕</span>
          </div>

          {/* Soft decorative date pill */}
          <div className="flex justify-center my-2">
            <span className="rounded-full bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200/50 px-3.5 py-1 text-[0.65rem] font-semibold text-rose-900/80 dark:text-rose-300 shadow-2xs">
              Today
            </span>
          </div>

          {messages.map((message) => {
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
        <div className="p-2.5 sm:p-3.5 bg-white/95 dark:bg-card/95 backdrop-blur-md border-t border-rose-100/70 dark:border-border/60 shrink-0 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]">
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
