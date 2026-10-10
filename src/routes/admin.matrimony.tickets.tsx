import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminService } from "@/services";
import { realtimeClient } from "@/lib/realtime";
import type { SupportTicketRow, TicketReply } from "@/types";

export const Route = createFileRoute("/admin/matrimony/tickets")({
  head: () => ({
    meta: [
      { title: "Customer Support Tickets — YFJ Matrimony Admin" },
      {
        name: "description",
        content: "Customer help desk ticketing console and member resolution queue.",
      },
    ],
  }),
  component: AdminTicketsPage,
});

function AdminTicketsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState<string>("in_progress");
  const [isSendingReply, setIsSendingReply] = useState(false);

  useEffect(() => {
    const unsubReply = realtimeClient.on("ticket:reply", () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      if (activeTicketId) {
        void queryClient.invalidateQueries({ queryKey: ["admin", "ticket", activeTicketId] });
      }
    });

    const unsubNew = realtimeClient.on("ticket:new", () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    });

    return () => {
      unsubReply();
      unsubNew();
    };
  }, [activeTicketId, queryClient]);

  const query = useQuery({
    queryKey: ["admin", "tickets", statusFilter, priorityFilter, search],
    queryFn: () =>
      adminService.tickets({
        status: statusFilter === "all" ? undefined : statusFilter,
        priority: priorityFilter === "all" ? undefined : priorityFilter,
        q: search || undefined,
      }),
  });

  const activeTicketQuery = useQuery({
    queryKey: ["admin", "ticket", activeTicketId],
    queryFn: () => (activeTicketId ? adminService.ticket(activeTicketId) : null),
    enabled: !!activeTicketId,
  });

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !replyMessage.trim()) return;
    setIsSendingReply(true);
    try {
      await adminService.replyTicket(activeTicketId, replyMessage.trim(), replyStatus);
      await queryClient.invalidateQueries({ queryKey: ["admin", "ticket", activeTicketId] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Support reply sent to member");
      setReplyMessage("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await adminService.updateTicket(ticketId, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ["admin", "ticket", ticketId] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(`Ticket marked as ${newStatus}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    if (priority === "urgent" || priority === "high") return "destructive";
    if (priority === "medium") return "secondary";
    return "outline";
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status === "resolved") return "default";
    if (status === "in_progress") return "secondary";
    if (status === "open") return "destructive";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Help Desk"
        title="Customer Support Tickets"
        description="Review member inquiries, answer questions, troubleshoot billing issues, and close tickets."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        }
      />

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by #ID, subject, or member"
            className="h-11 rounded-2xl pl-11 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data?.length === 0 ? (
        <EmptyState
          title="No support tickets found"
          description="Ticket queue is clear or no inquiries match your filter."
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    {ticket.ticket_number}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <div>
                      <p className="font-semibold text-sm">{ticket.user_name}</p>
                      <p className="text-xs text-muted-foreground">{ticket.user_email || "Member"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <p className="truncate text-sm font-medium text-foreground">{ticket.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">{ticket.message}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityBadgeVariant(ticket.priority)} className="capitalize text-xs">
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(ticket.status)} className="capitalize text-xs">
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(ticket.created_at).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => setActiveTicketId(ticket.id)}
                      className="h-8 gap-1 text-xs"
                    >
                      <MessageSquare className="size-3.5" /> View Thread
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Ticket Details & Thread Dialog */}
      <Dialog open={!!activeTicketId} onOpenChange={(open) => !open && setActiveTicketId(null)}>
        <DialogContent className="max-w-3xl rounded-3xl p-6 max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <LifeBuoy className="size-5 text-primary" />
                  {activeTicketQuery.data?.ticket_number}: {activeTicketQuery.data?.subject}
                </DialogTitle>
                <DialogDescription>
                  Inquiry submitted by {activeTicketQuery.data?.user_name} ({activeTicketQuery.data?.user_email})
                </DialogDescription>
              </div>

              {activeTicketQuery.data && (
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(activeTicketQuery.data.status)} className="capitalize">
                    {activeTicketQuery.data.status.replace("_", " ")}
                  </Badge>
                  <select
                    value={activeTicketQuery.data.status}
                    onChange={(e) => handleStatusChange(activeTicketQuery.data!.id, e.target.value)}
                    className="h-8 rounded-lg border border-input bg-card px-2 text-xs font-semibold"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              )}
            </div>
          </DialogHeader>

          {activeTicketQuery.isPending ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading ticket messages…</div>
          ) : activeTicketQuery.data ? (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden pt-2">
              {/* Original Message Banner */}
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">
                    Initial Message from {activeTicketQuery.data.user_name}:
                  </span>
                  <span>{new Date(activeTicketQuery.data.created_at).toLocaleString("en-IN")}</span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {activeTicketQuery.data.message}
                </p>
              </div>

              {/* Thread Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 p-1 max-h-60 border-y border-border py-3">
                {activeTicketQuery.data.replies && activeTicketQuery.data.replies.length > 0 ? (
                  activeTicketQuery.data.replies.map((reply: TicketReply) => (
                    <div
                      key={reply.id}
                      className={`flex flex-col ${
                        reply.sender_type === "admin" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-sm ${
                          reply.sender_type === "admin"
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted text-foreground rounded-bl-none border border-border"
                        }`}
                      >
                        <div className="flex justify-between items-center gap-4 text-[0.7rem] opacity-80 mb-1 border-b border-white/20 pb-0.5">
                          <strong>{reply.sender_name} ({reply.sender_type})</strong>
                          <span>{new Date(reply.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{reply.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-muted-foreground py-4">
                    No replies yet. Type an answer below to respond to this member.
                  </p>
                )}
              </div>

              {/* Reply Composer Form */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-2">
                <textarea
                  rows={3}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your official support response here…"
                  required
                  className="flex w-full rounded-2xl border border-input bg-background p-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">After reply, set status:</Label>
                    <select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-card px-2 text-xs"
                    >
                      <option value="in_progress">Keep In Progress</option>
                      <option value="resolved">Mark Resolved</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTicketId(null)}
                    >
                      Close
                    </Button>
                    <Button type="submit" size="sm" disabled={isSendingReply} className="gap-1.5">
                      <Send className="size-3.5" />
                      {isSendingReply ? "Sending…" : "Send Reply"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
