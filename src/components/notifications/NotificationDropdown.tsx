import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Headset,
  Heart,
  Megaphone,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { notificationsService, type NotificationItem } from "@/services/notifications.service";
import { realtimeClient } from "@/lib/realtime";
import { tokenStore } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SupportTicketModal } from "@/components/support/SupportTicketModal";

interface GroupedMessageNotification {
  type: "grouped_chat";
  key: string;
  senderName: string;
  senderAvatar?: string;
  senderId?: string | undefined;
  conversationId: string;
  items: NotificationItem[];
  unreadCount: number;
  latestItem: NotificationItem;
  createdAt: string;
}

interface SingleNotificationGroup {
  type: "single";
  key: string;
  item: NotificationItem;
  createdAt: string;
}

type NotificationRow = GroupedMessageNotification | SingleNotificationGroup;

function formatRelativeTime(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSec < 60) return "Just now";
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationDropdown() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<NotificationItem | null>(null);
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsService.list(),
    refetchInterval: 15000,
    enabled: typeof window !== "undefined" && Boolean(tokenStore.getUserToken()),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markSingleMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markMultipleMutation = useMutation({
    mutationFn: (ids: string[]) => notificationsService.markMultipleAsRead(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => notificationsService.clearAll(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Listen for real-time notifications over WebSocket
  useEffect(() => {
    const unsubNotif = realtimeClient.on("notification:new", () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    const unsubInterest = realtimeClient.on("interest:received", () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["interests", "received"] });
    });
    const unsubAccepted = realtimeClient.on("interest:accepted", () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });

    return () => {
      unsubNotif();
      unsubInterest();
      unsubAccepted();
    };
  }, [queryClient]);

  const rawNotifications = query.data?.notifications || [];
  const unreadCount = query.data?.unreadCount || 0;

  // Group similar chat message notifications by sender/conversation
  const groupedNotifications = useMemo<NotificationRow[]>(() => {
    const groups: NotificationRow[] = [];
    const chatMap = new Map<string, GroupedMessageNotification>();

    for (const item of rawNotifications) {
      if (item.type === "chat_message") {
        // Group by conversation ID or sender ID
        const senderKey =
          (item.data?.["conversationId"] as string | undefined) ||
          (item.data?.["senderId"] as string | undefined) ||
          item.title?.replace(/^New message from\s+/i, "").trim() ||
          item.id;

        const senderName =
          (item.data?.["senderName"] as string | undefined) ||
          item.title?.replace(/^New message from\s+/i, "").trim() ||
          "Member";

        const senderAvatar = (item.data?.["senderAvatar"] as string | undefined) || "";
        const convId = (item.data?.["conversationId"] as string | undefined) || "";

        if (!chatMap.has(senderKey)) {
          const newGroup: GroupedMessageNotification = {
            type: "grouped_chat",
            key: `chat-${senderKey}`,
            senderName,
            senderAvatar,
            senderId: item.data?.["senderId"] as string | undefined,
            conversationId: convId,
            items: [item],
            unreadCount: item.isRead ? 0 : 1,
            latestItem: item,
            createdAt: item.createdAt,
          };
          chatMap.set(senderKey, newGroup);
          groups.push(newGroup);
        } else {
          const existing = chatMap.get(senderKey)!;
          existing.items.push(item);
          if (!item.isRead) {
            existing.unreadCount += 1;
          }
          // The list is sorted newest first, so the first one seen is the latest
        }
      } else {
        groups.push({
          type: "single",
          key: `single-${item.id}`,
          item,
          createdAt: item.createdAt,
        });
      }
    }

    return groups;
  }, [rawNotifications]);

  const handleClickSingleNotification = (item: NotificationItem) => {
    if (!item.isRead) {
      markSingleMutation.mutate(item.id);
    }

    const conversationId = item.data?.["conversationId"] as string | undefined;

    if (item.type === "chat_message" && conversationId) {
      void navigate({
        to: "/app/messages/$conversationId",
        params: { conversationId },
      });
    } else if (item.type === "interest_received") {
      void navigate({ to: "/app/interests/received" });
    } else if (item.type === "interest_accepted" && conversationId) {
      void navigate({
        to: "/app/messages/$conversationId",
        params: { conversationId },
      });
    } else if (
      (item.type as string) === "verification" ||
      (item.type as string) === "verification_approved" ||
      (item.type as string) === "verification_rejected"
    ) {
      void navigate({ to: "/app/my-profile" });
    } else {
      const ticketNumber =
        (item.data?.["ticketNumber"] as string | undefined) ||
        (item.data?.["ticketId"] as string | undefined) ||
        item.body?.match(/TICK-\d+/i)?.[0] ||
        item.title?.match(/TICK-\d+/i)?.[0];

      if (ticketNumber) {
        setSelectedTicketNumber(ticketNumber);
      } else {
        // Broadcast announcement, promotion, or system alert - open details modal instead of redirecting
        setSelectedAnnouncement(item);
      }
    }
  };

  const handleClickGroup = (group: GroupedMessageNotification) => {
    // Mark all unread messages in this group as read
    const unreadIds = group.items.filter((i) => !i.isRead).map((i) => i.id);
    if (unreadIds.length > 0) {
      markMultipleMutation.mutate(unreadIds);
    }

    if (group.conversationId) {
      void navigate({
        to: "/app/messages/$conversationId",
        params: { conversationId: group.conversationId },
      });
    } else {
      void navigate({ to: "/app/messages" });
    }
  };

  const toggleExpand = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getSingleIcon = (type: string) => {
    switch (type) {
      case "chat_message":
        return <MessageCircle className="size-4 text-primary shrink-0" />;
      case "interest_received":
        return <Heart className="size-4 text-[#D92662] shrink-0" />;
      case "interest_accepted":
        return <Sparkles className="size-4 text-amber-500 shrink-0" />;
      case "promo":
        return <Tag className="size-4 text-amber-500 shrink-0" />;
      case "announcement":
      case "system":
        return <Megaphone className="size-4 text-primary shrink-0" />;
      case "security":
        return <ShieldAlert className="size-4 text-destructive shrink-0" />;
      case "verification":
      case "verification_approved":
        return <BadgeCheck className="size-4 text-emerald-500 shrink-0" />;
      default:
        return <Bell className="size-4 text-primary shrink-0" />;
    }
  };

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative rounded-xl size-9 sm:size-10 cursor-pointer"
        >
          <Bell className="size-4.5 sm:size-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-[#D92662] text-[0.62rem] font-bold text-white shadow-xs animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/60 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="size-3.5" /> Mark read
              </button>
            )}
            {rawNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => clearAllMutation.mutate()}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer p-1 rounded transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notification list */}
        <div className="max-h-84 overflow-y-auto divide-y divide-border/60">
          {groupedNotifications.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              <Bell className="size-6 mx-auto mb-2 opacity-40 text-muted-foreground" />
              No notifications yet
            </div>
          ) : (
            groupedNotifications.map((row) => {
              if (row.type === "grouped_chat") {
                const isUnread = row.unreadCount > 0;
                const isMulti = row.items.length > 1;
                const isExpanded = Boolean(expandedGroups[row.key]);

                return (
                  <div
                    key={row.key}
                    className={`transition-colors ${isUnread ? "bg-primary/5" : ""}`}
                  >
                    <div
                      onClick={() => handleClickGroup(row)}
                      className="flex items-start gap-3 p-3.5 hover:bg-muted/60 transition-colors cursor-pointer text-left"
                    >
                      {/* Avatar or Icon */}
                      <div className="relative mt-0.5 shrink-0">
                        <Avatar className="size-9 ring-1 ring-border/80 shadow-xs">
                          {row.senderAvatar ? (
                            <AvatarImage src={row.senderAvatar} alt={row.senderName} />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {row.senderName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground shadow-xs">
                          <MessageCircle className="size-2.5" />
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className={`text-xs truncate ${isUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                              {row.senderName}
                            </p>
                            {isMulti && (
                              <span className="shrink-0 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                                {row.items.length} msgs
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(row.latestItem.createdAt)}
                            </span>
                            {isUnread && (
                              <span className="size-2 rounded-full bg-[#D92662] shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* Message Preview */}
                        <p className={`text-xs mt-0.5 line-clamp-1 ${isUnread ? "font-medium text-foreground/90" : "text-muted-foreground"}`}>
                          {row.latestItem.body || "Sent you a message"}
                        </p>

                        {/* Accordion expand toggle if multiple messages */}
                        {isMulti && (
                          <div className="mt-1 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={(e) => toggleExpand(row.key, e)}
                              className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  Hide earlier messages <ChevronUp className="size-3" />
                                </>
                              ) : (
                                <>
                                  View all {row.items.length} messages <ChevronDown className="size-3" />
                                </>
                              )}
                            </button>
                            <span className="text-[10px] text-muted-foreground">Click to open chat</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded individual messages */}
                    {isMulti && isExpanded && (
                      <div className="pl-12 pr-3.5 pb-2.5 space-y-1.5 bg-muted/30 border-t border-border/40">
                        {row.items.map((subItem) => (
                          <div
                            key={subItem.id}
                            onClick={() => handleClickSingleNotification(subItem)}
                            className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-card/80 transition-colors text-xs cursor-pointer group"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              {!subItem.isRead && (
                                <span className="size-1.5 rounded-full bg-[#D92662] shrink-0" />
                              )}
                              <span className={`truncate text-[11px] ${!subItem.isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                {subItem.body}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 group-hover:text-primary">
                              {formatRelativeTime(subItem.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Single non-chat notification (interests, system, etc.)
              const { item } = row;
              return (
                <div
                  key={row.key}
                  onClick={() => handleClickSingleNotification(item)}
                  className={`flex items-start gap-3 p-3.5 hover:bg-muted/60 transition-colors cursor-pointer text-left ${
                    !item.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-card border border-border/80 shadow-xs">
                    {getSingleIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs truncate ${!item.isRead ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                        {!item.isRead && (
                          <span className="size-2 rounded-full bg-[#D92662] shrink-0" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {item.body}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-border text-center bg-muted/20 flex items-center justify-around">
          <Link
            to="/app/messages"
            className="text-xs font-semibold text-primary hover:underline py-0.5"
          >
            All messages
          </Link>
          <span className="text-border">|</span>
          <Link
            to="/app/interests/received"
            className="text-xs font-semibold text-primary hover:underline py-0.5"
          >
            Interests & requests
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Announcement / Broadcast Detail Reader Dialog */}
    <Dialog
      open={Boolean(selectedAnnouncement)}
      onOpenChange={(open) => {
        if (!open) setSelectedAnnouncement(null);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
              {selectedAnnouncement && getSingleIcon(selectedAnnouncement.type)}
            </span>
            <Badge variant="secondary" className="capitalize text-[10px]">
              {selectedAnnouncement?.type || "Announcement"}
            </Badge>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {selectedAnnouncement ? formatRelativeTime(selectedAnnouncement.createdAt) : ""}
            </span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {selectedAnnouncement?.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-foreground/85 mt-2 leading-relaxed whitespace-pre-wrap">
            {selectedAnnouncement?.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2">
          {(() => {
            const ticketInAnnouncement =
              (selectedAnnouncement?.data?.["ticketNumber"] as string | undefined) ||
              (selectedAnnouncement?.data?.["ticketId"] as string | undefined) ||
              selectedAnnouncement?.body?.match(/TICK-\d+/i)?.[0] ||
              selectedAnnouncement?.title?.match(/TICK-\d+/i)?.[0];

            if (ticketInAnnouncement) {
              return (
                <Button
                  onClick={() => {
                    const num = ticketInAnnouncement;
                    setSelectedAnnouncement(null);
                    setSelectedTicketNumber(num);
                  }}
                  className="w-full sm:w-auto gap-2 text-xs"
                >
                  <Headset className="size-3.5" />
                  Reply to Support ({ticketInAnnouncement})
                </Button>
              );
            }

            if ((selectedAnnouncement?.type as string) === "promo") {
              return (
                <Button
                  onClick={() => {
                    setSelectedAnnouncement(null);
                    void navigate({ to: "/app/upgrade" });
                  }}
                  className="w-full sm:w-auto gap-2 text-xs"
                >
                  <Tag className="size-3.5" />
                  View Upgrade Offers
                </Button>
              );
            }

            return <div />;
          })()}
          <Button
            variant="outline"
            onClick={() => setSelectedAnnouncement(null)}
            className="w-full sm:w-auto text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dedicated Support Ticket Conversation & Reply Modal */}
    <SupportTicketModal
      ticketNumberOrId={selectedTicketNumber}
      open={Boolean(selectedTicketNumber)}
      onClose={() => setSelectedTicketNumber(null)}
    />
    </>
  );
}
