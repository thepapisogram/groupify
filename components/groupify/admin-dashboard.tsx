"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { FormField } from "@/lib/models";
import { adminFetch, adminPagePath } from "@/lib/admin-client";
import { normalizeEmail } from "@/lib/validation";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { Sidebar } from "@/components/groupify/sidebar";
import { ResultsPanel } from "@/components/groupify/results-panel";
import { PublishGroupsDialog } from "@/components/groupify/publish-groups-dialog";
import { RulesPanel } from "@/components/groupify/rules-panel";
import { ResponsesTable } from "@/components/groupify/responses-table";
import { useGrouping } from "@/components/groupify/use-grouping";
import type { Person } from "@/lib/grouping";
import { ShareDialog } from "@/components/groupify/share-dialog";
import { ExportDialog } from "@/components/groupify/export-dialog";
import { exportGroups, exportResponses } from "@/components/groupify/utils";
import { ConfirmDialog } from "@/components/groupify/confirm-dialog";
import type { ExportFormat } from "@/components/groupify/types";
import { toast } from "sonner";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  RiFileCopyLine,
  RiInbox2Line,
  RiRefreshLine,
  RiShareForwardLine,
} from "@remixicon/react";

interface PendingInvite {
  _id: string;
  invitedEmail: string;
  expiresAt: string | Date;
}

interface ActiveAdmin {
  email: string;
  inviteId: string;
}

export interface AdminDashboardProps {
  formId: string;
  initialFormConfig: {
    title: string;
    description?: string;
    fields: FormField[];
    isClosed?: boolean;
  };
  initialSubmissions: {
    _id: string;
    submittedAt: string;
    data: Record<string, string | string[]>;
  }[];
  /** ISO timestamp if the groups are currently published for respondents. */
  initialPublishedAt?: string | null;
  /** Present only when the viewer arrived via an admin link; signed-in owners and collaborators rely on their session. */
  adminToken?: string;
  isOwner: boolean;
  /** False for forms created without an account, which are reachable only through the admin link. */
  hasAccountOwner?: boolean;
}

