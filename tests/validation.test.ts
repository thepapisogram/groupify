import { describe, expect, it } from "vitest";
import {
  LIMITS,
  cleanName,
  emailLookupCandidates,
  fieldErrors,
  isValidEmail,
  normalizeEmail,
  parseFormDefinition,
  parsePublishedGroups,
  validatePassword,
  validateSubmission,
} from "@/lib/validation";
import type { FormField } from "@/lib/models";

const fields: FormField[] = [
  { id: "name", label: "Name", type: "text", isPrimary: true, required: true },
  { id: "age", label: "Age", type: "number" },
  { id: "team", label: "Team", type: "select", options: ["Red", "Blue"], required: true },
  { id: "diet", label: "Diet", type: "radio", options: ["Any", "Veg"] },
  { id: "skills", label: "Skills", type: "checklist", options: ["JS", "Py", "Go"] },
];

const valid = { name: "Ama", team: "Red" };

describe("emails", () => {
  it("normalises case and whitespace", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM ")).toBe("jane.doe@example.com");
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(42)).toBe("");
  });

  it("validates basic shape and length", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail(`${"x".repeat(250)}@b.co`)).toBe(false);
  });

  it("offers both the normalised and as-typed form for legacy account lookup", () => {
    expect(emailLookupCandidates(" Jane@X.com ")).toEqual(["jane@x.com", "Jane@X.com"]);
    expect(emailLookupCandidates("jane@x.com")).toEqual(["jane@x.com"]);
    expect(emailLookupCandidates(null)).toEqual([]);
  });
});

describe("validatePassword / cleanName", () => {
  it("enforces length bounds", () => {
    expect(validatePassword("short").ok).toBe(false);
    expect(validatePassword("longenough").ok).toBe(true);
    expect(validatePassword("x".repeat(LIMITS.passwordMax + 1)).ok).toBe(false);
    expect(validatePassword(undefined).ok).toBe(false);
  });

  it("falls back and truncates names", () => {
    expect(cleanName("   ", "jane")).toBe("jane");
    expect(cleanName(undefined, "jane")).toBe("jane");
    expect(cleanName("x".repeat(500), "f")).toHaveLength(LIMITS.nameMax);
  });
});

