// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GuestCallPage from "@/app/(guest)/guest/call/page";

// Hoisted shared mocks
const { mockPush, mockToast, mockSearchParams } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn() },
  mockSearchParams: { get: vi.fn(() => null) },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

const locationsResponse = {
  success: true,
  data: {
    items: [
      { id: 1, name: "Lobby" },
      { id: 2, name: "Pool" },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

async function renderAndWaitForLocations() {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    json: () => Promise.resolve(locationsResponse),
  });
  render(<GuestCallPage />);
  // Wait for loading to complete and form to appear
  await waitFor(() => expect(screen.getByText("Call a Buggy")).toBeInTheDocument());
}

describe("GuestCallPage", () => {
  it("renders logo", async () => {
    await renderAndWaitForLocations();
    const logo = screen.getByAltText("ShuttleCall");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/images/logo.png");
  });

  it("loads locations on mount", async () => {
    await renderAndWaitForLocations();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/locations");
    });
  });

  it("renders form fields", async () => {
    await renderAndWaitForLocations();

    expect(screen.getByLabelText(/pickup location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/room number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it("submit button text says Call Buggy", async () => {
    await renderAndWaitForLocations();
    expect(screen.getByRole("button", { name: /call buggy/i })).toBeInTheDocument();
  });

  it("handles form submission", async () => {
    await renderAndWaitForLocations();

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText(/room number/i), { target: { value: "101" } });
    fireEvent.change(screen.getByLabelText(/phone \(optional\)/i), { target: { value: "+1234567890" } });
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: "Near elevator" } });

    // Mock the POST request API
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { id: 42 } }),
    });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /call buggy/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: 1, // Default first location
          guestName: "John",
          roomNumber: "101",
          phone: "+1234567890",
          notes: "Near elevator",
        }),
      });
    });
  });

  it("shows success toast and redirects on success", async () => {
    await renderAndWaitForLocations();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { id: 42 } }),
    });

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "John" } });
    fireEvent.click(screen.getByRole("button", { name: /call buggy/i }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Request sent!");
      expect(mockPush).toHaveBeenCalledWith("/guest/status/42");
    });
  });

  it("shows error toast on failure", async () => {
    await renderAndWaitForLocations();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        error: { message: "All buggies are busy" },
      }),
    });

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "John" } });
    fireEvent.click(screen.getByRole("button", { name: /call buggy/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("All buggies are busy");
    });
  });

  it("preselects location from search params", async () => {
    mockSearchParams.get.mockReturnValueOnce("5");

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: {
          items: [
            { id: 1, name: "Lobby" },
            { id: 5, name: "Beach" },
          ],
        },
      }),
    });

    render(<GuestCallPage />);

    // After load, location from search params should be preserved
    await waitFor(() => expect(screen.getByText("Call a Buggy")).toBeInTheDocument());

    // Submit to verify locationId matches the search param
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { id: 1 } }),
    });

    fireEvent.click(screen.getByRole("button", { name: /call buggy/i }));

    await waitFor(() => {
      // The body should contain locationId: 5 (from search params, overridden by setState)
      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === "/api/requests"
      );
      expect(call).toBeDefined();
      const body = JSON.parse((call as [string, RequestInit])[1].body as string);
      expect(body.locationId).toBe(5);
    });
  });

  it("shows loading spinner on mount", () => {
    // Don't resolve the locations fetch - keep loading
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(new Promise(() => {}));
    render(<GuestCallPage />);

    // Should show the full page loading spinner (text should not be present)
    expect(screen.queryByText("Call a Buggy")).not.toBeInTheDocument();
  });
});
