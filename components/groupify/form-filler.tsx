"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { FormField } from "@/lib/models";
import { adminPagePath } from "@/lib/admin-client";
import { fieldErrors, LIMITS } from "@/lib/validation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiAlertLine, RiCheckLine, RiLockLine } from "@remixicon/react";

interface FormFillerProps {
  formId: string;
  formConfig: {
    title: string;
    description?: string;
    fields: FormField[];
    /** True for the owner and accepted collaborators (signed in). */
    canManage?: boolean;
    isClosed?: boolean;
    /** The organiser has shared the groups. */
    hasPublishedGroups?: boolean;
  };
}

const inputClass =
  "w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive/30";

/** Only hint autofill when the label clearly asks for it; guessing wrongly fills the wrong thing. */
function autoCompleteFor(label: string): string {
  const l = label.trim().toLowerCase();
  if (/^(your |full |first |last )?name$/.test(l)) return "name";
  if (/e-?mail/.test(l)) return "email";
  if (/(phone|mobile)/.test(l)) return "tel";
  return "off";
}

function GroupsLink({ formId }: { formId: string }) {
  return (
    <Link
      href={`/forms/${formId}/groups`}
      className="mx-auto mt-6 flex max-w-2xl items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
    >
      <span>Groups are ready. Find out which group you&apos;re in.</span>
      <span aria-hidden="true">&rarr;</span>
    </Link>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm text-destructive">
      <RiAlertLine className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function RequiredMark({ required }: { required?: boolean }) {
  if (!required) return null;
  return (
    <>
      <span className="text-destructive" aria-hidden="true">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

export function FormFiller({ formId, formConfig }: FormFillerProps) {
  const uid = useId();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const successRef = useRef<HTMLHeadingElement>(null);

  const idFor = (fieldId: string) => `${uid}-${fieldId}`;
  const errorIdFor = (fieldId: string) => `${uid}-${fieldId}-error`;

  useEffect(() => {
    if (isSuccess) successRef.current?.focus();
  }, [isSuccess]);

  const clearError = (id: string) =>
    setErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const handleChange = (id: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    clearError(id);
    setSubmitError(null);
  };

  const handleChecklistChange = (id: string, option: string, checked: boolean) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      return {
        ...prev,
        [id]: checked ? [...current, option] : current.filter((v) => v !== option),
      };
    });
    clearError(id);
    setSubmitError(null);
  };

  const focusField = (fieldId: string) => {
    const el =
      document.getElementById(idFor(fieldId)) ??
      document.querySelector<HTMLElement>(`[data-field="${uid}-${fieldId}"] input, [data-field="${uid}-${fieldId}"] button`);
    el?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const found = fieldErrors(formConfig.fields, formData);
    setErrors(found);
    const firstInvalid = formConfig.fields.find((f) => found[f.id]);
    if (firstInvalid) {
      setSubmitError(null);
      focusField(firstInvalid.id);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          throw new Error("Too many submissions right now. Please wait a moment and try again.");
        }
        throw new Error(data.error || "We couldn't submit your response. Please try again.");
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "We couldn't submit your response. Check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        role="status"
        className="mt-12 space-y-6 rounded-2xl border border-border/50 bg-card/70 p-8 text-center backdrop-blur-sm shadow-xl animate-slide-up"
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <RiCheckLine className="size-8" aria-hidden="true" />
        </div>
        <h1
          ref={successRef}
          tabIndex={-1}
          className="text-2xl font-bold text-foreground focus:outline-none"
        >
          Thank you!
        </h1>
        <p className="text-muted-foreground">Your response has been recorded successfully.</p>
        {formConfig.hasPublishedGroups && <GroupsLink formId={formId} />}
        <div className="pt-4">
          <button
            type="button"
            onClick={() => {
              setFormData({});
              setErrors({});
              setIsSuccess(false);
            }}
            className="rounded text-sm font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <>
      {formConfig.canManage && (
        <div className="my-8 animate-slide-up rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm backdrop-blur-md">
          <span className="font-medium flex items-center gap-2">
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            You can manage this form.
          </span>
          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider">
            <Link
              href={adminPagePath(formId, "admin")}
              className="hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              Dashboard
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href={adminPagePath(formId, "edit")}
              className="hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              Edit Form
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{formConfig.title}</h1>
        <p className="text-muted-foreground whitespace-pre-wrap">
          {formConfig.description || "Fill this form."}
        </p>
      </div>

      {formConfig.hasPublishedGroups && <GroupsLink formId={formId} />}

      {formConfig.isClosed ? (
        <div className="mt-12 rounded-2xl border border-border/50 bg-card/70 p-8 text-center backdrop-blur-sm shadow-xl max-w-2xl mx-auto animate-slide-up">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <RiLockLine className="size-8" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Form Closed</h2>
          <p className="mt-2 text-muted-foreground">
            This form is no longer accepting responses.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-8 animate-slide-up">
          <div className="space-y-6 max-w-5xl mx-auto rounded-2xl border border-border/50 bg-card/70 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
            <p className="text-xs text-muted-foreground">
              Fields marked <span className="text-destructive">*</span> are required.
            </p>

            {errorCount > 0 && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                <RiAlertLine className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {errorCount === 1
                  ? "Please fix the highlighted field below."
                  : `Please fix the ${errorCount} highlighted fields below.`}
              </div>
            )}

            {formConfig.fields.map((field) => {
              const id = idFor(field.id);
              const errId = errorIdFor(field.id);
              const error = errors[field.id];
              const describedBy = error ? errId : undefined;

              const labelEl = (
                <span className="text-sm font-semibold text-foreground">
                  {field.label}
                  <RequiredMark required={field.required} />
                </span>
              );

              if (field.type === "radio" || field.type === "checklist") {
                const selected = formData[field.id];
                return (
                  <fieldset
                    key={field.id}
                    data-field={id}
                    aria-describedby={describedBy}
                    aria-invalid={error ? true : undefined}
                    className="space-y-2"
                  >
                    <legend className="mb-1">{labelEl}</legend>
                    <div className="flex flex-col gap-1 pt-1">
                      {field.options?.map((opt, i) => {
                        const optId = `${id}-${i}`;
                        const checked =
                          field.type === "radio"
                            ? selected === opt
                            : Array.isArray(selected) && (selected as string[]).includes(opt);
                        return (
                          <label
                            key={opt}
                            htmlFor={optId}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/30"
                          >
                            <input
                              id={optId}
                              type={field.type === "radio" ? "radio" : "checkbox"}
                              name={id}
                              value={opt}
                              checked={checked}
                              onChange={(e) =>
                                field.type === "radio"
                                  ? handleChange(field.id, e.target.value)
                                  : handleChecklistChange(field.id, opt, e.target.checked)
                              }
                              className={`size-4 border-border/50 text-primary focus:ring-primary/50 ${
                                field.type === "radio" ? "rounded-full" : "rounded"
                              }`}
                            />
                            <span className="text-sm text-foreground">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FieldError id={errId} message={error} />
                  </fieldset>
                );
              }

              return (
                <div key={field.id} data-field={id} className="space-y-2">
                  <label htmlFor={id} className="block">
                    {labelEl}
                  </label>

                  {field.type === "text" && (
                    <input
                      id={id}
                      type="text"
                      value={(formData[field.id] as string) || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      maxLength={LIMITS.textAnswerMax}
                      autoComplete={autoCompleteFor(field.label)}
                      aria-required={field.required || undefined}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={describedBy}
                      className={inputClass}
                    />
                  )}

                  {field.type === "number" && (
                    <input
                      id={id}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={(formData[field.id] as string) || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      aria-required={field.required || undefined}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={describedBy}
                      className={inputClass}
                    />
                  )}

                  {field.type === "select" && (
                    <Select
                      value={(formData[field.id] as string) || ""}
                      onValueChange={(value) => handleChange(field.id, value)}
                    >
                      <SelectTrigger
                        id={id}
                        aria-required={field.required || undefined}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={describedBy}
                        className={`${inputClass} h-[46px]`}
                      >
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <FieldError id={errId} message={error} />
                </div>
              );
            })}
          </div>

          {submitError && (
            <div
              role="alert"
              className="mx-auto flex max-w-md items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <RiAlertLine className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className={`block w-full max-w-xs md:max-w-md mx-auto rounded-2xl px-6 py-4 font-syne text-base font-bold tracking-wide text-primary-foreground shadow-lg transition-all active:scale-98 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              isSubmitting ? "btn-shimmer" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isSubmitting ? "Submitting..." : "Submit Response"}
          </button>
        </form>
      )}
    </>
  );
}
