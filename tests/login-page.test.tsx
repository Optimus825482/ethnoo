// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

// Hoisted shared mocks for use in vi.mock factories
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

const setupResponse = { success: true, data: { setupRequired: false } };

beforeEach(() => {
  vi.clearAllMocks();
  // Catch-all default: any unexpected fetch returns empty JSON (prevents unhandled rejections from stray effect calls)
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({}),
  });
});

async function renderAndWaitForForm() {
  // Mock the setup check API call (happens on mount in useEffect)
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    json: () => Promise.resolve(setupResponse),
  });
  render(<LoginPage />);
  // Wait for the initial loading check to complete and form to appear
  await waitFor(() => expect(screen.getByText("Sign in")).toBeInTheDocument());
}

async function fillAndSubmitForm(opts?: { username?: string; password?: string }) {
  const username = opts?.username ?? "admin";
  const password = opts?.password ?? "admin123";

  const usernameInput = screen.getByLabelText("Username");
  const passwordInput = screen.getByLabelText("Password");

  fireEvent.change(usernameInput, { target: { value: username } });
  fireEvent.change(passwordInput, { target: { value: password } });

  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("LoginPage", () => {
  it("renders the login form", async () => {
    await renderAndWaitForForm();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("shows ShuttleCall logo", async () => {
    await renderAndWaitForForm();
    const logo = screen.getByAltText("ShuttleCall");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/images/logo.png");
  });

  it("shows submit button", async () => {
    await renderAndWaitForForm();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("does not show demo credentials in production", async () => {
    await renderAndWaitForForm();
    expect(screen.queryByText(/Demo credentials/i)).not.toBeInTheDocument();
  });

  it("calls /api/auth/login on submit with valid data", async () => {
    await renderAndWaitForForm();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { user: { role: "ADMIN" } } }),
    });

    await fillAndSubmitForm();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin123" }),
      });
    });
  });

  it("redirects admin to /admin/dashboard on success", async () => {
    await renderAndWaitForForm();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { user: { role: "ADMIN" } } }),
    });

    await fillAndSubmitForm();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
    });
  });

  it("redirects driver to /driver/dashboard on success", async () => {
    await renderAndWaitForForm();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { user: { role: "DRIVER" } } }),
    });

    await fillAndSubmitForm();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/driver/dashboard");
    });
  });

  it("redirects to /change-password when mustChangePassword is true", async () => {
    await renderAndWaitForForm();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { mustChangePassword: true, user: { role: "ADMIN" } },
      }),
    });

    await fillAndSubmitForm();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/change-password");
    });
  });

  it("shows error toast on failed login", async () => {
    await renderAndWaitForForm();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        error: { message: "Invalid credentials" },
      }),
    });

    await fillAndSubmitForm();

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Invalid credentials");
    });
  });

  it("shows generic error toast when no error message", async () => {
    await renderAndWaitForForm();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: {} }),
    });

    await fillAndSubmitForm();

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Login failed");
    });
  });

  it("shows network error toast on fetch rejection", async () => {
    await renderAndWaitForForm();

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

    await fillAndSubmitForm();

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Network error");
    });
  });

  it("disables button while loading", async () => {
    await renderAndWaitForForm();

    // Defer the login response so we can observe the loading state
    let resolveLogin!: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => { resolveLogin = resolve; });

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      json: () => loginPromise,
    }));

    await fillAndSubmitForm();

    // Button should be disabled and "Sign in" text replaced by spinner
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeDisabled();
    });
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();

    // Resolve login to complete the test cleanly
    resolveLogin({ success: true, data: { user: { role: "ADMIN" } } });
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
  });
});
