// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SetupPage from "@/app/(setup)/setup/page";

const { mockPush, mockToast } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("sonner", () => ({ toast: mockToast }));

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

async function checkSetup(setupRequired = true) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    json: () => Promise.resolve({ success: true, data: { setupRequired } }),
  });
  fireEvent.change(screen.getByLabelText("Kurulum Anahtarı"), { target: { value: "setup-secret" } });
  fireEvent.click(screen.getByRole("button", { name: "Devam Et" }));
}

describe("SetupPage", () => {
  it("does not disclose state before collecting the setup secret", () => {
    render(<SetupPage />);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Devam Et" })).toBeDisabled();
  });

  it("checks setup state using the secret header", async () => {
    render(<SetupPage />);
    await checkSetup();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/setup", {
      headers: { "x-setup-secret": "setup-secret" },
    }));
    expect(await screen.findByText("Otel Bilgileri")).toBeInTheDocument();
  });

  it("redirects when setup is complete", async () => {
    render(<SetupPage />);
    await checkSetup(false);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });

  it("submits the same verified secret", async () => {
    render(<SetupPage />);
    await checkSetup();
    await screen.findByText("Otel Bilgileri");
    fireEvent.change(screen.getByLabelText("Otel Adı"), { target: { value: "Test Hotel" } });
    fireEvent.change(screen.getByLabelText("Otel Kodu"), { target: { value: "TEST" } });
    fireEvent.change(screen.getByLabelText("Ad Soyad"), { target: { value: "Admin User" } });
    fireEvent.change(screen.getByLabelText("Şifre"), { target: { value: "StrongPass1!" } });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) });
    fireEvent.click(screen.getByRole("button", { name: /kurulumu tamamla/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith("/api/setup", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"setupSecret":"setup-secret"'),
    })));
  });
});
