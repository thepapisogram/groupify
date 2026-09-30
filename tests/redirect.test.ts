import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/redirect";

describe("safeCallbackUrl", () => {
  it("allows same-site relative paths, including query strings", () => {
    expect(safeCallbackUrl("/invites/abc123")).toBe("/invites/abc123");
    expect(safeCallbackUrl("/forms?tab=shared")).toBe("/forms?tab=shared");
  });

  it("falls back for missing values", () => {
    expect(safeCallbackUrl(null)).toBe("/");
    expect(safeCallbackUrl(undefined)).toBe("/");
    expect(safeCallbackUrl("")).toBe("/");
    expect(safeCallbackUrl(null, "/forms")).toBe("/forms");
  });

  it.each([
    "https://evil.example",
    "http://evil.example/x",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "evil.example",
    "/ok\n//evil.example",
    "/ok\t",
  ])("rejects %j", (bad) => {
    expect(safeCallbackUrl(bad)).toBe("/");
  });
});
