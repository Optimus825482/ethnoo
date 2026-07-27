// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import MonitorPage from "@/app/(admin)/admin/monitor/page";

const { mockPlaySound } = vi.hoisted(() => ({ mockPlaySound: vi.fn() }));
vi.mock("@/lib/notification-sound", () => ({ playNotificationSound: mockPlaySound }));

class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor(public url: string) {
    MockEventSource.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }
  emit(obj: unknown) { this.onmessage?.({ data: JSON.stringify(obj) }); }
  close() {}
}
Object.defineProperty(globalThis, "EventSource", { value: MockEventSource, configurable: true });

const stateResponse = {
  success: true,
  data: {
    locations: [{ id: 1, name: "Aquapark", mapX: 150, mapY: 362, displayOrder: 1 }],
    buggies: [{ id: 1, code: "BG-1", icon: null, status: "AVAILABLE", currentLocationId: 1, drivers: [{ id: 2, fullName: "Ahmet" }] }],
    requests: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  MockEventSource.instances = [];
  global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve(stateResponse) });
});

describe("MonitorPage", () => {
  it("loads state and shows buggy in panel", async () => {
    render(<MonitorPage />);
    await waitFor(() => expect(screen.getByText("Canli Harita")).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText(/BG-1/).length).toBeGreaterThan(0));
  });

  it("new_request SSE event adds pending call and plays sound", async () => {
    render(<MonitorPage />);
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    const es = MockEventSource.instances[0];
    await act(async () => {
      es.emit({
        type: "new_request",
        request: { id: 42, status: "PENDING", guestName: "Ali Veli", roomNumber: "205", requestedAt: new Date().toISOString(), acceptedAt: null, locationId: 1, buggyId: null, acceptedById: null },
      });
    });
    await waitFor(() => expect(screen.getAllByText(/Ali Veli/).length).toBeGreaterThan(0));
    expect(mockPlaySound).toHaveBeenCalled();
  });

  it("request_cancelled SSE event removes the call", async () => {
    const withCall = {
      ...stateResponse,
      data: { ...stateResponse.data, requests: [{ id: 42, status: "PENDING" as const, guestName: "Ali Veli", roomNumber: null, requestedAt: new Date().toISOString(), acceptedAt: null, locationId: 1, buggyId: null, acceptedById: null }] },
    };
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve(withCall) });
    render(<MonitorPage />);
    await waitFor(() => expect(screen.getAllByText(/Ali Veli/).length).toBeGreaterThan(0));
    const es = MockEventSource.instances[0];
    await act(async () => { es.emit({ type: "request_cancelled", requestId: 42 }); });
    await waitFor(() => expect(screen.queryAllByText(/Ali Veli/).length).toBe(0));
  });
});
