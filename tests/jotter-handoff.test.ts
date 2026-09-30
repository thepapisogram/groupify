import { describe, expect, it } from "vitest";
import { buildJotterDraftUrl, parseJotterHandoff, resolveJotterOrigin } from "@/lib/jotter-handoff";

const encode = (value: unknown) => `#jotter=${Buffer.from(JSON.stringify(value)).toString("base64url")}`;

describe("parseJotterHandoff", () => {
  it("reads names, title and a trusted return origin", () => {
    const result = parseJotterHandoff(
      encode({ v: 1, names: [" Ada ", "Grace\nHopper", 7, ""], title: "Team", returnTo: "https://jotter.example/" }),
    );
    expect(result).toEqual({ names: ["Ada", "Grace Hopper"], title: "Team", returnTo: "https://jotter.example" });
  });

  it("drops an untrusted return origin but keeps the names", () => {
    const result = parseJotterHandoff(encode({ v: 1, names: ["Ada"], returnTo: "javascript:alert(1)" }));
    expect(result?.returnTo).toBeNull();
    expect(result?.names).toEqual(["Ada"]);
  });

  it("prefers the configured Jotter URL over the one in the link", () => {
    const result = parseJotterHandoff(
      encode({ v: 1, names: ["Ada"], returnTo: "https://evil.example" }),
      "https://jotter.example",
    );
    expect(result?.returnTo).toBe("https://jotter.example");
  });

  it("caps the list and rejects malformed payloads", () => {
    const many = Array.from({ length: 900 }, (_, i) => `n${i}`);
    expect(parseJotterHandoff(encode({ v: 1, names: many }))?.names).toHaveLength(500);
    expect(parseJotterHandoff("#jotter=!!!")).toBeNull();
    expect(parseJotterHandoff(encode({ v: 2, names: ["Ada"] }))).toBeNull();
    expect(parseJotterHandoff(encode({ v: 1, names: [] }))).toBeNull();
    expect(parseJotterHandoff("#other=abc")).toBeNull();
  });
});

describe("resolveJotterOrigin", () => {
  it("allows https and localhost only", () => {
    expect(resolveJotterOrigin("https://a.example/x")).toBe("https://a.example");
    expect(resolveJotterOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(resolveJotterOrigin("http://a.example")).toBeNull();
    expect(resolveJotterOrigin("https://u:p@a.example")).toBeNull();
    expect(resolveJotterOrigin(42)).toBeNull();
  });
});

describe("buildJotterDraftUrl", () => {
  it("puts the draft in the fragment", () => {
    const url = new URL(buildJotterDraftUrl("https://jotter.example", "Groups", "Group 1\nAda"));
    expect(url.search).toBe("");
    const json = JSON.parse(Buffer.from(url.hash.slice(5), "base64url").toString());
    expect(json).toEqual({ title: "Groups", content: "Group 1\nAda" });
  });
});