export function AdminDashboard({
  formId,
  initialFormConfig,
  initialSubmissions,
  initialPublishedAt = null,
  adminToken,
  isOwner,
  hasAccountOwner = true,
}: AdminDashboardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);

  // Forms made without an account are only reachable through this link; offer to save them.
  const [isClaimed, setIsClaimed] = useState(hasAccountOwner);
  const [isClaiming, setIsClaiming] = useState(false);
  const showClaimPrompt = Boolean(adminToken) && !isClaimed;

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const res = await adminFetch(`/api/forms/${formId}/claim`, adminToken, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save this form to your account");
      setIsClaimed(true);
      toast.success("Saved to your account. Find it any time under My Forms.");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save this form to your account");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await adminFetch(`/api/forms/${formId}/duplicate`, adminToken, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't duplicate the form");
      toast.success("Form duplicated");
      // Signed-in users reach their copy through their account; token holders need the new link.
      router.push(adminPagePath(data.formId, "admin", isSignedIn ? undefined : data.adminToken));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't duplicate the form");
    }
  };

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/forms/${formId}`
      : "";

  const [formConfig, setFormConfig] = useState(initialFormConfig);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isAdminsDialogOpen, setIsAdminsDialogOpen] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [activeAdmins, setActiveAdmins] = useState<ActiveAdmin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isUpdatingAdmins, setIsUpdatingAdmins] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isDeletingForm, setIsDeletingForm] = useState(false);

  const handleDeleteForm = async () => {
    setIsDeletingForm(true);
    try {
      const res = await adminFetch(`/api/forms/${formId}`, adminToken, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete form");
      toast.success("Form deleted successfully");
      setIsDeleteDialogOpen(false);
      router.push("/forms");
    } catch {
      toast.error("Failed to delete form");
      setIsDeletingForm(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const fetchInvites = useCallback(async () => {
    setIsLoadingAdmins(true);
    try {
      const res = await adminFetch(`/api/forms/${formId}/invites`, adminToken);
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data.pending || []);
        setActiveAdmins(data.active || []);
      }
    } catch {
      console.error("Failed to fetch invites");
    } finally {
      setIsLoadingAdmins(false);
    }
  }, [formId, adminToken]);

  useEffect(() => {
    fetchInvites(); // Load on mount so it's ready
  }, [fetchInvites]);

  useEffect(() => {
    if (isAdminsDialogOpen) {
      fetchInvites(); // Refresh when opened
    }
  }, [isAdminsDialogOpen, fetchInvites]);

  // Confirm-dialog state for submission deletion
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleFormStatus = async () => {
    if (!formConfig) return;
    setIsUpdatingStatus(true);
    try {
      const res = await adminFetch(`/api/forms/${formId}/status`, adminToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isClosed: !formConfig.isClosed }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      setFormConfig({ ...formConfig, isClosed: data.isClosed });
      toast.success(
        data.isClosed
          ? "Form closed to new responses"
          : "Form open for responses",
      );
    } catch {
      toast.error("Failed to update form status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };


  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState<"submissions" | "groups">(
    "submissions",
  );

  // Each response becomes a person, labelled by the form's primary field.
  const primaryField = useMemo(
    () => formConfig.fields.find((f) => f.isPrimary) || formConfig.fields[0],
    [formConfig.fields],
  );
  const people = useMemo<Person[]>(
    () =>
      submissions.map((sub) => {
        const val = primaryField ? sub.data[primaryField.id] : undefined;
        const label = val ? (Array.isArray(val) ? val.join(", ") : val) : "Unknown";
        return { key: sub._id, label, data: sub.data };
      }),
    [submissions, primaryField],
  );
  const balanceOptions = useMemo(
    () =>
      formConfig.fields
        .filter((f) => f.type === "select" || f.type === "radio" || f.type === "checklist")
        .map((f) => ({ key: f.id, label: f.label })),
    [formConfig.fields],
  );

  const grouping = useGrouping(people);
  const { groups, hasResults } = grouping;

  const [publishedAt, setPublishedAt] = useState<string | null>(initialPublishedAt);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const groupsUrl = typeof window !== "undefined" ? `${window.location.origin}/forms/${formId}/groups` : "";

  const publishGroups = async (): Promise<boolean> => {
    try {
      const res = await adminFetch(`/api/forms/${formId}/groups`, adminToken, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: groups.map((g) => ({ label: g.label, members: g.members })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to publish groups");
      setPublishedAt(data.publishedAt);
      toast.success("Groups published");
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to publish groups");
      return false;
    }
  };

  const unpublishGroups = async (): Promise<boolean> => {
    try {
      const res = await adminFetch(`/api/forms/${formId}/groups`, adminToken, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to unpublish groups");
      setPublishedAt(null);
      setIsPublishDialogOpen(false);
      toast.success("Groups unpublished");
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to unpublish groups");
      return false;
    }
  };

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await adminFetch(`/api/forms/${formId}/admin`, adminToken);
      if (!res.ok) {
        throw new Error("Unauthorized or form not found");
      }
      const data = await res.json();

      setFormConfig(data.form);
      setSubmissions(data.submissions || []);
      toast.success("Data refreshed");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to refresh data",
      );
    }
  }, [formId, adminToken]);

  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      const res = await adminFetch(
        `/api/forms/${formId}/submissions/${submissionId}`,
        adminToken,
        { method: "DELETE" },
      );

      if (!res.ok) throw new Error("Failed to delete");

      setSubmissions(submissions.filter((s) => s._id !== submissionId));
      toast.success("Submission deleted");
    } catch {
      toast.error("Failed to delete submission");
    }
  };

  const nameCount = submissions.length;
  const totalGrouped = groups.reduce(
    (sum, group) => sum + group.members.length,
    0,
  );

  const handleGenerate = async () => {
    const result = await grouping.generate();
    if (result) setActiveTab("groups");
  };

  const handleExport = async (format: ExportFormat) => {
    if (groups.length === 0 || !formConfig) return;

    const id = toast.loading(
      `Preparing ${format === "excel" ? "Excel" : "Word"} file...`,
    );

    try {
      await exportGroups(groups, format, formConfig.fields);
      toast.dismiss(id);
      toast.success("File downloaded!");
    } catch {
      toast.dismiss(id);
      toast.error("Export failed - please try again");
    }
  };

  const handleExportResponses = async (
    filteredSubmissions: typeof initialSubmissions,
    format: ExportFormat,
    filteredFields: FormField[],
    fileName: string
  ) => {
    if (filteredSubmissions.length === 0) return;

    const id = toast.loading(
      `Preparing ${format === "excel" ? "Excel" : "Word"} file...`,
    );

    try {
      await exportResponses(filteredSubmissions, format, filteredFields, fileName);
      toast.dismiss(id);
      toast.success("File downloaded!");
    } catch {
      toast.dismiss(id);
      toast.error("Export responses failed - please try again");
    }
  };

  const handleCopyText = async () => {
    if (groups.length === 0 || !formConfig) return;

    const text = groups
      .map(
        (group) =>
          `${group.label}\n${group.members.map((member, index) => `${index + 1}. ${member}`).join("\n")}`,
      )
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast.error("Clipboard copy failed");
    }
  };

  const handleRegenerateLink = async () => {
    setIsRegenerating(true);
    try {
      const res = await adminFetch(`/api/forms/${formId}/regenerate`, adminToken, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();

      toast.success("Link regenerated successfully");
      setIsRegenerateDialogOpen(false);
      setIsShareDialogOpen(false);

      // Redirect to the new admin URL
      // Token holders need the new token in the URL; signed-in owners keep access via their session.
      router.push(
        adminPagePath(data.newFormId, "admin", adminToken ? data.newAdminToken : undefined),
      );
    } catch {
      toast.error("Failed to regenerate link");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    const wanted = normalizeEmail(newAdminEmail);

    // Check if they are already in pending or active
    if (activeAdmins.some((a) => normalizeEmail(a.email) === wanted)) {
      toast.error("User is already an active collaborator");
      return;
    }
    if (
      pendingInvites.some(
        (i) =>
          normalizeEmail(i.invitedEmail) === wanted &&
          new Date(i.expiresAt) > new Date(),
      )
    ) {
      toast.error("An active invite has already been sent to this email");
      return;
    }

    setIsUpdatingAdmins(true);
    try {
      const res = await adminFetch(`/api/forms/${formId}/invites`, adminToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAdminEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite");

      if (data.emailSent === false && data.inviteLink) {
        try {
          await navigator.clipboard.writeText(data.inviteLink);
          toast.warning("Invite created, but the email couldn't be sent. The invite link was copied so you can share it yourself.");
        } catch {
          toast.warning(`Invite created, but the email couldn't be sent. Share this link: ${data.inviteLink}`, { duration: 15000 });
        }
      } else {
        toast.success("Invite sent successfully");
      }
      setNewAdminEmail("");
      fetchInvites(); // Refresh lists
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setIsUpdatingAdmins(false);
    }
  };

  const handleRevokeOrRemove = async (inviteId: string) => {
    try {
      const res = await adminFetch(
        `/api/forms/${formId}/invites/${encodeURIComponent(inviteId)}`,
        adminToken,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to remove");
      toast.success("Collaborator removed");
      fetchInvites(); // Refresh lists
    } catch {
      toast.error("Failed to remove collaborator");
    }
  };

  return (
    <div className="mesh-bg relative min-h-dvh pb-20">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        {showClaimPrompt && (
          <div
            role="region"
            aria-label="Save this form"
            className="mb-6 print:hidden flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
          >
            <p>
              <strong className="font-semibold">This form isn&apos;t saved to an account.</strong> Anyone with this
              page&apos;s link can manage it, and if you lose the link you lose the form.
            </p>
            {isSignedIn ? (
              <Button type="button" size="sm" onClick={handleClaim} disabled={isClaiming} className="shrink-0">
                {isClaiming ? "Saving..." : "Save to my account"}
              </Button>
            ) : (
              <Button asChild size="sm" className="shrink-0">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(adminPagePath(formId, "admin", adminToken))}`}
                >
                  Sign in to save it
                </Link>
              </Button>
            )}
          </div>
        )}

        <div className="mt-8 mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {formConfig.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Admin Dashboard &bull; {submissions.length} responses
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 print:hidden">
            {/* Status toggle — always visible on desktop */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2">
              <span className="text-sm font-medium text-foreground">
                Accepting Responses
              </span>
              <Switch
                checked={!formConfig.isClosed}
                onCheckedChange={toggleFormStatus}
                disabled={isUpdatingStatus}
              />
            </div>

            {/* Share — always visible (primary action) */}
            <button
              onClick={() => setIsShareDialogOpen(true)}
              className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/20"
            >
              Share Form
            </button>

            {/* More — secondary actions collapsed into dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted">
                  Form Options
                  <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Status toggle - mobile only */}
                <div className="sm:hidden px-2 py-1.5 mb-1 flex items-center justify-between border-b border-border/50">
                  <span className="text-xs font-medium text-muted-foreground">
                    {formConfig.isClosed ? "Closed" : "Accepting"}
                  </span>
                  <Switch
                    checked={!formConfig.isClosed}
                    onCheckedChange={toggleFormStatus}
                    disabled={isUpdatingStatus}
                  />
                </div>
                <DropdownMenuItem
                  onClick={fetchSubmissions}
                  className="cursor-pointer gap-2"
                >
                  <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 3v5h-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                  <Link href={adminPagePath(formId, "edit", adminToken)}>
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Form
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsAdminsDialogOpen(true)}
                  className="cursor-pointer gap-2"
                >
                  <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Manage Collaborators
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDuplicate}
                  className="cursor-pointer gap-2"
                >
                  <RiFileCopyLine className="size-4" />
                  Duplicate Form
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Delete Form
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6 min-w-0">
            <div
              role="group"
              aria-label="View"
              className="print:hidden flex p-1 space-x-1 bg-muted/30 border border-border/50 rounded-xl w-fit"
            >
              <button
                type="button"
                aria-pressed={activeTab === "submissions"}
                onClick={() => setActiveTab("submissions")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "submissions"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Submissions
              </button>
              <button
                type="button"
                aria-pressed={activeTab === "groups"}
                onClick={() => hasResults && setActiveTab("groups")}
                disabled={!hasResults}
                title={
                  !hasResults ? "Generate groups to see results" : undefined
                }
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "groups"
                    ? "bg-card text-foreground shadow-sm"
                    : !hasResults
                      ? "text-muted-foreground/70 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Generated Groups
              </button>
            </div>

            {(!hasResults || activeTab === "submissions") && (
              <div className="rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm shadow-md animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Responses
                  </h2>
                  {submissions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={fetchSubmissions}
                        aria-label="Refresh responses"
                        title="Check for new responses"
                        className="flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                      >
                        <RiRefreshLine className="size-4" />
                        <span className="max-sm:sr-only">Refresh</span>
                      </button>
                      <button
                        onClick={() => setIsExportDialogOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted/80 shadow-sm animate-fade-in"
                      >
                        Export Results
                      </button>

                      <button
                        onClick={handleGenerate}
                        className="max-sm:hidden flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 shadow-sm animate-fade-in"
                      >
                        Generate Groups
                        <svg
                          className="size-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path
                            d="M5 12h14M12 5l7 7-7 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {submissions.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center text-muted-foreground">
                    <RiInbox2Line className="size-12 opacity-20 mb-4" />
                    <p className="font-medium text-foreground">
                      No responses yet.
                    </p>
                    <p className="text-sm mt-1">
                      Share the public link to start collecting data.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-5"
                      onClick={() => setIsShareDialogOpen(true)}
                    >
                      Share the form link
                    </Button>
                  </div>
                ) : (
                  <ResponsesTable
                    fields={formConfig.fields}
                    submissions={submissions}
                    onDelete={setConfirmDeleteId}
                  />
                )}
              </div>
            )}

            {hasResults && activeTab === "groups" && (
              <ResultsPanel
                groups={groups}
                totalGrouped={totalGrouped}
                warnings={grouping.warnings}
                onShuffle={grouping.reshuffle}
                onRename={grouping.rename}
                onMoveMember={grouping.move}
                onUndo={grouping.undo}
                canUndo={grouping.canUndo}
                actions={
                  <button
                    type="button"
                    onClick={() => setIsPublishDialogOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20"
                  >
                    <RiShareForwardLine className="size-3" />
                    {publishedAt ? "Published" : "Publish"}
                  </button>
                }
              />
            )}
          </div>

          <Sidebar
            groupBy={grouping.by}
            size={grouping.size}
            groupCount={grouping.groupCount}
            mode={grouping.mode}
            isWorking={grouping.isWorking}
            nameCount={nameCount}
            hasResults={hasResults}
            copiedText={copiedText}
            estGroups={nameCount >= 2 ? grouping.groupCount : 0}
            groupsCount={groups.length}
            onGroupByChange={grouping.onGroupByChange}
            onSizeChange={grouping.onSizeChange}
            onGroupCountChange={grouping.onGroupCountChange}
            onModeChange={grouping.onModeChange}
            onGenerate={handleGenerate}
            onExport={handleExport}
            onCopyText={handleCopyText}
            rules={
              <RulesPanel
                people={people}
                rules={grouping.rules}
                onAdd={grouping.addRule}
                onRemove={grouping.removeRule}
                balanceOptions={balanceOptions}
                balanceBy={grouping.balanceBy}
                onBalanceChange={grouping.setBalanceBy}
              />
            }
          />
        </div>

        <PublishGroupsDialog
          open={isPublishDialogOpen}
          onOpenChange={setIsPublishDialogOpen}
          groupCount={groups.length}
          memberCount={totalGrouped}
          identifierLabel={primaryField?.label ?? "name"}
          publishedAt={publishedAt}
          url={groupsUrl}
          onPublish={async () => {
            const ok = await publishGroups();
            return ok;
          }}
          onUnpublish={unpublishGroups}
        />

        <ShareDialog
          isOpen={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          shareUrl={publicUrl}
          onRegenerate={() => setIsRegenerateDialogOpen(true)}
        />

        <Dialog
          open={isRegenerateDialogOpen}
          onOpenChange={setIsRegenerateDialogOpen}
        >
          <DialogContent className="w-[calc(100%-2rem)] sm:w-full rounded-2xl sm:max-w-md border-border/50 bg-card/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-destructive text-xl">
                Regenerate Link?
              </DialogTitle>
              <DialogDescription>
                This will generate a new public link for this form.{" "}
                <strong>The old link will immediately stop working</strong>, and
                anyone using it will get a 404 error.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRegenerateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRegenerateLink}
                disabled={isRegenerating}
              >
                {isRegenerating ? "Regenerating..." : "Regenerate Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAdminsDialogOpen} onOpenChange={setIsAdminsDialogOpen}>
          <DialogContent
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="w-[calc(100%-2rem)] sm:w-full rounded-2xl sm:max-w-md border-border/50 bg-card/95 backdrop-blur-md"
          >
            <DialogHeader>
              <DialogTitle className="text-xl">
                Manage Collaborators
              </DialogTitle>
              <DialogDescription>
                Collaborators can view responses, generate groups, and manage
                form settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
              {isOwner && (
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Invite by email..."
                    className="flex-1 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    disabled={isUpdatingAdmins}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAdmin();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddAdmin}
                    disabled={isUpdatingAdmins}
                    variant="secondary"
                    className="rounded-xl"
                  >
                    {isUpdatingAdmins ? "Sending..." : "Invite"}
                  </Button>
                </div>
              )}

              {isLoadingAdmins ? (
                <div className="flex items-center justify-center py-8">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <>
                  {pendingInvites.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">
                        Pending Invites
                      </h4>
                      <ul className="space-y-2">
                        {pendingInvites.map((invite) => {
                          const isExpired =
                            new Date(invite.expiresAt) <= new Date();
                          return (
                            <li
                              key={invite._id}
                              className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                            >
                              <div className="flex flex-col">
                                <span className="text-foreground">
                                  {invite.invitedEmail}
                                </span>
                                <span
                                  className={`text-xs ${isExpired ? "text-amber-500" : "text-muted-foreground"}`}
                                >
                                  {isExpired ? "Expired" : "Pending"}
                                </span>
                              </div>
                              {isOwner && (
                                <button
                                  onClick={() =>
                                    handleRevokeOrRemove(invite._id)
                                  }
                                  className="text-muted-foreground hover:text-destructive transition-colors text-xs font-medium px-2 py-1"
                                >
                                  Revoke
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      Active Collaborators
                    </h4>
                    {activeAdmins.length > 0 ? (
                      <ul className="space-y-2">
                        {activeAdmins.map((admin) => (
                          <li
                            key={admin.email}
                            className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                          >
                            <span className="text-foreground">
                              {admin.email}{" "}
                              {session?.user?.email === admin.email && (
                                <span className="text-muted-foreground ml-1">
                                  (you)
                                </span>
                              )}
                            </span>
                            {isOwner &&
                              session?.user?.email !== admin.email && (
                                <button
                                  onClick={() =>
                                    handleRevokeOrRemove(admin.inviteId)
                                  }
                                  className="text-muted-foreground hover:text-destructive transition-colors text-xs font-medium px-2 py-1"
                                >
                                  Remove
                                </button>
                              )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2 italic text-center rounded-lg border border-border/30 bg-muted/10">
                        No active collaborators yet.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="mt-2 sm:justify-end items-center gap-4">
              <Button onClick={() => setIsAdminsDialogOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Footer />
      </div>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete response?"
        description="This will permanently remove this submission. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (confirmDeleteId) handleDeleteSubmission(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Form?"
        description="This will permanently delete this form, its link, and all collected responses. This action cannot be undone."
        confirmLabel={isDeletingForm ? "Deleting..." : "Delete Form"}
        variant="destructive"
        onConfirm={handleDeleteForm}
      />

      {formConfig && (
        <ExportDialog
          isOpen={isExportDialogOpen}
          onOpenChange={setIsExportDialogOpen}
          formConfig={formConfig}
          submissions={submissions}
          onExport={handleExportResponses}
        />
      )}
    </div>
  );
}
