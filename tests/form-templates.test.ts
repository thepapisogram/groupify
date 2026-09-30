import { describe, expect, it } from "vitest";
import { FORM_TEMPLATES, instantiateTemplate, snapshotOf } from "@/lib/form-templates";
import { parseFormDefinition, validateSubmission } from "@/lib/validation";

describe("form templates", () => {
  it("has unique ids and includes a blank starting point", () => {
    const ids = FORM_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("blank");
  });

  it.each(FORM_TEMPLATES.map((t) => [t.name, t] as const))(
    "%s produces a form the server accepts",
    (_name, template) => {
      const state = instantiateTemplate(template);
      const parsed = parseFormDefinition(state);
      expect(parsed.ok, parsed.ok ? "" : parsed.error).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.value.fields.filter((f) => f.isPrimary)).toHaveLength(1);
      expect(parsed.value.fields.find((f) => f.isPrimary)!.type).toBe("text");
    },
  );

  it.each(FORM_TEMPLATES.map((t) => [t.name, t] as const))(
    "%s can actually be filled in and submitted",
    (_name, template) => {
      const { fields } = instantiateTemplate(template);
      const answers: Record<string, unknown> = {};
      for (const f of fields) {
        if (!f.required) continue;
        answers[f.id] = f.type === "checklist" ? [f.options![0]] : f.options ? f.options[0] : "Ama";
      }
      expect(validateSubmission(fields, answers).ok).toBe(true);
    },
  );

  it("gives every instantiation fresh field ids", () => {
    const t = FORM_TEMPLATES[1];
    const a = instantiateTemplate(t).fields.map((f) => f.id);
    const b = instantiateTemplate(t).fields.map((f) => f.id);
    expect(a.some((id) => b.includes(id))).toBe(false);
  });

  it("does not let edits to one instance leak into the template", () => {
    const t = FORM_TEMPLATES.find((x) => x.fields.some((f) => f.options)) ?? FORM_TEMPLATES[1];
    const inst = instantiateTemplate(t);
    inst.fields.forEach((f) => f.options?.push("MUTATED"));
    expect(JSON.stringify(FORM_TEMPLATES)).not.toContain("MUTATED");
  });

  it("snapshots ignore generated ids but notice real edits", () => {
    const t = FORM_TEMPLATES[2];
    const one = instantiateTemplate(t);
    const two = instantiateTemplate(t);
    expect(snapshotOf(one)).toBe(snapshotOf(two));
    two.title = "Changed";
    expect(snapshotOf(one)).not.toBe(snapshotOf(two));
  });
});
