import type { Metadata } from "next";
import { FormBuilder } from "@/components/groupify/form-builder";

export const metadata: Metadata = {
  title: "Create a form",
  description:
    "Build a sign-up form in minutes, share the link, and turn the responses into balanced groups. No account needed.",
  alternates: { canonical: "/forms/new" },
};

export default function NewFormPage() {
  return <FormBuilder />;
}
