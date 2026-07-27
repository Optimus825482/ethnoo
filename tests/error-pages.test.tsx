// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorPage from "@/app/error";
import NotFoundPage from "@/app/not-found";

// next/link renders an <a> tag - mock to avoid Next.js router dependencies
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("Error page", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("does not expose internal error details", () => {
    render(<ErrorPage error={new Error("Test error")} reset={() => {}} />);
    expect(screen.queryByText("Test error")).not.toBeInTheDocument();
  });

  it("renders heading", () => {
    render(<ErrorPage error={new Error("Something went wrong")} reset={() => {}} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders Try again button", () => {
    render(<ErrorPage error={new Error("Oops")} reset={() => {}} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls reset on Try again click", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("Oops")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("logs error to console", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const testError = new Error("Logged error");
    render(<ErrorPage error={testError} reset={() => {}} />);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"client error boundary"'));
  });

  it("displays fallback message when error has no message", () => {
    render(<ErrorPage error={new Error()} reset={() => {}} />);
    expect(screen.getByText("An unexpected error occurred. Reference: unavailable")).toBeInTheDocument();
  });
});

describe("Not-found page", () => {
  it("renders 404 heading", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders Page not found title", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("renders descriptive text", () => {
    render(<NotFoundPage />);
    expect(
      screen.getByText("The page you are looking for does not exist.")
    ).toBeInTheDocument();
  });

  it("renders Go home button linking to /", () => {
    render(<NotFoundPage />);
    const link = screen.getByRole("link", { name: /go home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});
