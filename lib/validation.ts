import type { FieldType, FormField, SubmissionData } from "@/lib/models";

export const LIMITS = {
  titleMax: 120,
  descriptionMax: 1000,
  fieldsMax: 30,
  fieldIdMax: 32,
  labelMax: 120,
  optionsMax: 50,
  optionMax: 100,
  textAnswerMax: 500,
  numberAnswerMax: 32,
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 128,
  nameMax: 80,
  /** Hard ceiling on responses per form so a flood can't grow a collection unbounded. */
  submissionsPerForm: 10_000,
} as const;

export const FIELD_TYPES: readonly FieldType[] = [
  "text",
  "number",
  "select",
  "radio",
  "checklist",
];

const CHOICE_TYPES: readonly FieldType[] = ["select", "radio", "checklist"];

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ── emails ────────────────────────────────────────────────────────────────

export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// Deliberately simple: one @, a dot in the domain, no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return email.length <= LIMITS.emailMax && EMAIL_RE.test(email);
}

/** Emails to try when looking a user up, so accounts created before we normalised still match. */
export function emailLookupCandidates(raw: unknown): string[] {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  const normalized = normalizeEmail(raw);
  return Array.from(new Set([normalized, trimmed].filter(Boolean)));
}

// ── passwords / names ─────────────────────────────────────────────────────

export function validatePassword(password: unknown): Result<string> {
  if (typeof password !== "string" || password.length === 0) {
    return fail("Password is required");
  }
  if (password.length < LIMITS.passwordMin) {
    return fail(`Password must be at least ${LIMITS.passwordMin} characters long`);
  }
  if (password.length > LIMITS.passwordMax) {
    return fail(`Password must be at most ${LIMITS.passwordMax} characters long`);
  }
  return { ok: true, value: password };
}

export function cleanName(name: unknown, fallback: string): string {
  const trimmed = typeof name === "string" ? name.trim().slice(0, LIMITS.nameMax) : "";
  return trimmed || fallback;
}

// ── form definitions ──────────────────────────────────────────────────────

export interface FormDefinition {
  title: string;
  description: string;
  fields: FormField[];
}

function cleanString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

/**
 * Validate and normalise a form definition coming from the builder.
 * Unknown properties are dropped; exactly one primary field is guaranteed.
 */
export function parseFormDefinition(body: unknown): Result<FormDefinition> {
  if (!isPlainObject(body)) return fail("Invalid payload");

  const title = cleanString(body.title, LIMITS.titleMax);
  if (!title) return fail(`Title is required (max ${LIMITS.titleMax} characters)`);

  let description = "";
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string") return fail("Description must be text");
    description = body.description.trim();
    if (description.length > LIMITS.descriptionMax) {
      return fail(`Description is too long (max ${LIMITS.descriptionMax} characters)`);
    }
  }

  if (!Array.isArray(body.fields) || body.fields.length === 0) {
    return fail("A form needs at least one field");
  }
  if (body.fields.length > LIMITS.fieldsMax) {
    return fail(`A form can have at most ${LIMITS.fieldsMax} fields`);
  }

  const seen = new Set<string>();
  const fields: FormField[] = [];

  for (const raw of body.fields) {
    if (!isPlainObject(raw)) return fail("Invalid field");

    const id = cleanString(raw.id, LIMITS.fieldIdMax);
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return fail("Every field needs a valid id");
    if (seen.has(id)) return fail("Field ids must be unique");
    seen.add(id);

    const label = cleanString(raw.label, LIMITS.labelMax);
    if (!label) return fail(`Every field needs a label (max ${LIMITS.labelMax} characters)`);

    if (typeof raw.type !== "string" || !FIELD_TYPES.includes(raw.type as FieldType)) {
      return fail(`Field "${label}" has an unsupported type`);
    }
    const type = raw.type as FieldType;

    const field: FormField = {
      id,
      label,
      type,
      required: raw.required === true,
      isPrimary: raw.isPrimary === true,
    };

    if (CHOICE_TYPES.includes(type)) {
      if (!Array.isArray(raw.options)) return fail(`Field "${label}" needs options`);
      const options: string[] = [];
      for (const opt of raw.options) {
        const clean = cleanString(opt, LIMITS.optionMax);
        if (!clean) return fail(`Options for "${label}" must be 1-${LIMITS.optionMax} characters`);
        if (!options.includes(clean)) options.push(clean);
      }
      if (options.length === 0) return fail(`Field "${label}" needs at least one option`);
      if (options.length > LIMITS.optionsMax) {
        return fail(`Field "${label}" can have at most ${LIMITS.optionsMax} options`);
      }
      field.options = options;
    }

    fields.push(field);
  }

  // Exactly one primary identifier: keep the first flagged, default to the first field.
  const primaryIndex = Math.max(
    0,
    fields.findIndex((f) => f.isPrimary),
  );
  fields.forEach((f, i) => {
    f.isPrimary = i === primaryIndex;
  });

  return { ok: true, value: { title, description, fields } };
}

// ── submissions ───────────────────────────────────────────────────────────

/**
 * Check a respondent's answers against the form's field definitions and return
 * only what the form asks for, so arbitrary keys can never be stored.
 */
export function validateSubmission(
  fields: FormField[],
  body: unknown,
): Result<SubmissionData> {
  if (!isPlainObject(body)) return fail("Invalid payload");

  const data: SubmissionData = {};

  for (const field of fields) {
    const raw = body[field.id];
    const label = field.label;

    if (field.type === "checklist") {
      const list = raw === undefined || raw === null ? [] : raw;
      if (!Array.isArray(list)) return fail(`Invalid answer for "${label}"`);
      const picked: string[] = [];
      for (const item of list) {
        if (typeof item !== "string" || !field.options?.includes(item)) {
          return fail(`Invalid choice for "${label}"`);
        }
        if (!picked.includes(item)) picked.push(item);
      }
      if (picked.length === 0) {
        if (field.required) return fail(`Please fill out the required field: ${label}`);
        continue;
      }
      data[field.id] = picked;
      continue;
    }

    if (raw !== undefined && raw !== null && typeof raw !== "string" && typeof raw !== "number") {
      return fail(`Invalid answer for "${label}"`);
    }
    const value = raw === undefined || raw === null ? "" : String(raw).trim();

    if (value === "") {
      if (field.required) return fail(`Please fill out the required field: ${label}`);
      continue;
    }

    switch (field.type) {
      case "text":
        if (value.length > LIMITS.textAnswerMax) {
          return fail(`"${label}" is too long (max ${LIMITS.textAnswerMax} characters)`);
        }
        break;
      case "number":
        if (value.length > LIMITS.numberAnswerMax || !Number.isFinite(Number(value))) {
          return fail(`"${label}" must be a number`);
        }
        break;
      case "select":
      case "radio":
        if (!field.options?.includes(value)) return fail(`Invalid choice for "${label}"`);
        break;
    }

    data[field.id] = value;
  }

  return { ok: true, value: data };
}
