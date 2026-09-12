import { api } from "@/lib/api-client";
import { env } from "@/lib/env";
import type { Conversation, Message } from "@/types";
import { delay } from "@/mocks/adapter";
import { mockConversations, mockMessages, mockUser } from "@/mocks/data";

/**
 * Transport-agnostic messaging service.
 * `subscribe` is the single integration point for WebSocket / Socket.IO /
 * AWS AppSync — swap its body without touching any chat UI component.
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

  /** Returns an unsubscribe function. No-op until a realtime transport is wired. */
  subscribe(_conversationId: string, _onMessage: (message: Message) => void): () => void {
    if (!env.chatSocketUrl) return () => {};
    // Backend integration point: open the socket, forward messages to onMessage.
    return () => {};
  },
};
