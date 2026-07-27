// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GuestCallPage from "@/app/(guest)/guest/call/page";

const { push, searchParams, toast } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: { get: vi.fn(() => "7") },
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useSearchParams: () => searchParams }));
vi.mock("sonner", () => ({ toast }));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  document.cookie = "";
});

describe("GuestCallPage capability flow", () => {
  it("defines reduced motion and fine-pointer hover gates", () => {
    const css = readFileSync(resolve("src/app/globals.css"), "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
  });

  it("stores create capability only in request-scoped sessionStorage before navigation", async () => {
    const capability = "c".repeat(43);
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: { id: 7, name: "Lobi", logo: null } }) })
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: { request: { id: 42 }, guestCapability: capability } }) });

    render(<GuestCallPage />);
    await screen.findByRole("button", { name: "Shuttle çağır" });
    fireEvent.click(screen.getByRole("button", { name: "Shuttle çağır" }));
    fireEvent.click(screen.getByRole("button", { name: "Evet, Çağır" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/guest/status/42"));
    expect(sessionStorage.getItem("guest-capability:42")).toBe(capability);
    expect(localStorage.length).toBe(0);
    expect(document.cookie).not.toContain(capability);
    expect(location.href).not.toContain(capability);
  });

  it("uses explicit short interaction motion without decorative infinite animation", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ json: async () => ({ success: true, data: { id: 7, name: "Lobi", logo: null } }) });
    const { container } = render(<GuestCallPage />);
    const trigger = await screen.findByRole("button", { name: "Shuttle çağır" });
    expect(trigger).toHaveClass("transition-[transform,opacity,background-color,box-shadow]", "duration-200", "ease-out");
    expect(container.innerHTML).not.toContain("infinite");
  });

  it("uses an accessible modal, closes with Escape, and returns focus", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ json: async () => ({ success: true, data: { id: 7, name: "Lobi", logo: null } }) });
    render(<GuestCallPage />);
    const trigger = await screen.findByRole("button", { name: "Shuttle çağır" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Shuttle Çağırmak İstiyor musunuz?" })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
