"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { Button } from "@/components/ui/button";
import { adminFetch, adminPagePath } from "@/lib/admin-client";
import type { FormField } from "@/lib/models";
import { LIMITS } from "@/lib/validation";
import {
  FORM_TEMPLATES,
  instantiateTemplate,
  snapshotOf,
  type FormTemplate,
} from "@/lib/form-templates";
import { ConfirmDialog } from "@/components/groupify/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type { FormField };

interface FormBuilderProps {
  initialTitle?: string;
  initialDescription?: string;
  initialFields?: FormField[];
  formId?: string;
  adminToken?: string;
  isEdit?: boolean;
}

function TagsInput({
  value = [],
  onChange,
  placeholder,
  label,
}: {
  value?: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  /** Accessible name for the text box. */
  label: string;
}) {
  const [input, setInput] = useState("");

  /** Add one or more options; commas and new lines separate them, so pasted lists just work. */
  const commit = (raw: string) => {
    const parts = raw
      .split(/[\n,]/)
      .map((part) => part.trim().slice(0, LIMITS.optionMax))
      .filter(Boolean);
    if (parts.length > 0) {
      const next = [...value];
      for (const part of parts) {
        if (!next.includes(part) && next.length < LIMITS.optionsMax) next.push(part);
      }
      onChange(next);
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(input);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-2 text-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50">
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            aria-label={`Remove option ${tag}`}
            className="rounded px-0.5 text-primary-foreground/80 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        aria-label={label}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        // Typing an option and tapping elsewhere (common on phones) still adds it.
        onBlur={() => commit(input)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[\n,]/.test(text)) {
            e.preventDefault();
            commit(input + text);
          }
        }}
        placeholder={value.length === 0 ? placeholder : "Add another option..."}
        className="flex-1 bg-transparent px-1 min-w-[120px] outline-none text-foreground placeholder:text-muted-foreground/70"
      />
    </div>
  );
}

