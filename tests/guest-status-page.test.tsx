// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GuestStatusPage from "@/app/(guest)/guest/status/[requestId]/page";

const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({ useParams: () => ({ requestId: "42" }) }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/notification-sound", () => ({ playNotificationSound: vi.fn() }));

const capability = "c".repeat(43);
const request = { id: 42, status: "PENDING", requestedAt: new Date().toISOString(), acceptedAt: null, completedAt: null, location: { name: "Lobi" }, buggy: null, acceptedByDriver: null };
let eventSources: MockEventSource[];
class MockEventSource {
  onmessage: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor(public url: string) { eventSources.push(this); }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  eventSources = [];
  vi.stubGlobal("EventSource", MockEventSource);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const jsonResponse = (data: unknown) => ({ json: async () => data });

async function renderConnected() {
  sessionStorage.setItem("guest-capability:42", capability);
  global.fetch = vi.fn()
    .mockResolvedValueOnce(jsonResponse({ success: true, data: request }))
    .mockResolvedValueOnce(jsonResponse({ success: true, data: { ticket: "t".repeat(43) } }));
  const view = render(<GuestStatusPage />);
  await screen.findByText(/Talebiniz Alındı!/, {}, { timeout: 3000 });
  await waitFor(() => expect(eventSources).toHaveLength(1));
  return view;
}

describe("GuestStatusPage capability flow", () => {
  it("uses main landmark and keeps status updates live", async () => {
    await renderConnected();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
  });

  it("fails safely without capability", async () => {
    global.fetch = vi.fn();
    render(<GuestStatusPage />);
    expect(await screen.findByText("Talep erişimi bulunamadı")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Yeni çağrı oluştur" })).toHaveAttribute("href", "/guest/call");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("uses capability headers, ticket URL, fresh reconnect ticket, and cleans resources", async () => {
    const view = await renderConnected();
    expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/requests/42", { headers: { "x-guest-capability": capability } });
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/requests/42/sse-ticket", { method: "POST", headers: { "x-guest-capability": capability } });
    expect(eventSources[0].url).toBe(`/api/sse/guest/42?ticket=${"t".repeat(43)}`);
    expect(eventSources[0].url).not.toContain(capability);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ success: true, data: { ticket: "u".repeat(43) } }));
    act(() => eventSources[0].onerror?.());
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    await waitFor(() => expect(eventSources).toHaveLength(2));
    expect(eventSources[0].close).toHaveBeenCalled();
    expect(eventSources[1].url).toContain(`ticket=${"u".repeat(43)}`);

    view.unmount();
    expect(eventSources[1].close).toHaveBeenCalled();
    expect(sessionStorage.getItem("guest-capability:42")).toBe(capability);
  });

  it("sends cancel header then clears only session capability", async () => {
    await renderConnected();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ success: true, data: { ...request, status: "CANCELLED" } }));
    const cancelButton = screen.getByRole("button", { name: "Talep İptal Et" });
    fireEvent.click(cancelButton);
    fireEvent.click(cancelButton);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Talep iptal edildi"));
    expect(global.fetch).toHaveBeenLastCalledWith("/api/requests/42/cancel", expect.objectContaining({ headers: { "Content-Type": "application/json", "x-guest-capability": capability } }));
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([url]) => url === "/api/requests/42/cancel")).toHaveLength(1);
    expect(eventSources[0].close).toHaveBeenCalled();
    const callsAfterCancel = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(global.fetch).toHaveBeenCalledTimes(callsAfterCancel);
    expect(sessionStorage.getItem("guest-capability:42")).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(document.cookie).not.toContain(capability);
  });
});
