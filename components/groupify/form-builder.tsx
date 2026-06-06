"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { PageHeader } from "@/components/groupify/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  isPrimary?: boolean;
  required?: boolean;
}

interface FormBuilderProps {
  initialTitle?: string;
  initialFields?: FormField[];
  formId?: string;
  adminToken?: string;
  isEdit?: boolean;
}

function TagsInput({ value = [], onChange, placeholder }: { value?: string[], onChange: (v: string[]) => void, placeholder: string }) {
  const [input, setInput] = useState("");
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = input.trim();
      if (val && !value.includes(val)) {
        onChange([...value, val]);
      }
      setInput("");
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
        <span key={i} className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {tag}
          <button type="button" onClick={() => removeTag(i)} className="text-primary-foreground/70 hover:text-primary-foreground">
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : "Add another option..."}
        className="flex-1 bg-transparent px-1 min-w-[120px] outline-none text-foreground placeholder:text-muted-foreground/50"
      />
    </div>
  );
}

export function FormBuilder({
  initialTitle = "My Grouping Form",
  initialFields = [{ id: nanoid(6), label: "Name", type: "text", isPrimary: true, required: true }],
  formId,
  adminToken,
  isEdit = false,
}: FormBuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ formId: string; adminToken: string } | null>(null);
  
  const [draggedId, setDraggedId] = useState<string | null>(null);

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
      { id: nanoid(6), label: `Field ${fields.length + 1}`, type: "text", required: false },
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
    const field = fields.find((f) => f.id === id);
    if (field?.isPrimary) {
      toast.error("Cannot remove the primary field. Set another field as primary first.");
      return;
    }
    setFields(fields.filter((f) => f.id !== id));
  };

  const setPrimaryField = (id: string) => {
    setFields(
      fields.map((f) => ({
        ...f,
        isPrimary: f.id === id,
      }))
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Form title is required");
      return;
    }

    const primaryField = fields.find((f) => f.isPrimary);
    if (!primaryField) {
      toast.error("Please designate one field as the primary identifier (e.g. Name)");
      return;
    }

    for (const f of fields) {
      if (!f.label.trim()) {
        toast.error("All fields must have a label");
        return;
      }
      if (f.type === "select" && (!f.options || f.options.length === 0)) {
        toast.error(`Select field "${f.label}" must have at least one option`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const url = isEdit ? `/api/forms/${formId}?token=${adminToken}` : "/api/forms";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, fields }),
      });

      if (!response.ok) {
        throw new Error("Failed to save form");
      }

      if (isEdit) {
        toast.success("Form updated successfully!");
        router.push(`/forms/${formId}/admin?token=${adminToken}`);
      } else {
        const data = await response.json();
        setSaveResult(data);
        toast.success("Form created successfully!");
      }
    } catch (error) {
      toast.error("An error occurred while saving the form");
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
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-16">
          <PageHeader />
          <div className="mt-12 space-y-8 rounded-2xl border border-border/50 bg-card/70 p-8 backdrop-blur-sm shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-foreground">Form created successfully!</h2>
              <p className="mt-2 text-muted-foreground">Save these links. You won&apos;t be able to see the admin link again.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Public Link (Share with respondents)</label>
                <div className="flex gap-2">
                  <input readOnly value={publicLink} className="flex-1 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm text-foreground" />
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

              <div className="space-y-2">
                <label className="text-sm font-semibold text-destructive">Admin Link (Keep secret!)</label>
                <div className="flex gap-2">
                  <input readOnly value={adminLink} className="flex-1 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive" />
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
                <p className="text-xs text-muted-foreground">Use this link to view submissions, edit the form, and generate groups.</p>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={() => router.push(`/forms/${saveResult.formId}/admin?token=${saveResult.adminToken}`)}
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
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <PageHeader />
        
        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{isEdit ? "Edit Form" : "Create New Form"}</h1>
            <p className="text-muted-foreground">Design a custom form to collect structured data for your groups.</p>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm shadow-md">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Form Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hackathon Registration"
                className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Form Fields</h2>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted/80"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Add Field
              </button>
            </div>

            <div className="space-y-4 ml-4">
              {fields.map((field) => (
                <div 
                  key={field.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, field.id)}
                  onDragOver={(e) => handleDragOver(e, field.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`relative space-y-4 rounded-xl border border-border/50 bg-card/40 p-5 backdrop-blur-sm transition-all ${draggedId === field.id ? "opacity-40 border-primary/50 scale-[0.98]" : ""}`}
                >
                  <div className="absolute top-1/2 -left-6 -translate-y-1/2 cursor-grab text-muted-foreground/30 hover:text-foreground active:cursor-grabbing p-1">
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                      <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                    </svg>
                  </div>

                  {field.isPrimary && (
                    <div className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                      Primary Identifier
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid flex-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Field Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Field Type</label>
                        <Select
                          value={field.type}
                          onValueChange={(value) => updateField(field.id, { type: value as FormField["type"] })}
                        >
                          <SelectTrigger className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none h-[38px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Short Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-6">
                      <button
                        type="button"
                        onClick={() => setPrimaryField(field.id)}
                        className={`rounded-lg p-2 transition-colors ${field.isPrimary ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground/30 hover:text-amber-500 hover:bg-amber-500/10"}`}
                        title={field.isPrimary ? "Primary Field" : "Set as Primary"}
                      >
                        <svg className="size-5" viewBox="0 0 24 24" fill={field.isPrimary ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="rounded-lg p-2 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Remove field"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {field.type === "select" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Options</label>
                      <TagsInput
                        value={field.options}
                        onChange={(options) => updateField(field.id, { options })}
                        placeholder="e.g. Engineering, Marketing (Press Enter to add)"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        className="rounded border-border/50 bg-muted/20 text-primary focus:ring-primary/50"
                      />
                      Required
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`rounded-2xl px-8 py-3.5 font-syne text-sm font-bold tracking-wide text-primary-foreground shadow-lg transition-all active:scale-98 disabled:opacity-50 ${
                isSaving ? "btn-shimmer" : "bg-primary hover:bg-primary/90"
              }`}
            >
              {isSaving ? "Saving..." : isEdit ? "Update Form" : "Create Form"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
