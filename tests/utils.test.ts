import { describe, it, expect } from "vitest";
import { cn, generateToken, hashToken } from "@/lib/utils";

describe("cn()", () => {
  it("merges class names with tailwind-merge", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles clsx conditional args", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves tailwind conflicts (last wins)", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined/null gracefully", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});

describe("generateToken()", () => {
  it("returns hex string of requested byte length * 2", () => {
    const token = generateToken(16);
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it("returns different values on each call", () => {
    const a = generateToken(8);
    const b = generateToken(8);
    expect(a).not.toBe(b);
  });

  it("handles length 0", () => {
    expect(generateToken(0)).toBe("");
  });

  it("handles length 32 (256-bit)", () => {
    const token = generateToken(32);
    expect(token).toHaveLength(64);
  });
});

describe("hashToken()", () => {
  it("returns SHA-256 hex digest", () => {
    const hash = hashToken("hello");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic -- same input same output", () => {
    const input = "test-token-123";
    expect(hashToken(input)).toBe(hashToken(input));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("abc")).not.toBe(hashToken("xyz"));
  });

  it("handles empty string", () => {
    const hash = hashToken("");
    expect(hash).toHaveLength(64);
  });

  it("matches known SHA-256 of 'hello'", () => {
    const expected =
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
    expect(hashToken("hello")).toBe(expected);
  });
});
