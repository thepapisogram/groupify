import { describe, expect, it } from "vitest";
import {
  collectTags,
  computeGroupSizes,
  groupPeople,
  moveMember,
  parseNames,
  personKey,
  renameGroup,
  type DistributionMode,
  type Group,
  type GroupBy,
  type Person,
} from "@/lib/grouping";

const people = (labels: string[], tags?: string[]): Person[] =>
  labels.map((label, i) => ({
    key: personKey(label),
    label,
    ...(tags ? { data: { tag: tags[i] } } : {}),
  }));

const range = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`);
const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

/** Size logic of the previous implementation (utils.ts / public worker), kept as a reference. */
function legacySizes(n: number, by: GroupBy, value: number, mode: DistributionMode): number[] {
  if (n === 0 || value < 1) return [];
  if (by === "count") {
    const count = Math.min(value, n);
    const base = Math.floor(n / count);
    const extra = n % count;
    const buckets = Array.from({ length: count }, () => base);
    for (let i = 0; i < extra; i++) buckets[i % count]++;
    return buckets;
  }
  const count = Math.floor(n / value);
  const extra = n % value;
  const buckets = Array.from({ length: count }, () => value);
  if (extra > 0) {
    if (mode === "best" && buckets.length > 0) for (let i = 0; i < extra; i++) buckets[i % buckets.length]++;
    else buckets.push(extra);
  }
  return buckets;
}

describe("computeGroupSizes", () => {
  it("matches the previous behaviour for every combination in a wide grid", () => {
    for (let n = 0; n <= 60; n++) {
      for (const mode of ["best", "overflow"] as const) {
        for (let size = 1; size <= 15; size++) {
          expect(computeGroupSizes(n, "size", size, mode), `n=${n} size=${size} ${mode}`).toEqual(
            legacySizes(n, "size", size, mode),
          );
        }
        for (let count = 1; count <= 15; count++) {
          expect(computeGroupSizes(n, "count", count, mode), `n=${n} count=${count} ${mode}`).toEqual(
            legacySizes(n, "count", count, mode),
          );
        }
      }
    }
  });

  it.each([
    [10, "size", 3, "best", [4, 3, 3]],
    [10, "size", 3, "overflow", [3, 3, 3, 1]],
    [7, "size", 5, "best", [7]],
    [7, "size", 5, "overflow", [5, 2]],
    [3, "size", 5, "best", [3]],
    [10, "count", 3, "best", [4, 3, 3]],
    [2, "count", 5, "best", [1, 1]],
  ] as const)("n=%i by %s=%i (%s) -> %j", (n, by, value, mode, expected) => {
    expect(computeGroupSizes(n, by, value, mode)).toEqual(expected);
  });

  it("always accounts for everyone", () => {
    for (let n = 1; n <= 50; n++) {
      for (let v = 1; v <= 12; v++) {
        for (const by of ["size", "count"] as const) {
          for (const mode of ["best", "overflow"] as const) {
            const sizes = computeGroupSizes(n, by, v, mode);
            expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
            expect(sizes.every((s) => s >= 1)).toBe(true);
          }
        }
      }
    }
  });

  it("returns nothing for empty or invalid input", () => {
    expect(computeGroupSizes(0, "size", 3, "best")).toEqual([]);
    expect(computeGroupSizes(5, "size", 0, "best")).toEqual([]);
    expect(computeGroupSizes(5, "count", NaN, "best")).toEqual([]);
  });
});

describe("parseNames", () => {
  it("handles blank lines, whitespace and Windows line endings", () => {
    const parsed = parseNames("  Ama  \r\n\r\nKofi\n   \n Yaa  Asantewaa ");
    expect(parsed.map((p) => p.label)).toEqual(["Ama", "Kofi", "Yaa  Asantewaa"]);
  });

  it("reads an optional tag after the last bar", () => {
    const [a, b, c] = parseNames("Ama | Advanced\nKofi\nEsi | Beginner | Extra");
    expect(a.data).toEqual({ tag: "Advanced" });
    expect(b.data).toBeUndefined();
    expect(c.label).toBe("Esi | Beginner");
    expect(c.data).toEqual({ tag: "Extra" });
  });

  it("keys names case- and space-insensitively so rules survive edits", () => {
    expect(parseNames("Ama  Mensah")[0].key).toBe(parseNames("ama mensah")[0].key);
  });

  it("lists distinct tags in order", () => {
    expect(collectTags(parseNames("a|X\nb|Y\nc|X\nd"))).toEqual(["X", "Y"]);
  });
});

describe("groupPeople (no rules)", () => {
  it("places everyone exactly once with the requested sizes", () => {
    const list = people(range(23));
    const best = groupPeople(list, { by: "size", value: 5, mode: "best", seed: 1 }).groups;
    expect(best.map((g) => g.members.length)).toEqual([6, 6, 6, 5]);
    expect(best.flatMap((g) => g.members).sort()).toEqual(list.map((p) => p.label).sort());

    const overflow = groupPeople(list, { by: "size", value: 5, mode: "overflow", seed: 1 }).groups;
    expect(overflow.map((g) => g.members.length)).toEqual([5, 5, 5, 5, 3]);
    expect(overflow.flatMap((g) => g.members).sort()).toEqual(list.map((p) => p.label).sort());
  });

  it("is repeatable for a given seed and varies between seeds", () => {
    const list = people(range(20));
    const opts = { by: "count", value: 4, mode: "best" } as const;
    const a = groupPeople(list, { ...opts, seed: 7 });
    const b = groupPeople(list, { ...opts, seed: 7 });
    const c = groupPeople(list, { ...opts, seed: 8 });
    expect(a.groups).toEqual(b.groups);
    expect(a.groups).not.toEqual(c.groups);
    expect(groupPeople(list, { ...opts, seed: "class-5B" }).groups).toEqual(
      groupPeople(list, { ...opts, seed: "class-5B" }).groups,
    );
  });

  it("keeps labels, keys and raw data aligned", () => {
    const list: Person[] = [
      { key: "s1", label: "Ama", data: { team: "Red" } },
      { key: "s2", label: "Kofi", data: { team: "Blue" } },
      { key: "s3", label: "Esi", data: { team: "Red" } },
    ];
    const { groups } = groupPeople(list, { by: "count", value: 1, mode: "best", seed: 3 });
    const g = groups[0];
    g.members.forEach((label, i) => {
      const source = list.find((p) => p.label === label)!;
      expect(g.originalIds![i]).toBe(source.key);
      expect(g.rawMembers![i]).toEqual(source.data);
    });
  });

  it("returns no groups for an empty list", () => {
    expect(groupPeople([], { by: "size", value: 3, mode: "best" }).groups).toEqual([]);
  });

  it("gives every group a label, id and colour", () => {
    const { groups } = groupPeople(people(range(9)), { by: "size", value: 3, mode: "best", seed: 2 });
    expect(groups.map((g) => g.label)).toEqual(["Group 1", "Group 2", "Group 3"]);
    expect(groups.map((g) => g.id)).toEqual([1, 2, 3]);
    expect(new Set(groups.map((g) => g.hue)).size).toBe(3);
  });
});

describe("keep together", () => {
  it("keeps every listed member in one group, across many seeds", () => {
    const list = people(range(12));
    for (const seed of seeds) {
      const { groups, warnings } = groupPeople(list, {
        by: "size",
        value: 4,
        mode: "best",
        seed,
        together: [[personKey("P1"), personKey("P2"), personKey("P3")], [personKey("P4"), personKey("P5")]],
      });
      const groupOf = (name: string) => groups.findIndex((g) => g.members.includes(name));
      expect(groupOf("P1")).toBe(groupOf("P2"));
      expect(groupOf("P2")).toBe(groupOf("P3"));
      expect(groupOf("P4")).toBe(groupOf("P5"));
      expect(groups.map((g) => g.members.length)).toEqual([4, 4, 4]);
      expect(warnings).toEqual([]);
    }
  });

  it("warns when a set is bigger than any group instead of dropping members", () => {
    const list = people(range(8));
    const { groups, warnings } = groupPeople(list, {
      by: "size",
      value: 2,
      mode: "best",
      seed: 1,
      together: [[personKey("P1"), personKey("P2"), personKey("P3")]],
    });
    expect(groups.flatMap((g) => g.members)).toHaveLength(8);
    expect(warnings.join(" ")).toMatch(/group sizes vary/);
  });

  it("ignores rules that name people who are no longer in the list", () => {
    const list = people(range(6));
    const { groups } = groupPeople(list, {
      by: "size",
      value: 3,
      mode: "best",
      seed: 1,
      together: [[personKey("P1"), personKey("Gone")]],
    });
    expect(groups.flatMap((g) => g.members)).toHaveLength(6);
  });
});

describe("keep apart", () => {
  it("separates listed members whenever that is possible, across many seeds", () => {
    const list = people(range(12));
    const a = personKey("P1"), b = personKey("P2"), c = personKey("P3"), d = personKey("P4");
    for (const seed of seeds) {
      const { groups, warnings } = groupPeople(list, {
        by: "count",
        value: 4,
        mode: "best",
        seed,
        apart: [[a, b, c, d]],
      });
      const homes = ["P1", "P2", "P3", "P4"].map((n) => groups.findIndex((g) => g.members.includes(n)));
      expect(new Set(homes).size).toBe(4);
      expect(warnings).toEqual([]);
    }
  });

  it("handles several overlapping pairs", () => {
    const list = people(range(10));
    const pair = (x: string, y: string) => [personKey(x), personKey(y)];
    for (const seed of seeds) {
      const { groups } = groupPeople(list, {
        by: "count",
        value: 5,
        mode: "best",
        seed,
        apart: [pair("P1", "P2"), pair("P2", "P3"), pair("P3", "P4"), pair("P1", "P4")],
      });
      const home = (n: string) => groups.findIndex((g) => g.members.includes(n));
      expect(home("P1")).not.toBe(home("P2"));
      expect(home("P2")).not.toBe(home("P3"));
      expect(home("P3")).not.toBe(home("P4"));
      expect(home("P1")).not.toBe(home("P4"));
    }
  });

  it("warns, rather than hiding it, when separation is impossible", () => {
    const list = people(range(6));
    const { groups, warnings } = groupPeople(list, {
      by: "count",
      value: 2,
      mode: "best",
      seed: 1,
      apart: [[personKey("P1"), personKey("P2"), personKey("P3")]],
    });
    expect(groups.flatMap((g) => g.members)).toHaveLength(6);
    expect(warnings.join(" ")).toMatch(/Couldn't keep apart/);
  });

  it("flags a pair that is both together and apart", () => {
    const { warnings } = groupPeople(people(range(6)), {
      by: "count",
      value: 2,
      mode: "best",
      seed: 1,
      together: [[personKey("P1"), personKey("P2")]],
      apart: [[personKey("P1"), personKey("P2")]],
    });
    expect(warnings.join(" ")).toMatch(/Can't both keep together and apart/);
  });
});

describe("balance by attribute", () => {
  it("spreads two equal categories evenly, every time", () => {
    const labels = range(12);
    const tags = labels.map((_, i) => (i < 6 ? "A" : "B"));
    for (const seed of seeds) {
      const { groups } = groupPeople(people(labels, tags), {
        by: "count",
        value: 3,
        mode: "best",
        seed,
        balanceBy: "tag",
      });
      for (const g of groups) {
        const a = g.rawMembers!.filter((m) => m.tag === "A").length;
        expect(a, `seed ${seed}`).toBe(2);
      }
    }
  });

  it("spreads a minority category one per group", () => {
    const labels = range(9);
    const tags = labels.map((_, i) => (i < 3 ? "Advanced" : "Beginner"));
    for (const seed of seeds) {
      const { groups } = groupPeople(people(labels, tags), {
        by: "size",
        value: 3,
        mode: "best",
        seed,
        balanceBy: "tag",
      });
      for (const g of groups) {
        expect(g.rawMembers!.filter((m) => m.tag === "Advanced")).toHaveLength(1);
      }
    }
  });

  it("copes with multi-valued (checklist) attributes", () => {
    const list: Person[] = range(8).map((label, i) => ({
      key: personKey(label),
      label,
      data: { skills: i < 4 ? ["JS", "Py"] : ["Go"] },
    }));
    const { groups } = groupPeople(list, { by: "count", value: 2, mode: "best", seed: 5, balanceBy: "skills" });
    for (const g of groups) {
      expect(g.rawMembers!.filter((m) => (m.skills as string[]).includes("JS"))).toHaveLength(2);
    }
  });

  it("ignores people without the attribute rather than failing", () => {
    const list = people(range(6), ["A", "A", "A", "", "", ""]);
    const { groups } = groupPeople(list, { by: "count", value: 3, mode: "best", seed: 1, balanceBy: "tag" });
    expect(groups.flatMap((g) => g.members)).toHaveLength(6);
  });

  it("combines with keep-together and keep-apart", () => {
    const labels = range(12);
    const tags = labels.map((_, i) => (i % 2 === 0 ? "A" : "B"));
    for (const seed of seeds) {
      const { groups, warnings } = groupPeople(people(labels, tags), {
        by: "count",
        value: 3,
        mode: "best",
        seed,
        balanceBy: "tag",
        together: [[personKey("P1"), personKey("P2")]],
        apart: [[personKey("P3"), personKey("P4")]],
      });
      const home = (n: string) => groups.findIndex((g) => g.members.includes(n));
      expect(home("P1")).toBe(home("P2"));
      expect(home("P3")).not.toBe(home("P4"));
      expect(warnings).toEqual([]);
      for (const g of groups) expect(g.members).toHaveLength(4);
    }
  });
});

describe("performance", () => {
  it("handles 800 people with rules quickly", () => {
    const labels = range(800);
    const tags = labels.map((_, i) => ["A", "B", "C"][i % 3]);
    const started = performance.now();
    const { groups } = groupPeople(people(labels, tags), {
      by: "size",
      value: 5,
      mode: "best",
      seed: 9,
      balanceBy: "tag",
      apart: [[personKey("P1"), personKey("P2")], [personKey("P3"), personKey("P4")]],
    });
    expect(groups.flatMap((g) => g.members)).toHaveLength(800);
    expect(performance.now() - started).toBeLessThan(3000);
  });
});

describe("editing helpers", () => {
  const base = (): Group[] => [
    { id: 1, label: "Group 1", members: ["Ama", "Kofi"], rawMembers: [{ t: "a" }, { t: "b" }], originalIds: ["k1", "k2"], hue: 185 },
    { id: 2, label: "Group 2", members: ["Esi"], rawMembers: [{ t: "c" }], originalIds: ["k3"], hue: 200 },
  ];

  it("renames a group, trimming and ignoring blanks", () => {
    expect(renameGroup(base(), 2, "  Red team ")[1].label).toBe("Red team");
    expect(renameGroup(base(), 2, "   ")).toEqual(base());
    expect(renameGroup(base(), 1, "x".repeat(200))[0].label).toHaveLength(60);
  });

  it("moves a member with its data and key, leaving inputs untouched", () => {
    const groups = base();
    const moved = moveMember(groups, 1, 0, 2);
    expect(moved[0]).toMatchObject({ members: ["Kofi"], rawMembers: [{ t: "b" }], originalIds: ["k2"] });
    expect(moved[1]).toMatchObject({ members: ["Esi", "Ama"], rawMembers: [{ t: "c" }, { t: "a" }], originalIds: ["k3", "k1"] });
    expect(groups).toEqual(base());
  });

  it("can empty a group and ignores invalid moves", () => {
    expect(moveMember(base(), 2, 0, 1)[1].members).toEqual([]);
    expect(moveMember(base(), 1, 0, 1)).toEqual(base());
    expect(moveMember(base(), 1, 9, 2)).toEqual(base());
    expect(moveMember(base(), 1, 0, 99)).toEqual(base());
  });
});
