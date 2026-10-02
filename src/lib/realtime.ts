import { tokenStore } from "./api-client";
import { env } from "./env";
import { playNotificationChime } from "./audio";
import { toast } from "sonner";

type Listener<T = any> = (data: T) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isExplicitlyClosed = false;
  private activeSubscriptions = new Set<string>();

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  public init() {
    if (typeof window === "undefined") return;
    const token = tokenStore.get();
    if (!token) return;

    this.connect();
  }

  private getSocketUrl(): string {
    if (env.chatSocketUrl) return env.chatSocketUrl;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = tokenStore.get();
    if (!token) return;

    try {
      const baseUrl = this.getSocketUrl();
      const wsUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;

      this.isExplicitlyClosed = false;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        console.log("[WebSocket] Connected to real-time gateway");

        // Resubscribe to any open conversation rooms
        for (const convId of this.activeSubscriptions) {
          this.send("chat:subscribe", { conversationId: convId });
        }

        this.emit("connection:open", { open: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const { event: eventName, data } = parsed;

          if (eventName === "pong") return;

          // Dispatch to registered local listeners
          this.emit(eventName, data);

          // Handle global system notifications & chimes
          if (eventName === "notification:new" && data?.notification) {
            const notif = data.notification;
            const notifConvId = notif.data?.conversationId;
            const isViewingThisChat =
              typeof window !== "undefined" &&
              Boolean(notifConvId) &&
              window.location.pathname.includes(String(notifConvId));

            // Only show toast if user is not actively viewing this conversation
            if (!isViewingThisChat) {
              playNotificationChime();
              toast.info(notif.title, {
                description: notif.body,
              });
            }
          }

          if (eventName === "interest:received" && data?.sender) {
            playNotificationChime();
            toast.success("New Interest Request!", {
              description: `${data.sender.name} expressed interest in your profile.`,
            });
          }

          if (eventName === "interest:accepted" && data?.partner) {
            playNotificationChime();
            toast.success("Interest Accepted! 🎉", {
              description: `${data.partner.name} accepted your interest request! You can now chat.`,
            });
          }
        } catch (err) {
          console.warn("[WebSocket] Could not parse incoming payload:", err);
        }
      };

      this.ws.onclose = (event) => {
        this.ws = null;
        this.emit("connection:close", { code: event.code });

        if (!this.isExplicitlyClosed && tokenStore.get()) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
          this.reconnectAttempts++;
          this.reconnectTimer = setTimeout(() => {
            this.connect();
          }, delay);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("[WebSocket] Transport warning:", err);
      };
    } catch (err) {
      console.warn("[WebSocket] Connection attempt failed:", err);
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public on<T = any>(event: string, listener: Listener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  public emit(event: string, data: any) {
    const list = this.listeners.get(event);
    if (!list) return;
    for (const listener of list) {
      try {
        listener(data);
      } catch (err) {
        console.error(`[WebSocket] Error in listener for event "${event}":`, err);
      }
    }
  }

  public send(event: string, data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      return false;
    }
    this.ws.send(JSON.stringify({ event, data }));
    return true;
  }

  public subscribeToConversation(conversationId: string) {
    this.activeSubscriptions.add(conversationId);
    this.send("chat:subscribe", { conversationId });
  }

  public unsubscribeFromConversation(conversationId: string) {
    this.activeSubscriptions.delete(conversationId);
    this.send("chat:unsubscribe", { conversationId });
  }

  public sendMessage(conversationId: string, content: string) {
    return this.send("chat:message", { conversationId, content });
  }
}

export const realtimeClient = new RealtimeClient();
