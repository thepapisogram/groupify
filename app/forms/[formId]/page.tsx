"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FormField } from "@/components/groupify/form-builder";
import { PageHeader } from "@/components/groupify/page-header";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FormFillerPage() {
  const params = useParams();
  const formId = params.formId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formConfig, setFormConfig] = useState<{ title: string; fields: FormField[] } | null>(null);
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function fetchForm() {
      try {
        const res = await fetch(`/api/forms/${formId}`);
        if (!res.ok) {
          throw new Error("Form not found or is no longer active");
        }
        const data = await res.json();
        setFormConfig(data);
      } catch (err: any) {
        setError(err.message || "Failed to load form");
      } finally {
        setLoading(false);
      }
    }
    fetchForm();
  }, [formId]);

  const handleChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig) return;

    for (const field of formConfig.fields) {
      if (field.required && !formData[field.id]?.trim()) {
        toast.error(`Please fill out the required field: ${field.label}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit form");
      }

      setIsSuccess(true);
      toast.success("Response submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mesh-bg relative min-h-dvh flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading form...</p>
      </div>
    );
  }

  if (error || !formConfig) {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
          <PageHeader />
          <div className="mt-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive backdrop-blur-sm">
            <h2 className="text-lg font-semibold">Error</h2>
            <p className="mt-2 text-sm">{error || "Form not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-16">
          <PageHeader />
          <div className="mt-12 space-y-6 rounded-2xl border border-border/50 bg-card/70 p-8 text-center backdrop-blur-sm shadow-xl animate-slide-up">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Thank you!</h2>
            <p className="text-muted-foreground">Your response has been recorded successfully.</p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setFormData({});
                  setIsSuccess(false);
                }}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                Submit another response
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-12">
        <PageHeader />
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-8 animate-slide-up">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{formConfig.title}</h1>
            <p className="text-muted-foreground">Please fill out the details below to join.</p>
          </div>

          <div className="space-y-6 rounded-2xl border border-border/50 bg-card/70 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
            {formConfig.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                </label>
                
                {field.type === "text" && (
                  <input
                    type="text"
                    value={formData[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    required={field.required}
                    className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                )}

                {field.type === "number" && (
                  <input
                    type="number"
                    value={formData[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    required={field.required}
                    className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                )}

                {field.type === "select" && (
                  <Select
                    value={formData[field.id] || ""}
                    onValueChange={(value) => handleChange(field.id, value)}
                    required={field.required}
                  >
                    <SelectTrigger className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 h-[46px]">
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
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full rounded-2xl px-6 py-4 font-syne text-base font-bold tracking-wide text-primary-foreground shadow-lg transition-all active:scale-98 disabled:opacity-50 ${
              isSubmitting ? "btn-shimmer" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isSubmitting ? "Submitting..." : "Submit Response"}
          </button>
        </form>
      </div>
    </div>
  );
}
