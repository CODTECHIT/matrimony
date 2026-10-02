import { api } from "@/lib/api-client";
import { env } from "@/lib/env";
import type { Conversation, Message } from "@/types";
import { delay } from "@/mocks/adapter";
import { mockConversations, mockMessages, mockUser } from "@/mocks/data";
import { realtimeClient } from "@/lib/realtime";

/**
 * Transport-agnostic messaging service.
 * `subscribe` is wired to the live WebSocket server.
 */
export const messagesService = {
  async conversations(): Promise<Conversation[]> {
    if (env.useMockApi) return delay(mockConversations);
    return api.get("/conversations");
  },

  async messages(conversationId: string): Promise<Message[]> {
    if (env.useMockApi) return delay(mockMessages[conversationId] ?? []);
    return api.get(`/conversations/${conversationId}/messages`);
  },

  async send(conversationId: string, body: string): Promise<Message> {
    const optimistic: Message = {
      id: `m-${Date.now()}`,
      conversationId,
      senderId: mockUser.id,
      body,
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    if (env.useMockApi) {
      mockMessages[conversationId] = [...(mockMessages[conversationId] ?? []), optimistic];
      return delay(optimistic, 250);
    }
    return api.post(`/conversations/${conversationId}/messages`, { body });
  },

  /** Starts or returns an existing conversation with target user */
  async start(
    targetUserId: string,
    participantName = "Member",
    participantPhotos: string[] = [],
  ): Promise<{ id: string }> {
    if (env.useMockApi) {
      const existing = mockConversations.find((c) => c.participant.id === targetUserId);
      if (existing) return delay({ id: existing.id });
      const newConv: Conversation = {
        id: `c-${Date.now()}`,
        participant: {
          id: targetUserId,
          fullName: participantName,
          photos: participantPhotos,
        },
        lastMessage: "Conversation started.",
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
      };
      mockConversations.unshift(newConv);
      return delay({ id: newConv.id });
    }
    return api.post("/conversations/start", { targetUserId });
  },

  /** Subscribes to live WebSocket message updates for a conversation */
  subscribe(conversationId: string, onMessage: (message: Message) => void): () => void {
    realtimeClient.subscribeToConversation(conversationId);

    const unsubscribeListener = realtimeClient.on("chat:message", (data: any) => {
      if (data?.conversationId === conversationId && data?.message) {
        onMessage(data.message);
      }
    });

    return () => {
      unsubscribeListener();
      realtimeClient.unsubscribeFromConversation(conversationId);
    };
  },

  async deleteConversation(conversationId: string): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.delete<{ ok: boolean }>(`/conversations/${conversationId}`);
  },

  async clearConversation(conversationId: string): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true }, 150);
    return api.post<{ ok: boolean }>(`/conversations/${conversationId}/clear`);
  },
};
