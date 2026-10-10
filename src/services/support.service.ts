import { api } from "@/lib/api-client";

export interface TicketReply {
  id: string;
  ticket_id: string;
  sender_type: "user" | "admin" | "support";
  sender_name: string;
  message: string;
  created_at: string;
}

export interface SupportTicketWithReplies {
  id: string;
  ticket_number: string;
  user_id: string | null;
  user_name: string;
  user_email: string;
  subject: string;
  message: string;
  priority: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  replies: TicketReply[];
}

export const supportService = {
  async getTicket(idOrNumber: string): Promise<SupportTicketWithReplies> {
    return api.get<SupportTicketWithReplies>(`/support/tickets/${idOrNumber}`);
  },

  async replyTicket(idOrNumber: string, message: string): Promise<{ ok: boolean; reply: TicketReply }> {
    return api.post<{ ok: boolean; reply: TicketReply }>(`/support/tickets/${idOrNumber}/reply`, { message });
  },

  async getMyTickets(): Promise<SupportTicketWithReplies[]> {
    return api.get<SupportTicketWithReplies[]>("/support/tickets/my");
  },
};
