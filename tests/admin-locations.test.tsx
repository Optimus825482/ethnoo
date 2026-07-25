// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LocationsPage from "@/app/(admin)/admin/locations/page";

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

const locationsResponse = {
  success: true,
  data: {
    items: [
      {
        id: 1,
        name: "Lobby",
        description: "Main entrance",
        displayOrder: 1,
        isActive: true,
        qrCodeData: "data:image/png;base64,abc123",
        mapX: null,
        mapY: null,
      },
      {
        id: 2,
        name: "Pool",
        description: null,
        displayOrder: 2,
        isActive: true,
        qrCodeData: null,
        mapX: null,
        mapY: null,
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

describe("LocationsPage", () => {
  it("shows loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<LocationsPage />);

    const loading = document.querySelector('[class*="animate-spin"]');
    expect(loading).toBeInTheDocument();
  });

  it("shows location list", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(locationsResponse),
    });

    render(<LocationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Konumlar")).toBeInTheDocument();
      expect(screen.getByText("Lobby")).toBeInTheDocument();
      expect(screen.getByText("Pool")).toBeInTheDocument();
    });
  });

  it("shows description, display order, status", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(locationsResponse),
    });

    render(<LocationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Main entrance")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getAllByText("Aktif").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("Konum Ekle button opens dialog", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(locationsResponse),
    });

    render(<LocationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Konumlar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /konum ekle/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /konum ekle/i })).toBeInTheDocument();
    });
  });

  it("Düzenle button pre-fills form", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(locationsResponse),
    });

    render(<LocationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Lobby")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole("button", { name: /düzenle/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Konum Düzenle")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("Ad") as HTMLInputElement;
    expect(nameInput.value).toBe("Lobby");
  });

  it("QR generation button calls POST /api/locations/{id}/qr", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(locationsResponse),
    });

    render(<LocationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Lobby")).toBeInTheDocument();
    });

    const qrButtons = screen.getAllByRole("button", { name: /qr oluştur/i });
    fireEvent.click(qrButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/locations/1/qr", {
        method: "POST",
      });
    });
  });

  it("form submission creates a new location", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(locationsResponse),
    });

    render(<LocationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Konumlar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /konum ekle/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /konum ekle/i })).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("Ad");
    fireEvent.change(nameInput, { target: { value: "Beach" } });

    // Mock create API
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });
    // Mock load() after create
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(locationsResponse),
    });

    fireEvent.click(screen.getByRole("button", { name: /oluştur/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Beach",
          description: undefined,
          displayOrder: 0,
          mapX: null,
          mapY: null,
        }),
      });
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Konum oluşturuldu");
    });
  });
});
