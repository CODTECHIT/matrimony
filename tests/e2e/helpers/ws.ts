const WS_BASE_URL = process.env.TEST_WS_URL || "ws://localhost:5000/ws";
const DEFAULT_TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS) || 5000;

export interface WsEvent<T = any> {
  type: string;
  payload: T;
  raw: any;
  timestamp: number;
}

export class TestWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private receivedEvents: WsEvent[] = [];
  private eventListeners: Array<(event: WsEvent) => void> = [];

  constructor(token?: string, customUrl?: string) {
    const base = customUrl || WS_BASE_URL;
    this.url = token ? `${base}?token=${token}` : base;
  }

  async connect(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.ws) {
          try {
            this.ws.close();
          } catch {}
        }
        reject(new Error(`WebSocket connection to ${this.url} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          clearTimeout(timer);
          resolve();
        };

        this.ws.onerror = (err: any) => {
          clearTimeout(timer);
          reject(new Error(`WebSocket error on ${this.url}: ${err?.message || "Connection failed"}`));
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const rawData = typeof event.data === "string" ? event.data : event.data.toString();
            const parsed = JSON.parse(rawData);
            const wsEvent: WsEvent = {
              type: parsed.type || parsed.event || "unknown",
              payload: parsed.data || parsed.payload || parsed,
              raw: parsed,
              timestamp: Date.now(),
            };
            this.receivedEvents.push(wsEvent);
            for (const listener of this.eventListeners) {
              listener(wsEvent);
            }
          } catch {
            const wsEvent: WsEvent = {
              type: "raw",
              payload: event.data,
              raw: event.data,
              timestamp: Date.now(),
            };
            this.receivedEvents.push(wsEvent);
          }
        };
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  send(type: string, payload: any = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Cannot send on WebSocket: socket is not open");
    }
    const message = JSON.stringify({ type, ...payload });
    this.ws.send(message);
  }

  async waitForEvent<T = any>(
    eventType: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<WsEvent<T>> {
    // Check if event already received
    const existing = this.receivedEvents.find((e) => e.type === eventType);
    if (existing) {
      return existing as WsEvent<T>;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Timeout waiting for WebSocket event "${eventType}" after ${timeoutMs}ms. Events seen: [${this.receivedEvents.map((e) => e.type).join(", ")}]`,
          ),
        );
      }, timeoutMs);

      const listener = (event: WsEvent) => {
        if (event.type === eventType) {
          cleanup();
          resolve(event as WsEvent<T>);
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        const index = this.eventListeners.indexOf(listener);
        if (index !== -1) {
          this.eventListeners.splice(index, 1);
        }
      };

      this.eventListeners.push(listener);
    });
  }

  getEvents(): WsEvent[] {
    return [...this.receivedEvents];
  }

  close(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}
