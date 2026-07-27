// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import DriverDashboard from "@/app/(driver)/driver/dashboard/page";

const { mockToast } = vi.hoisted(() => ({
  mockToast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

vi.mock("@/lib/notification-sound", () => ({
  playNotificationSound: vi.fn(),
}));

const locationsResponse = {
  success: true,
  data: {
    items: [
      { id: 1, name: "Lobi", logo: null },
      { id: 2, name: "Havuz", logo: null },
      { id: 3, name: "Plaj", logo: null },
    ],
  },
};

const activeRequestsResponse = {
  success: true,
  data: [
    {
      id: 1,
      status: "PENDING",
      guestName: "John",
      roomNumber: "101",
      phone: "+123",
      notes: "Near pool",
      requestedAt: "2025-01-01T10:00:00Z",
      location: { id: 1, name: "Lobi" },
      acceptedAt: null,
    },
    {
      id: 2,
      status: "PENDING",
      guestName: "Jane",
      roomNumber: "202",
      phone: null,
      notes: null,
      requestedAt: "2025-01-01T10:05:00Z",
      location: { id: 2, name: "Havuz" },
      acceptedAt: null,
    },
  ],
};

const activeWithAccepted = {
  success: true,
  data: [
    {
      id: 3,
      status: "ACCEPTED",
      guestName: "Bob",
      roomNumber: "303",
      phone: "+456",
      notes: "Wheelchair",
      requestedAt: "2025-01-01T09:00:00Z",
      location: { id: 3, name: "Plaj" },
      acceptedAt: "2025-01-01T09:05:00Z",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  class MockEventSource {
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: Event) => void) | null = null;
    close = vi.fn();
    constructor() {}
  }
  global.EventSource = MockEventSource as unknown as typeof EventSource;
});

// Helper: mock fetch to return locations first, then active requests for every subsequent call
function setupFetchMocks(primaryResponse: object) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    // First call when no localStorage = /api/locations
    if (url === "/api/locations") {
      return Promise.resolve({ json: () => Promise.resolve(locationsResponse) });
    }
    if (url === "/api/driver/location") {
      return Promise.resolve({ json: () => Promise.resolve({
        success: true,
        data: { driverStatus: "ON_DUTY", buggy: null },
      }) });
    }
    return Promise.resolve({ json: () => Promise.resolve(primaryResponse) });
  });
}

describe("DriverDashboard", () => {
  it("shows loading state initially", async () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<DriverDashboard />);
    const loading = document.querySelector('[class*="animate-spin"]');
    expect(loading).toBeInTheDocument();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  });

  it("renders driver dashboard heading", async () => {
    localStorage.setItem("driverLocation", "1");
    setupFetchMocks(activeRequestsResponse);

    render(<DriverDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Sürücü Paneli")).toBeInTheDocument();
    });
  });

  it("shows pending requests from API", async () => {
    localStorage.setItem("driverLocation", "1");
    setupFetchMocks(activeRequestsResponse);

    render(<DriverDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Lobi")).toBeInTheDocument();
      expect(screen.getByText("Havuz")).toBeInTheDocument();
    });
  });

  it("shows Kabul Et button for each pending request", async () => {
    localStorage.setItem("driverLocation", "1");
    setupFetchMocks(activeRequestsResponse);

    render(<DriverDashboard />);

    await waitFor(() => {
      const buttons = screen.getAllByRole("button", { name: /kabul et/i });
      expect(buttons.length).toBe(2);
    });
  });

  it("shows active request card when ACCEPTED request exists", async () => {
    localStorage.setItem("driverLocation", "1");
    setupFetchMocks(activeWithAccepted);

    render(<DriverDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Aktif Görev/)).toBeInTheDocument();
    });
  });

  it("Kabul Et button calls /api/requests/{id}/accept", async () => {
    localStorage.setItem("driverLocation", "1");
    setupFetchMocks(activeRequestsResponse);

    render(<DriverDashboard />);

    await screen.findAllByRole("button", { name: /kabul et/i });

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === "/api/requests/active") {
        return Promise.resolve({ json: () => Promise.resolve({ success: true, data: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
    });

    fireEvent.click(screen.getAllByRole("button", { name: /kabul et/i })[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/requests/1/accept", {
        method: "POST",
      });
    });
  });

  it("shows empty state when no pending requests", async () => {
    localStorage.setItem("driverLocation", "1");
    setupFetchMocks({ success: true, data: [] });

    render(<DriverDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Bekleyen talep yok")).toBeInTheDocument();
    });
  });
});
