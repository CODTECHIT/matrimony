import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Headset, Send, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supportService } from "@/services";
import { realtimeClient } from "@/lib/realtime";

export function SupportTicketModal({
  ticketNumberOrId,
  open,
  onClose,
}: {
  ticketNumberOrId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!open || !ticketNumberOrId) return;

    const unsub = realtimeClient.on("ticket:reply", () => {
      void queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketNumberOrId] });
    });

    return () => {
      unsub();
    };
  }, [open, ticketNumberOrId, queryClient]);

  const {
    data: ticket,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["support-ticket", ticketNumberOrId],
    queryFn: () => supportService.getTicket(ticketNumberOrId!),
    enabled: Boolean(ticketNumberOrId && open),
  });

  const replyMutation = useMutation({
    mutationFn: (msg: string) => supportService.replyTicket(ticketNumberOrId!, msg),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketNumberOrId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Your reply was sent to the support team!");
      setReplyText("");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    },
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate(replyText.trim());
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-600 text-white hover:bg-amber-600">In Progress</Badge>;
      case "resolved":
        return <Badge variant="secondary">Resolved</Badge>;
      case "closed":
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status || "Pending"}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-xl rounded-3xl p-6">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <Headset className="size-5" />
              </span>
              <div>
                <span className="font-mono text-xs font-semibold text-muted-foreground uppercase">
                  Ticket #{ticket?.ticket_number || ticketNumberOrId}
                </span>
                <DialogTitle className="text-base font-bold text-foreground">
                  {ticket?.subject || "Support Inquiry"}
                </DialogTitle>
              </div>
            </div>
            <div>{getStatusBadge(ticket?.status)}</div>
          </div>
          <DialogDescription className="sr-only">
            Conversation history with customer support team and reply form.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
            Loading ticket thread...
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-sm text-destructive space-y-2">
            <p>Could not load ticket details.</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : !ticket ? null : (
          <div className="space-y-4 pt-1">
            {/* Conversation Thread Area */}
            <div className="max-h-80 overflow-y-auto space-y-3.5 pr-1 rounded-2xl bg-muted/20 p-3.5 border border-border/50 text-xs">
              {/* Initial message */}
              <div className="rounded-2xl border border-border bg-card p-3.5 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium border-b border-border/50 pb-1.5">
                  <span className="flex items-center gap-1.5 text-foreground font-semibold">
                    <User className="size-3.5 text-muted-foreground" />
                    You (Initial Inquiry)
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(ticket.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="pt-1 text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {ticket.message}
                </p>
              </div>

              {/* Threaded replies */}
              {ticket.replies && ticket.replies.length > 0 ? (
                ticket.replies.map((reply) => {
                  const isStaff = reply.sender_type === "admin" || reply.sender_type === "support";
                  return (
                    <div
                      key={reply.id}
                      className={`rounded-2xl p-3.5 space-y-1 shadow-xs ${
                        isStaff
                          ? "bg-primary-soft/60 border border-primary/20 mr-4"
                          : "bg-card border border-border ml-4"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-medium border-b border-border/40 pb-1.5">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                          {isStaff ? (
                            <>
                              <Headset className="size-3.5 text-primary" />
                              <span className="text-primary font-bold">
                                Support Advisor ({reply.sender_name})
                              </span>
                            </>
                          ) : (
                            <>
                              <User className="size-3.5 text-muted-foreground" />
                              <span>You ({reply.sender_name})</span>
                            </>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(reply.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <p className="pt-1 text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {reply.message}
                      </p>
                    </div>
                  );
                })
              ) : null}
            </div>

            {/* Reply Composer Form */}
            <form onSubmit={handleSendReply} className="space-y-2.5 pt-1">
              <label htmlFor="ticket-reply-input" className="block text-xs font-semibold text-foreground">
                Reply to Support:
              </label>
              <Textarea
                id="ticket-reply-input"
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your response, questions, or clarification..."
                className="rounded-2xl border-border resize-none text-xs leading-relaxed focus:border-primary"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Our team typically responds within 1 business hour.
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="gap-1.5 rounded-xl text-xs h-9 px-4 font-semibold shadow-xs"
                >
                  <Send className="size-3.5" />
                  {replyMutation.isPending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