export function FormBuilder({
  initialTitle = "My Grouping Form",
  initialDescription = "",
  initialFields = [
    {
      id: nanoid(6),
      label: "Name",
      type: "text",
      isPrimary: true,
      required: true,
    },
  ],
  formId,
  adminToken,
  isEdit = false,
}: FormBuilderProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    formId: string;
    adminToken: string;
  } | null>(null);

  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Starter templates (new forms only). `pristine` remembers the last untouched state, so
  // picking a template only asks for confirmation when the user has actually changed something.
  const [pristine, setPristine] = useState(() =>
    snapshotOf({ title: initialTitle, description: initialDescription, fields: initialFields }),
  );
  const [pendingTemplate, setPendingTemplate] = useState<FormTemplate | null>(null);
  const isDirty = snapshotOf({ title, description, fields }) !== pristine;

  const applyTemplate = (template: FormTemplate) => {
    const next = instantiateTemplate(template);
    setTitle(next.title);
    setDescription(next.description);
    setFields(next.fields);
    setPristine(snapshotOf(next));
    setPendingTemplate(null);
  };

  const chooseTemplate = (template: FormTemplate) => {
    if (isDirty) setPendingTemplate(template);
    else applyTemplate(template);
  };

  // IntersectionObserver sentinel — sticky footer appears only when the
  // sentinel (placed at end of fields) scrolls out of view on mobile.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stickyFooter, setStickyFooter] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyFooter(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === id) return;

    const draggedIndex = fields.findIndex((f) => f.id === draggedId);
    const targetIndex = fields.findIndex((f) => f.id === id);

    const newFields = [...fields];
    const [draggedItem] = newFields.splice(draggedIndex, 1);
    newFields.splice(targetIndex, 0, draggedItem);

    setFields(newFields);
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        id: nanoid(6),
        label: `Field ${fields.length + 1}`,
        type: "text",
        required: false,
      },
    ]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    if (fields.length <= 1) {
      toast.error("Form must have at least one field");
      return;
    }
    const fieldIndex = fields.findIndex((f) => f.id === id);
    const field = fields[fieldIndex];
    if (field?.isPrimary) {
      toast.error(
        "Cannot remove the primary field. Set another field as primary first.",
      );
      return;
    }
    
    setFields((prev) => prev.filter((f) => f.id !== id));
    
    toast.success(`Removed field "${field.label}"`, {
      action: {
        label: "Undo",
        onClick: () => {
          setFields((prev) => {
            const newFields = [...prev];
            newFields.splice(fieldIndex, 0, field);
            return newFields;
          });
        },
      },
      duration: 5000,
    });
  };

  const moveField = (id: string, direction: "up" | "down") => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.length - 1) return prev;
      const newFields = [...prev];
      const targetIdx = idx + (direction === "up" ? -1 : 1);
      const temp = newFields[idx];
      newFields[idx] = newFields[targetIdx];
      newFields[targetIdx] = temp;
      return newFields;
    });
  };

  const setPrimaryField = (id: string) => {
    setFields(
      fields.map((f) => ({
        ...f,
        isPrimary: f.id === id,
      })),
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Form title is required");
      return;
    }

    const primaryField = fields.find((f) => f.isPrimary);
    if (!primaryField) {
      toast.error(
        "Please designate one field as the primary identifier (e.g. Name)",
      );
      return;
    }

    for (const f of fields) {
      if (!f.label.trim()) {
        toast.error("All fields must have a label");
        return;
      }
      if (
        (f.type === "select" || f.type === "radio" || f.type === "checklist") &&
        (!f.options || f.options.length === 0)
      ) {
        toast.error(`Field "${f.label}" must have at least one option`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const url = isEdit ? `/api/forms/${formId}` : "/api/forms";
      const method = isEdit ? "PUT" : "POST";

      const response = await adminFetch(url, adminToken, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, fields }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save form");
      }

      if (isEdit) {
        toast.success("Form updated successfully!");
        router.push(adminPagePath(formId!, "admin", adminToken));
      } else {
        const data = await response.json();
        setSaveResult(data);
        toast.success("Form created successfully!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred while saving the form");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (saveResult && !isEdit) {
    const publicLink = `${window.location.origin}/forms/${saveResult.formId}`;
    const adminLink = `${window.location.origin}/forms/${saveResult.formId}/admin?token=${saveResult.adminToken}`;

    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-2xl px-4 pt-8 pb-28 sm:px-6 sm:py-16">
          <PageHeader />
          <div className="mt-12 space-y-8 rounded-2xl border border-border/50 bg-card/70 p-8 backdrop-blur-sm shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <svg
                  className="size-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="mt-6 text-2xl font-bold text-foreground">
                Form created successfully!
              </h1>
              <p className="mt-2 text-muted-foreground">
                {isSignedIn
                  ? "Your form is saved to your account. You can find it any time under My Forms."
                  : "Save these links. You won't be able to see the admin link again."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="public-link" className="text-sm font-semibold text-foreground">
                  Public Link (Share with respondents)
                </label>
                <div className="flex gap-2">
                  <input
                    id="public-link"
                    readOnly
                    onFocus={(e) => e.currentTarget.select()}
                    value={publicLink}
                    className="flex-1 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm text-foreground"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(publicLink);
                      toast.success("Public link copied!");
                    }}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {!isSignedIn && (
              <div className="space-y-2">
                <label htmlFor="admin-link" className="text-sm font-semibold text-destructive">
                  Admin Link (Keep secret!)
                </label>
                <div className="flex gap-2">
                  <input
                    id="admin-link"
                    readOnly
                    onFocus={(e) => e.currentTarget.select()}
                    value={adminLink}
                    className="flex-1 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(adminLink);
                      toast.success("Admin link copied!");
                    }}
                    className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition-all hover:bg-destructive/90"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this link to view submissions, edit the form, and generate
                  groups. Anyone who has it can manage the form, and it can&apos;t be recovered if you lose it.
                  Sign in and save the form to your account to avoid that.
                </p>
              </div>
              )}
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={() =>
                  router.push(
                    adminPagePath(saveResult.formId, "admin", isSignedIn ? undefined : saveResult.adminToken),
                  )
                }
                className="rounded-xl border border-border/50 bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
              >
                Go to Admin Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isEdit ? "Edit Form" : "Create New Form"}
            </h1>
            <p className="text-muted-foreground">
              Design a custom form to collect structured data for your groups.
            </p>
          </div>

          {!isEdit && (
            <section aria-labelledby="templates-heading" className="space-y-3">
              <h2 id="templates-heading" className="text-sm font-semibold text-foreground">
                Start from a template
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {FORM_TEMPLATES.map((template) => (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => chooseTemplate(template)}
                      className="h-full w-full rounded-xl border border-border/50 bg-card/50 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="block text-sm font-semibold text-foreground">{template.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{template.summary}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="space-y-4 rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm shadow-md">
            <div className="space-y-2">
              <label htmlFor="form-title" className="text-sm font-semibold text-foreground">
                Form Title <span className="text-destructive" aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </label>
              <input
                id="form-title"
                type="text"
                value={title}
                maxLength={LIMITS.titleMax}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hackathon Registration"
                className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="form-description" className="text-sm font-semibold text-foreground">
                Description
              </label>
              <textarea
                id="form-description"
                maxLength={LIMITS.descriptionMax}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Please fill out this form to register for the upcoming hackathon..."
                rows={3}
                className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Form Fields</h2>
                <p className="text-xs text-muted-foreground">
                  The star marks the primary identifier: the field shown in your group lists, usually the name.
                </p>
              </div>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted/80"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M12 5v14M5 12h14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Add Field
              </button>
            </div>

            <div className="space-y-4 ml-0 sm:ml-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, field.id)}
                  onDragOver={(e) => handleDragOver(e, field.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`relative space-y-4 rounded-xl border border-border/50 bg-card/40 p-5 backdrop-blur-sm transition-all ${draggedId === field.id ? "opacity-40 border-primary/50 scale-[0.98]" : ""}`}
                >
                  <div className="hidden sm:block absolute top-1/2 -left-6 -translate-y-1/2 cursor-grab text-muted-foreground/30 hover:text-foreground active:cursor-grabbing p-1">
                    <svg
                      className="size-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="9" cy="5" r="1" />
                      <circle cx="9" cy="12" r="1" />
                      <circle cx="9" cy="19" r="1" />
                      <circle cx="15" cy="5" r="1" />
                      <circle cx="15" cy="12" r="1" />
                      <circle cx="15" cy="19" r="1" />
                    </svg>
                  </div>

                  {field.isPrimary && (
                    <div className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                      Primary Identifier
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="grid flex-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor={`label-${field.id}`} className="text-xs font-medium text-muted-foreground">
                          Field Label
                        </label>
                        <input
                          id={`label-${field.id}`}
                          type="text"
                          maxLength={LIMITS.labelMax}
                          value={field.label}
                          onChange={(e) =>
                            updateField(field.id, { label: e.target.value })
                          }
                          className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor={`type-${field.id}`} className="text-xs font-medium text-muted-foreground">
                          Field Type
                        </label>
                        <Select
                          value={field.type}
                          onValueChange={(value) =>
                            updateField(field.id, {
                              type: value as FormField["type"],
                            })
                          }
                        >
                          <SelectTrigger id={`type-${field.id}`} className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none h-[38px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text (Short Answer)</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="select">Dropdown Select</SelectItem>
                            <SelectItem value="radio">Multiple Choice (Radio)</SelectItem>
                            <SelectItem value="checklist">Checkboxes (Multiple)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-6 items-center">
                      {/* Keyboard- and touch-friendly reordering; dragging is a mouse-only extra. */}
                      <div className="flex flex-col gap-0.5 mr-2">
                        <button
                          type="button"
                          onClick={() => moveField(field.id, "up")}
                          disabled={index === 0}
                          className="rounded-md p-1 hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-30"
                          title="Move up"
                          aria-label={`Move "${field.label}" up`}
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(field.id, "down")}
                          disabled={index === fields.length - 1}
                          className="rounded-md p-1 hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-30"
                          title="Move down"
                          aria-label={`Move "${field.label}" down`}
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrimaryField(field.id)}
                        aria-pressed={Boolean(field.isPrimary)}
                        aria-label={
                          field.isPrimary
                            ? `"${field.label}" is the primary field`
                            : `Make "${field.label}" the primary field`
                        }
                        className={`rounded-lg p-2 transition-colors ${field.isPrimary ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground/50 hover:text-amber-500 hover:bg-amber-500/10"}`}
                        title={
                          field.isPrimary ? "Primary Field" : "Set as Primary"
                        }
                      >
                        <svg
                          className="size-5"
                          viewBox="0 0 24 24"
                          fill={field.isPrimary ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="rounded-lg p-2 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Remove field"
                        aria-label={`Remove field "${field.label}"`}
                      >
                        <svg
                          className="size-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {(field.type === "select" || field.type === "radio" || field.type === "checklist") && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Options</p>
                      <TagsInput
                        label={`Options for ${field.label}`}
                        value={field.options}
                        onChange={(options) =>
                          updateField(field.id, { options })
                        }
                        placeholder="Type an option, then press Enter or comma"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateField(field.id, { required: e.target.checked })
                        }
                        className="rounded border-border/50 bg-muted/20 text-primary focus:ring-primary/50"
                      />
                      Required
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sentinel: when this scrolls out of view, sticky footer activates */}
          <div ref={sentinelRef} aria-hidden="true" />

          {/* Inline buttons (always visible on sm+; hidden on mobile when sentinel is visible) */}
          <div className={`sm:flex justify-end gap-3 pt-4 ${stickyFooter ? "hidden" : "flex"}`}>
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                size="xl"
                onClick={() => router.push(adminPagePath(formId!, "admin", adminToken))}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant={isSaving ? "shimmer" : "default"}
              size="xl"
              className="flex-1 sm:flex-none"
            >
              {isSaving ? "Saving..." : isEdit ? "Update Form" : "Create Form"}
            </Button>
          </div>

          {/* Sticky footer — appears only on mobile when scrolled past the sentinel */}
          {stickyFooter && (
            <div className="fixed bottom-0 left-0 right-0 z-50 flex gap-3 border-t border-border/50 bg-card/80 px-4 py-3 backdrop-blur-md sm:hidden animate-slide-up">
              {isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => router.push(adminPagePath(formId!, "admin", adminToken))}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                variant={isSaving ? "shimmer" : "default"}
                size="lg"
                className="flex-1"
              >
                {isSaving ? "Saving..." : isEdit ? "Update Form" : "Create Form"}
              </Button>
            </div>
          )}
        </div>
        <Footer />
      </div>

      <ConfirmDialog
        open={pendingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTemplate(null);
        }}
        title="Replace your form?"
        description={`Using the "${pendingTemplate?.name ?? ""}" template will replace the title, description and fields you've entered so far.`}
        confirmLabel="Use template"
        onConfirm={() => {
          if (pendingTemplate) applyTemplate(pendingTemplate);
        }}
      />
    </div>
  );
}
