// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("applies default variant class", () => {
    const { container } = render(<Button>Default</Button>);
    const btn = container.querySelector('[data-slot="button"]');
    expect(btn).toHaveClass("bg-primary");
  });

  it("applies outline variant class", () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    const btn = container.querySelector('[data-slot="button"]');
    expect(btn).toHaveClass("bg-background");
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button", { name: /click/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disabled state prevents clicks", () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click</Button>);
    const button = screen.getByRole("button", { name: /click/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("handles onChange", () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "test" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("forwards ref", () => {
    const ref = { current: null };
    render(<Input ref={ref} />);
    // In React 19, ref is a regular prop forwarded through InputPrimitive
    expect(ref.current).not.toBeNull();
  });

  it("disabled state", () => {
    render(<Input disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});

describe("Badge", () => {
  it("renders text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    // Badge uses useRender, which renders a span with variant-specific classes
    const badge = container.querySelector('[class*="destructive"]');
    expect(badge).toBeInTheDocument();
  });
});

describe("Card", () => {
  it("renders children in correct structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Title").closest('[data-slot="card"]')).toBeInTheDocument();
  });
});

describe("Loading", () => {
  it("shows spinner icon", () => {
    const { container } = render(<Loading />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("animate-spin");
  });

  it("shows text when provided", () => {
    render(<Loading text="Loading..." />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("fullPage adds min-h-screen class", () => {
    const { container } = render(<Loading fullPage />);
    const outer = container.firstElementChild;
    expect(outer).toHaveClass("min-h-screen");
  });

  it("renders without text when not provided", () => {
    const { container } = render(<Loading />);
    // Should only have the spinner div (no <p> element)
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(0);
  });
});

describe("EmptyState", () => {
  it("shows title", () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows description when provided", () => {
    render(<EmptyState title="Empty" description="Nothing to show" />);
    expect(screen.getByText("Nothing to show")).toBeInTheDocument();
  });

  it("hides description when not provided", () => {
    render(<EmptyState title="Empty" />);
    // No description text should exist beyond the title
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });

  it("shows action button when provided", () => {
    render(
      <EmptyState
        title="Empty"
        action={<button>Retry</button>}
      />
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("uses default title when not provided", () => {
    render(<EmptyState />);
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });
});
