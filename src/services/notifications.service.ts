import { api } from "@/lib/api-client";
import { env } from "@/lib/env";
import { delay } from "@/mocks/adapter";

export interface NotificationItem {
  id: string;
  userId: string;
  type: "chat_message" | "interest_received" | "interest_accepted" | "profile_view" | "system";
  title: string;
  body: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export const notificationsService = {
  async list(): Promise<NotificationsResponse> {
    if (env.useMockApi) {
      return delay({ notifications: [], unreadCount: 0 });
    }
    return api.get<NotificationsResponse>("/notifications");
  },

  async markAsRead(id: string): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true });
    return api.patch<{ ok: boolean }>(`/notifications/${id}/read`);
  },

  async markMultipleAsRead(ids: string[]): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true });
    return api.patch<{ ok: boolean }>("/notifications/mark-multiple", { ids });
  },

  async markAllAsRead(): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true });
    return api.patch<{ ok: boolean }>("/notifications/read-all");
  },

  async clearAll(): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true });
    return api.delete<{ ok: boolean }>("/notifications/clear-all");
  },
};
