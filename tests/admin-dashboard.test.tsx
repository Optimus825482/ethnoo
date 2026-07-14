// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminDashboard from "@/app/(admin)/admin/dashboard/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

const summaryResponse = {
  success: true,
  data: {
    total: 100,
    pending: 10,
    accepted: 5,
    completed: 75,
    cancelled: 10,
    unanswered: 5,
    avgResponseTime: 120,
    avgCompletionTime: 600,
  },
};

const activeResponse = {
  success: true,
  data: [
    {
      id: 1,
      status: "PENDING",
      guestName: "Alice",
      requestedAt: "2025-01-01T10:00:00Z",
      location: { name: "Lobby" },
      acceptedByDriver: null,
    },
    {
      id: 2,
      status: "ACCEPTED",
      guestName: "Bob",
      requestedAt: "2025-01-01T09:00:00Z",
      location: { name: "Pool" },
      acceptedByDriver: { fullName: "Driver One" },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({}),
  });
});

describe("AdminDashboard", () => {
  it("shows loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AdminDashboard />);

    const loading = document.querySelector('[class*="animate-spin"]');
    expect(loading).toBeInTheDocument();
  });

  it("renders dashboard heading", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(summaryResponse),
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(activeResponse),
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Yönetim Paneli")).toBeInTheDocument();
    });
  });

  it("shows stat cards (Toplam Talep, Bekleyen, Tamamlanan, İptal)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(summaryResponse),
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(activeResponse),
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Toplam Talep")).toBeInTheDocument();
      expect(screen.getByText("Bekleyen")).toBeInTheDocument();
      expect(screen.getByText("Tamamlanan")).toBeInTheDocument();
      expect(screen.getByText("İptal")).toBeInTheDocument();
    });
  });

  it("shows stat card values", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(summaryResponse),
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(activeResponse),
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("100")).toBeInTheDocument();
      // 10 appears twice (pending: 10, cancelled: 10) — check at least 2
      expect(screen.getAllByText("10").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("75")).toBeInTheDocument();
    });
  });

  it("shows avg response time and avg completion time", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(summaryResponse),
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(activeResponse),
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Ort. Tepki Süresi")).toBeInTheDocument();
      expect(screen.getByText("Ort. Tamamlama Süresi")).toBeInTheDocument();
      // avgResponseTime = 120s -> 2d 0s
      expect(screen.getByText("2d 0s")).toBeInTheDocument();
      // avgCompletionTime = 600s -> 10d 0s
      expect(screen.getByText("10d 0s")).toBeInTheDocument();
    });
  });

  it("shows dash when avg time is null", async () => {
    const noTimesResponse = {
      ...summaryResponse,
      data: { ...summaryResponse.data, avgResponseTime: null, avgCompletionTime: null },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(noTimesResponse),
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(activeResponse),
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("shows active requests table", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(summaryResponse),
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(activeResponse),
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Aktif Talepler")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Driver One")).toBeInTheDocument();
    });
  });
});