describe("parseFormDefinition", () => {
  const base = { title: "  Project groups ", description: " hi ", fields };

  it("trims, keeps known properties and drops unknown ones", () => {
    const r = parseFormDefinition({
      ...base,
      evil: "x",
      fields: [{ ...fields[0], extra: 1, __proto__: { polluted: true } }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.title).toBe("Project groups");
    expect(r.value.description).toBe("hi");
    expect(r.value.fields[0]).toEqual({
      id: "name",
      label: "Name",
      type: "text",
      required: true,
      isPrimary: true,
    });
  });

  it("rejects malformed bodies", () => {
    expect(parseFormDefinition(null).ok).toBe(false);
    expect(parseFormDefinition([]).ok).toBe(false);
    expect(parseFormDefinition({ ...base, title: "" }).ok).toBe(false);
    expect(parseFormDefinition({ ...base, title: "x".repeat(LIMITS.titleMax + 1) }).ok).toBe(false);
    expect(parseFormDefinition({ ...base, description: 5 }).ok).toBe(false);
    expect(parseFormDefinition({ ...base, fields: [] }).ok).toBe(false);
    expect(parseFormDefinition({ ...base, fields: "nope" }).ok).toBe(false);
  });

  it("rejects too many fields, duplicate ids, bad ids and unknown types", () => {
    const many = Array.from({ length: LIMITS.fieldsMax + 1 }, (_, i) => ({
      id: `f${i}`,
      label: `F${i}`,
      type: "text",
    }));
    expect(parseFormDefinition({ ...base, fields: many }).ok).toBe(false);
    expect(
      parseFormDefinition({ ...base, fields: [fields[0], { ...fields[0] }] }).ok,
    ).toBe(false);
    expect(
      parseFormDefinition({ ...base, fields: [{ ...fields[0], id: "a.b" }] }).ok,
    ).toBe(false);
    expect(
      parseFormDefinition({ ...base, fields: [{ ...fields[0], id: "$where" }] }).ok,
    ).toBe(false);
    expect(
      parseFormDefinition({ ...base, fields: [{ ...fields[0], type: "file" }] }).ok,
    ).toBe(false);
  });

  it("requires options for choice fields, de-duplicates and bounds them", () => {
    const choice = (options: unknown) =>
      parseFormDefinition({
        ...base,
        fields: [fields[0], { id: "c", label: "C", type: "select", options }],
      });
    expect(choice(undefined).ok).toBe(false);
    expect(choice([]).ok).toBe(false);
    expect(choice([" "]).ok).toBe(false);
    expect(choice([1]).ok).toBe(false);
    expect(choice(Array.from({ length: LIMITS.optionsMax + 1 }, (_, i) => `o${i}`)).ok).toBe(false);
    const r = choice(["A", " A ", "B"]);
    expect(r.ok && r.value.fields[1].options).toEqual(["A", "B"]);
  });

  it("drops options on non-choice fields", () => {
    const r = parseFormDefinition({
      ...base,
      fields: [{ ...fields[0], options: ["x"] }],
    });
    expect(r.ok && r.value.fields[0].options).toBeUndefined();
  });

  it("guarantees exactly one primary field", () => {
    const none = parseFormDefinition({
      ...base,
      fields: [
        { id: "a", label: "A", type: "text" },
        { id: "b", label: "B", type: "text" },
      ],
    });
    expect(none.ok && none.value.fields.map((f) => f.isPrimary)).toEqual([true, false]);

    const two = parseFormDefinition({
      ...base,
      fields: [
        { id: "a", label: "A", type: "text" },
        { id: "b", label: "B", type: "text", isPrimary: true },
        { id: "c", label: "C", type: "text", isPrimary: true },
      ],
    });
    expect(two.ok && two.value.fields.map((f) => f.isPrimary)).toEqual([false, true, false]);
  });
});

describe("validateSubmission", () => {
  it("accepts a minimal valid response and keeps only defined fields", () => {
    const r = validateSubmission(fields, { ...valid, injected: "x", $set: { a: 1 } });
    expect(r).toEqual({ ok: true, value: valid });
  });

  it("enforces required fields, including whitespace-only text", () => {
    expect(validateSubmission(fields, { team: "Red" }).ok).toBe(false);
    expect(validateSubmission(fields, { name: "   ", team: "Red" }).ok).toBe(false);
    expect(validateSubmission(fields, { name: "Ama" }).ok).toBe(false);
  });

  it("treats a required empty checklist as missing (the old check let [] through)", () => {
    const required: FormField[] = [
      { id: "c", label: "C", type: "checklist", options: ["a", "b"], required: true },
    ];
    expect(validateSubmission(required, { c: [] }).ok).toBe(false);
    expect(validateSubmission(required, {}).ok).toBe(false);
    expect(validateSubmission(required, { c: ["a"] }).ok).toBe(true);
  });

  it("only accepts declared options", () => {
    expect(validateSubmission(fields, { ...valid, team: "Green" }).ok).toBe(false);
    expect(validateSubmission(fields, { ...valid, diet: "Nope" }).ok).toBe(false);
    expect(validateSubmission(fields, { ...valid, skills: ["JS", "Rust"] }).ok).toBe(false);
    expect(validateSubmission(fields, { ...valid, skills: "JS" }).ok).toBe(false);
  });

  it("de-duplicates checklist answers", () => {
    const r = validateSubmission(fields, { ...valid, skills: ["JS", "JS", "Go"] });
    expect(r.ok && r.value.skills).toEqual(["JS", "Go"]);
  });

  it("validates numbers", () => {
    expect(validateSubmission(fields, { ...valid, age: "17" }).ok).toBe(true);
    expect(validateSubmission(fields, { ...valid, age: 17 })).toEqual({
      ok: true,
      value: { ...valid, age: "17" },
    });
    expect(validateSubmission(fields, { ...valid, age: "abc" }).ok).toBe(false);
    expect(validateSubmission(fields, { ...valid, age: "Infinity" }).ok).toBe(false);
    expect(validateSubmission(fields, { ...valid, age: "" }).ok).toBe(true);
  });

  it("bounds text length", () => {
    const long = "x".repeat(LIMITS.textAnswerMax + 1);
    expect(validateSubmission(fields, { ...valid, name: long }).ok).toBe(false);
  });

  it("rejects non-scalar answers and non-object bodies", () => {
    expect(validateSubmission(fields, { ...valid, name: { $ne: "" } }).ok).toBe(false);
    expect(validateSubmission(fields, { ...valid, name: ["a"] }).ok).toBe(false);
    expect(validateSubmission(fields, "str").ok).toBe(false);
    expect(validateSubmission(fields, null).ok).toBe(false);
    expect(validateSubmission(fields, []).ok).toBe(false);
  });

  it("omits blank optional answers", () => {
    const r = validateSubmission(fields, { ...valid, diet: "", skills: [] });
    expect(r).toEqual({ ok: true, value: valid });
  });
});

describe("parsePublishedGroups", () => {
  const ok = { groups: [{ label: " Red ", members: [" Ama ", "Kofi", "  "] }] };

  it("trims, drops blank names and keeps only label + members", () => {
    const r = parsePublishedGroups({ groups: [{ ...ok.groups[0], secret: "x", rawMembers: [{ email: "a@b.c" }] }] });
    expect(r).toEqual({ ok: true, value: { groups: [{ label: "Red", members: ["Ama", "Kofi"] }] } });
  });

  it("rejects malformed payloads", () => {
    expect(parsePublishedGroups(null).ok).toBe(false);
    expect(parsePublishedGroups({}).ok).toBe(false);
    expect(parsePublishedGroups({ groups: [] }).ok).toBe(false);
    expect(parsePublishedGroups({ groups: [{ label: "", members: [] }] }).ok).toBe(false);
    expect(parsePublishedGroups({ groups: [{ label: "A", members: "x" }] }).ok).toBe(false);
    expect(parsePublishedGroups({ groups: [{ label: "A", members: [1] }] }).ok).toBe(false);
    expect(parsePublishedGroups({ groups: ["x"] }).ok).toBe(false);
  });

  it("enforces size limits", () => {
    const many = Array.from({ length: LIMITS.groupsMax + 1 }, (_, i) => ({ label: `G${i}`, members: ["a"] }));
    expect(parsePublishedGroups({ groups: many }).ok).toBe(false);
    expect(parsePublishedGroups({ groups: [{ label: "x".repeat(LIMITS.groupLabelMax + 1), members: [] }] }).ok).toBe(false);
    const people = Array.from({ length: LIMITS.membersMax + 1 }, (_, i) => `p${i}`);
    expect(parsePublishedGroups({ groups: [{ label: "big", members: people }] }).ok).toBe(false);
  });

  it("allows an empty group", () => {
    expect(parsePublishedGroups({ groups: [{ label: "Empty", members: [] }] }).ok).toBe(true);
  });
});

describe("fieldErrors (inline messages on the form page)", () => {
  it("returns nothing for a valid response", () => {
    expect(fieldErrors(fields, valid)).toEqual({});
  });

  it("reports each problem field by id with short messages", () => {
    const errors = fieldErrors(fields, { name: "  ", team: "Green", age: "abc", skills: ["Rust"] });
    expect(errors).toEqual({
      name: "This field is required",
      team: "Choose one of the options",
      age: "Enter a number",
      skills: "Choose from the options",
    });
  });

  it("agrees with the server-side validator about what is acceptable", () => {
    const samples: Record<string, unknown>[] = [
      valid,
      { name: "Ama" },
      { ...valid, age: "1e3" },
      { ...valid, age: "x" },
      { ...valid, skills: ["JS", "Go"] },
      { ...valid, diet: "Nope" },
      { ...valid, name: "x".repeat(LIMITS.textAnswerMax + 1) },
    ];
    for (const sample of samples) {
      expect(Object.keys(fieldErrors(fields, sample)).length === 0).toBe(validateSubmission(fields, sample).ok);
    }
  });
});
