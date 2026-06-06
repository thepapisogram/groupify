"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { FormBuilder, FormField } from "@/components/groupify/form-builder";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";

export default function EditFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.formId as string;
  const adminToken = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<{
    title: string;
    fields: FormField[];
  } | null>(null);

  useEffect(() => {
    async function fetchForm() {
      try {
        const res = await fetch(`/api/forms/${formId}`);
        if (!res.ok) {
          throw new Error("Form not found");
        }
        const data = await res.json();
        setFormData({ title: data.title, fields: data.fields });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load form");
      } finally {
        setLoading(false);
      }
    }
    fetchForm();
  }, [formId]);

  if (loading) {
    return (
      <div className="mesh-bg relative min-h-dvh flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">
          Loading form data...
        </p>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mt-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive backdrop-blur-sm">
            <h2 className="text-lg font-semibold">Error</h2>
            <p className="mt-2 text-sm">{error || "Form not found"}</p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (!adminToken) {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mt-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive backdrop-blur-sm">
            <h2 className="text-lg font-semibold">Unauthorized</h2>
            <p className="mt-2 text-sm">Missing admin token</p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <FormBuilder
      isEdit
      formId={formId}
      adminToken={adminToken}
      initialTitle={formData.title}
      initialFields={formData.fields}
    />
  );
}
