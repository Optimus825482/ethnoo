// Simple in-memory event emitter for SSE
// ponytail: upgrade to Redis pub/sub when scaling to multiple instances

type EventHandler = (data: string) => void;

class EventBus {
  private channels = new Map<string, Set<EventHandler>>();

  subscribe(channel: string, handler: EventHandler): () => void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(handler);

    return () => {
      this.channels.get(channel)?.delete(handler);
    };
  }

  publish(channel: string, data: string): void {
    const handlers = this.channels.get(channel);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }
}

export const eventBus = new EventBus();

export function publishSSE(channel: string, event: Record<string, unknown>): void {
  eventBus.publish(channel, JSON.stringify(event));
}
