import { describe, it, expect, vi } from "vitest";
import { eventBus, publishSSE } from "@/lib/event-bus";

describe("EventBus", () => {
  it("subscribe returns unsubscribe function", () => {
    const handler = vi.fn();
    const unsub = eventBus.subscribe("test", handler);
    expect(typeof unsub).toBe("function");
  });

  it("publish sends data to subscribers", () => {
    const handler = vi.fn();
    eventBus.subscribe("pub-channel", handler);

    eventBus.publish("pub-channel", "hello");

    expect(handler).toHaveBeenCalledWith("hello");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe removes handler", () => {
    const handler = vi.fn();
    const unsub = eventBus.subscribe("unsub-channel", handler);

    unsub();
    eventBus.publish("unsub-channel", "data");

    expect(handler).not.toHaveBeenCalled();
  });

  it("multiple channels work independently", () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    eventBus.subscribe("channel-a", handlerA);
    eventBus.subscribe("channel-b", handlerB);

    eventBus.publish("channel-a", "data-a");
    eventBus.publish("channel-b", "data-b");

    expect(handlerA).toHaveBeenCalledWith("data-a");
    expect(handlerB).toHaveBeenCalledWith("data-b");
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it("publishSSE helper serializes event to JSON", () => {
    const handler = vi.fn();
    eventBus.subscribe("sse-channel", handler);

    publishSSE("sse-channel", { type: "test", value: 42 });

    expect(handler).toHaveBeenCalledWith('{"type":"test","value":42}');
  });

  it("publish with no subscribers does not throw", () => {
    expect(() => {
      eventBus.publish("ghost-channel", "data");
    }).not.toThrow();
  });
});
