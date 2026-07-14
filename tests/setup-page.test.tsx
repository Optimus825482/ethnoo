// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SetupPage from "@/app/(setup)/setup/page";

const { mockPush, mockToast } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

const setupRequiredResponse = {
  success: true,
  data: { setupRequired: true },
};

const setupNotRequiredResponse = {
  success: true,
  data: { setupRequired: false },
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({}),
  });
});

describe("SetupPage", () => {
  it("shows loading spinner on mount", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<SetupPage />);

    const loading = document.querySelector('[class*="animate-spin"]');
    expect(loading).toBeInTheDocument();
  });

  it("redirects to /login when setup not required", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(setupNotRequiredResponse),
    });

    render(<SetupPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows setup form when setup required", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(setupRequiredResponse),
    });

    render(<SetupPage />);

    await waitFor(() => {
      expect(screen.getByText("Kurulum")).toBeInTheDocument();
      expect(screen.getByText("Otel Bilgileri")).toBeInTheDocument();
      expect(screen.getByText("Yönetici Hesabı")).toBeInTheDocument();
    });
  });

  it("shows all form fields", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(setupRequiredResponse),
    });

    render(<SetupPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Otel Adı")).toBeInTheDocument();
      expect(screen.getByLabelText("Otel Kodu")).toBeInTheDocument();
      expect(screen.getByLabelText("Zaman Dilimi")).toBeInTheDocument();
      expect(screen.getByLabelText("Yönetici Kullanıcı Adı")).toBeInTheDocument();
      expect(screen.getByLabelText("Ad Soyad")).toBeInTheDocument();
      expect(screen.getByLabelText("E-posta")).toBeInTheDocument();
      expect(screen.getByLabelText("Şifre")).toBeInTheDocument();
    });
  });

  it("shows submit button with Kurulumu Tamamla text", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(setupRequiredResponse),
    });

    render(<SetupPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /kurulumu tamamla/i }),
      ).toBeInTheDocument();
    });
  });

  it("form submission creates hotel and admin", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(setupRequiredResponse),
    });

    render(<SetupPage />);

    await waitFor(() => {
      expect(screen.getByText("Kurulum")).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText("Otel Adı"), {
      target: { value: "Test Hotel" },
    });
    fireEvent.change(screen.getByLabelText("Otel Kodu"), {
      target: { value: "TEST" },
    });
    fireEvent.change(screen.getByLabelText("Ad Soyad"), {
      target: { value: "Admin User" },
    });
    fireEvent.change(screen.getByLabelText("Şifre"), {
      target: { value: "StrongPass1!" },
    });

    // Mock setup POST
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });

    fireEvent.click(screen.getByRole("button", { name: /kurulumu tamamla/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelName: "Test Hotel",
          hotelCode: "TEST",
          timezone: "Europe/Istanbul",
          adminUsername: "admin",
          adminPassword: "StrongPass1!",
          adminFullName: "Admin User",
          adminEmail: "",
        }),
      });
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Setup completed! Please login.",
      );
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows error toast on failed submission", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(setupRequiredResponse),
    });

    render(<SetupPage />);

    await waitFor(() => {
      expect(screen.getByText("Kurulum")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Otel Adı"), {
      target: { value: "Test Hotel" },
    });
    fireEvent.change(screen.getByLabelText("Otel Kodu"), {
      target: { value: "TEST" },
    });
    fireEvent.change(screen.getByLabelText("Ad Soyad"), {
      target: { value: "Admin" },
    });
    fireEvent.change(screen.getByLabelText("Şifre"), {
      target: { value: "Pass1!" },
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        error: { message: "Hotel code already exists" },
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: /kurulumu tamamla/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Hotel code already exists");
    });
  });
});
