import { nanoid } from "nanoid";
import type { FieldType, FormField } from "@/lib/models";

type TemplateField = {
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  isPrimary?: boolean;
};

export interface FormTemplate {
  id: string;
  name: string;
  summary: string;
  title: string;
  description: string;
  fields: TemplateField[];
}

/**
 * Starting points for common cases. Fields that suit "spread evenly by" (choice
 * fields like skill level) are included deliberately, since balancing is the
 * point of grouping.
 */
export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    summary: "Just a name field",
    title: "My Grouping Form",
    description: "",
    fields: [{ label: "Name", type: "text", required: true, isPrimary: true }],
  },
  {
    id: "class-project",
    name: "Class project groups",
    summary: "Names, confidence level and who works well together",
    title: "Class project groups",
    description: "Answer a few quick questions so we can build balanced project groups.",
    fields: [
      { label: "Full name", type: "text", required: true, isPrimary: true },
      {
        label: "How confident are you with this topic?",
        type: "radio",
        options: ["Just starting", "Comfortable", "Very confident"],
        required: true,
      },
      {
        label: "Role you'd like to take",
        type: "select",
        options: ["Organiser", "Researcher", "Designer", "Presenter", "No preference"],
      },
      { label: "Anything else we should know?", type: "text" },
    ],
  },
  {
    id: "hackathon",
    name: "Hackathon teams",
    summary: "Main skill and experience, for well-rounded teams",
    title: "Hackathon team building",
    description: "Tell us what you do best and we'll put together teams with a good mix of skills.",
    fields: [
      { label: "Name", type: "text", required: true, isPrimary: true },
      {
        label: "Main skill",
        type: "select",
        options: ["Frontend", "Backend", "Design", "Data", "Product"],
        required: true,
      },
      {
        label: "Experience level",
        type: "radio",
        options: ["Beginner", "Intermediate", "Advanced"],
        required: true,
      },
      { label: "Tools you know", type: "checklist", options: ["JavaScript", "Python", "Figma", "SQL", "Cloud"] },
    ],
  },
  {
    id: "sports",
    name: "Sports teams",
    summary: "Position and skill level for fair teams",
    title: "Team sign-up",
    description: "Pick your position and level so teams come out fair.",
    fields: [
      { label: "Name", type: "text", required: true, isPrimary: true },
      {
        label: "Preferred position",
        type: "select",
        options: ["Attack", "Midfield", "Defence", "Goalkeeper", "Anywhere"],
      },
      {
        label: "Skill level",
        type: "radio",
        options: ["Casual", "Regular player", "Competitive"],
        required: true,
      },
    ],
  },
  {
    id: "breakout",
    name: "Event breakout sessions",
    summary: "Topic interest and dietary needs",
    title: "Breakout session sign-up",
    description: "Choose the topic you're most interested in.",
    fields: [
      { label: "Name", type: "text", required: true, isPrimary: true },
      { label: "Email", type: "text", required: true },
      {
        label: "Topic you're most interested in",
        type: "select",
        options: ["Topic A", "Topic B", "Topic C"],
        required: true,
      },
      { label: "Dietary needs", type: "text" },
    ],
  },
];

export interface BuilderState {
  title: string;
  description: string;
  fields: FormField[];
}

/** Turn a template into fresh builder state with new field ids. */
export function instantiateTemplate(template: FormTemplate): BuilderState {
  return {
    title: template.title,
    description: template.description,
    fields: template.fields.map((f) => ({
      id: nanoid(6),
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      ...(f.isPrimary ? { isPrimary: true } : {}),
      ...(f.options ? { options: [...f.options] } : {}),
    })),
  };
}

/** A comparable snapshot of the parts a user edits, ignoring generated field ids. */
export function snapshotOf(state: BuilderState): string {
  return JSON.stringify({
    title: state.title.trim(),
    description: state.description.trim(),
    fields: state.fields.map((f) => ({
      label: f.label,
      type: f.type,
      options: f.options,
      required: f.required,
      isPrimary: f.isPrimary,
    })),
  });
}
