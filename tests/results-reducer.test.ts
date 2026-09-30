import { describe, expect, it, vi } from "vitest";

// The hook module pulls in UI helpers; only the pure reducer is under test here.
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock("@/lib/grouping-client", () => ({ groupPeopleAsync: vi.fn() }));

import { resultsReducer, type ResultsState } from "@/components/groupify/use-grouping";
import type { Group } from "@/lib/grouping";

const g = (id: number, members: string[]): Group => ({
  id,
  label: `Group ${id}`,
  members,
  rawMembers: members.map(() => ({})),
  originalIds: members.map((m) => m.toLowerCase()),
  hue: 185,
});

const empty: ResultsState = { groups: [], history: [], warnings: [] };
const first = [g(1, ["A", "B"]), g(2, ["C"])];
const second = [g(1, ["C", "A"]), g(2, ["B"])];

describe("resultsReducer", () => {
  it("commits new groups without recording an empty state in history", () => {
    const next = resultsReducer(empty, { type: "commit", groups: first, warnings: ["w"] });
    expect(next.groups).toBe(first);
    expect(next.warnings).toEqual(["w"]);
    expect(next.history).toEqual([]);
  });

  it("remembers the previous groups on every change and can undo back to the start", () => {
    let s = resultsReducer(empty, { type: "commit", groups: first, warnings: [] });
    s = resultsReducer(s, { type: "commit", groups: second, warnings: [] });
    s = resultsReducer(s, { type: "rename", groupId: 1, label: "Red" });
    s = resultsReducer(s, { type: "move", from: 1, index: 0, to: 2 });
    expect(s.history).toHaveLength(3);

    s = resultsReducer(s, { type: "undo" });
    expect(s.groups[0].members).toEqual(["C", "A"]); // before the move
    expect(s.groups[0].label).toBe("Red");
    s = resultsReducer(s, { type: "undo" });
    expect(s.groups[0].label).toBe("Group 1"); // before the rename
    s = resultsReducer(s, { type: "undo" });
    expect(s.groups).toEqual(first);
    expect(resultsReducer(s, { type: "undo" })).toBe(s); // nothing left: no-op
  });

  it("does not add history for no-op edits", () => {
    const s = resultsReducer(empty, { type: "commit", groups: first, warnings: [] });
    expect(resultsReducer(s, { type: "rename", groupId: 1, label: "   " })).toBe(s);
    expect(resultsReducer(s, { type: "move", from: 1, index: 0, to: 1 })).toBe(s);
    expect(resultsReducer(s, { type: "move", from: 1, index: 99, to: 2 })).toBe(s);
  });

  it("is pure: applying the same action twice from the same state gives equal results", () => {
    const s = resultsReducer(empty, { type: "commit", groups: first, warnings: [] });
    const action = { type: "move", from: 1, index: 0, to: 2 } as const;
    expect(resultsReducer(s, action)).toEqual(resultsReducer(s, action));
    expect(s.groups).toEqual(first); // input untouched
  });

  it("clears warnings when the user edits by hand", () => {
    const s = resultsReducer(empty, { type: "commit", groups: first, warnings: ["couldn't keep apart"] });
    expect(resultsReducer(s, { type: "move", from: 1, index: 0, to: 2 }).warnings).toEqual([]);
  });

  it("caps history so it can't grow forever", () => {
    let s = resultsReducer(empty, { type: "commit", groups: first, warnings: [] });
    for (let i = 0; i < 40; i++) s = resultsReducer(s, { type: "commit", groups: [g(1, [`x${i}`])], warnings: [] });
    expect(s.history.length).toBeLessThanOrEqual(15);
  });

  it("restore replaces everything and clears history; clear empties it", () => {
    let s = resultsReducer(empty, { type: "commit", groups: first, warnings: [] });
    s = resultsReducer(s, { type: "commit", groups: second, warnings: ["w"] });
    s = resultsReducer(s, { type: "restore", groups: first });
    expect(s).toEqual({ groups: first, history: [], warnings: [] });
    expect(resultsReducer(s, { type: "clear" })).toEqual(empty);
  });
});
