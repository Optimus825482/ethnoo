// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BuggiesPage from "@/app/(admin)/admin/buggies/page";

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

const buggiesResponse = {
  success: true,
  data: {
    items: [
      {
        id: 1,
        code: "BG-001",
        model: "Test Model",
        licensePlate: "ABC-123",
        icon: "🚗",
        status: "AVAILABLE",
        isOnline: true,
        isActive: true,
        currentLocation: { name: "Lobby" },
        drivers: [{ driver: { id: 1, fullName: "Driver One" } }],
      },
      {
        id: 2,
        code: "BG-002",
        model: "Eco Buggy",
        licensePlate: null,
        icon: "🚙",
        status: "BUSY",
        isActive: true,
        currentLocation: null,
        drivers: [],
      },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({}),
  });
});

describe("BuggiesPage", () => {
  it("shows loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<BuggiesPage />);

    const loading = document.querySelector('[class*="animate-spin"]');
    expect(loading).toBeInTheDocument();
  });

  it("shows buggy list with code, model, status", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(buggiesResponse),
    });

    render(<BuggiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Araçlar")).toBeInTheDocument();
      expect(screen.getByText(/BG-001/)).toBeInTheDocument();
      expect(screen.getByText(/BG-002/)).toBeInTheDocument();
      expect(screen.getByText("Test Model")).toBeInTheDocument();
      expect(screen.getByText("Eco Buggy")).toBeInTheDocument();
      expect(screen.getByText("MUSAİT")).toBeInTheDocument();
      expect(screen.getByText("MESGUL")).toBeInTheDocument();
    });
  });

  it("shows Araç Ekle button", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(buggiesResponse),
    });

    render(<BuggiesPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /araç ekle/i })).toBeInTheDocument();
    });
  });

  it("Araç Ekle button opens dialog", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(buggiesResponse),
    });

    render(<BuggiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Araçlar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /araç ekle/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /araç ekle/i })).toBeInTheDocument();
    });
  });

  it("Düzenle button pre-fills form", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(buggiesResponse),
    });

    render(<BuggiesPage />);

    await waitFor(() => {
      expect(screen.getByText(/BG-001/)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole("button", { name: /düzenle/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Araç Düzenle")).toBeInTheDocument();
    });

    const codeInput = screen.getByLabelText("Kod") as HTMLInputElement;
    expect(codeInput.value).toBe("BG-001");
  });

  it("form submission creates a new buggy", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(buggiesResponse),
    });

    render(<BuggiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Araçlar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /araç ekle/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /araç ekle/i })).toBeInTheDocument();
    });

    const codeInput = screen.getByLabelText("Kod");
    const modelInput = screen.getByLabelText("Model");

    fireEvent.change(codeInput, { target: { value: "BG-NEW" } });
    fireEvent.change(modelInput, { target: { value: "New Buggy" } });

    // Mock create API call
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });
    // Mock load() after create
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(buggiesResponse),
    });

    fireEvent.click(screen.getByRole("button", { name: /oluştur/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/buggies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "BG-NEW", model: "New Buggy", licensePlate: "", icon: "🚗" }),
      });
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Araç oluşturuldu");
    });
  });

  it("toggle status button calls PATCH", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(buggiesResponse),
    });

    render(<BuggiesPage />);

    await waitFor(() => {
      expect(screen.getByText(/BG-001/)).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole("button", { name: /kapat|aktif et/i });
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/buggies/1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "OFFLINE" }),
      });
    });
  });
});
