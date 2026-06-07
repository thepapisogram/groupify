"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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
import { FormField } from "@/components/groupify/form-builder";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { Sidebar } from "@/components/groupify/sidebar";
import { ResultsPanel } from "@/components/groupify/results-panel";
import { ShareDialog } from "@/components/groupify/share-dialog";
import { buildGroupsAsync, exportGroups, exportResponses } from "@/components/groupify/utils";
import { ConfirmDialog } from "@/components/groupify/confirm-dialog";
import {
  DistributionMode,
  Group,
  ExportFormat,
} from "@/components/groupify/types";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.formId as string;
  const adminToken = searchParams.get("token") || "";
  const router = useRouter();

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/forms/${formId}` : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formConfig, setFormConfig] = useState<{
    title: string;
    fields: FormField[];
    isClosed?: boolean;
  } | null>(null);
  const [submissions, setSubmissions] = useState<{ _id: string; submittedAt: string; data: Record<string, string | string[]> }[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isAdminsDialogOpen, setIsAdminsDialogOpen] = useState(false);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isUpdatingAdmins, setIsUpdatingAdmins] = useState(false);

  // Confirm-dialog state for submission deletion
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleFormStatus = async () => {
    if (!formConfig) return;
    setIsUpdatingStatus(true);
    const newStatus = !formConfig.isClosed;
    try {
      const res = await fetch(`/api/forms/${formId}/status?token=${adminToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isClosed: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setFormConfig({ ...formConfig, isClosed: newStatus });
      toast.success(`Form is now ${newStatus ? "closed" : "open"}`);
    } catch {
      toast.error("Failed to update form status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedSubmissions = useMemo(() => {
    const sortableItems = [...submissions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === "time") {
          aValue = new Date(a.submittedAt).getTime();
          bValue = new Date(b.submittedAt).getTime();
        } else {
          aValue = a.data[sortConfig.key] || "";
          bValue = b.data[sortConfig.key] || "";
        }

        if (Array.isArray(aValue)) aValue = aValue.join(", ");
        if (Array.isArray(bValue)) bValue = bValue.join(", ");

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    } else {
       sortableItems.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }
    return sortableItems;
  }, [submissions, sortConfig]);

  // Grouping state
  const [size, setSize] = useState(4);
  const [groupCount, setGroupCount] = useState(2);
  const [groupBy, setGroupBy] = useState<"size" | "count">("size");
  const [mode, setMode] = useState<DistributionMode>("best");
  const [groups, setGroups] = useState<Group[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState<"submissions" | "groups">("submissions");

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${formId}/admin?token=${adminToken}`);
      if (!res.ok) {
        throw new Error("Unauthorized or form not found");
      }
      const data = await res.json();
      setFormConfig(data.form);
      setAdminEmails(data.form.adminEmails || []);
      setSubmissions(data.submissions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [formId, adminToken]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      const res = await fetch(
        `/api/forms/${formId}/submissions/${submissionId}?token=${adminToken}`,
        { method: "DELETE" },
      );

      if (!res.ok) throw new Error("Failed to delete");

      setSubmissions(submissions.filter((s) => s._id !== submissionId));
      toast.success("Submission deleted");
    } catch {
      toast.error("Failed to delete submission");
    }
  };

  // Handlers for synchronization (same as homepage)
  const nameCount = submissions.length;
  const hasResults = groups.length > 0;
  const totalGrouped = groups.reduce(
    (sum, group) => sum + group.members.length,
    0,
  );
  const estGroups = nameCount >= 2 ? groupCount : 0;

  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    setGroupBy("size");
    if (nameCount > 0) {
      setGroupCount(
        mode === "best"
          ? Math.max(1, Math.floor(nameCount / newSize))
          : Math.ceil(nameCount / newSize),
      );
    }
  };

  const handleGroupCountChange = (newCount: number) => {
    setGroupCount(newCount);
    setGroupBy("count");
    if (nameCount > 0) {
      setSize(Math.max(2, Math.ceil(nameCount / newCount)));
    }
  };

  const handleModeChange = (newMode: DistributionMode) => {
    setMode(newMode);
    if (groupBy === "size" && nameCount > 0) {
      setGroupCount(
        newMode === "best"
          ? Math.max(1, Math.floor(nameCount / size))
          : Math.ceil(nameCount / size),
      );
    }
  };

  const handleGenerate = useCallback(async () => {
    if (nameCount === 0 || !formConfig) return;

    setIsWorking(true);
    try {
      const primaryField =
        formConfig.fields.find((f) => f.isPrimary) || formConfig.fields[0];
      const items = submissions.map((sub) => {
        const val = sub.data[primaryField.id];
        const label = val ? (Array.isArray(val) ? val.join(", ") : val) : "Unknown";
        return { label, data: sub.data };
      });

      const result = await buildGroupsAsync(
        items,
        groupBy,
        groupBy === "size" ? size : groupCount,
        mode,
      );

      setGroups(result);
      setActiveTab("groups");
      toast.success(
        `${result.length} group${result.length !== 1 ? "s" : ""} created`,
      );
    } catch {
      toast.error("Failed to generate groups");
    } finally {
      setIsWorking(false);
    }
  }, [mode, nameCount, submissions, size, groupCount, groupBy, formConfig]);

  const handleShuffle = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

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

  const handleExportResponses = async (format: ExportFormat) => {
    if (submissions.length === 0 || !formConfig) return;

    const id = toast.loading(
      `Preparing ${format === "excel" ? "Excel" : "Word"} file...`,
    );

    try {
      await exportResponses(submissions, format, formConfig.fields);
      toast.dismiss(id);
      toast.success("File downloaded!");
    } catch {
      toast.dismiss(id);
      toast.error("Export responses failed - please try again");
    }
  };

  const handleCopyText = async () => {
    if (groups.length === 0 || !formConfig) return;

    const primaryField =
      formConfig.fields.find((f) => f.isPrimary) || formConfig.fields[0];

    const text = groups
      .map(
        (group) =>
          `${group.label}\n${group.rawMembers?.map((member, index) => `${index + 1}. ${member[primaryField.id] || "Unknown"}`).join("\n")}`,
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
      const res = await fetch(`/api/forms/${formId}/regenerate?token=${adminToken}`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      
      toast.success("Link regenerated successfully");
      setIsRegenerateDialogOpen(false);
      setIsShareDialogOpen(false);
      
      // Redirect to the new admin URL
      router.push(`/forms/${data.newFormId}/admin?token=${adminToken}`);
    } catch {
      toast.error("Failed to regenerate link");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAddAdmin = () => {
    if (!newAdminEmail || !newAdminEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (adminEmails.includes(newAdminEmail)) {
      toast.error("Admin already added");
      return;
    }
    setAdminEmails([...adminEmails, newAdminEmail]);
    setNewAdminEmail("");
  };

  const handleRemoveAdmin = (email: string) => {
    setAdminEmails(adminEmails.filter((e) => e !== email));
  };

  const handleSaveAdmins = async () => {
    setIsUpdatingAdmins(true);
    try {
      const res = await fetch(`/api/forms/${formId}/admins?token=${adminToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmails }),
      });
      if (!res.ok) throw new Error("Failed to update admins");
      toast.success("Admins updated successfully");
      setIsAdminsDialogOpen(false);
    } catch {
      toast.error("Failed to update admins");
    } finally {
      setIsUpdatingAdmins(false);
    }
  };

  if (loading) {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />

          {/* Header skeleton */}
          <div className="mt-8 mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-7 w-56 animate-pulse rounded-xl bg-muted/40" />
              <div className="h-4 w-36 animate-pulse rounded-xl bg-muted/30" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-36 animate-pulse rounded-xl bg-muted/30" />
              <div className="h-9 w-24 animate-pulse rounded-xl bg-muted/30" />
              <div className="h-9 w-16 animate-pulse rounded-xl bg-muted/30" />
            </div>
          </div>

          {/* Table skeleton */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-5 w-40 animate-pulse rounded-xl bg-muted/40" />
              <div className="h-8 w-28 animate-pulse rounded-xl bg-muted/30" />
            </div>
            <div className="space-y-3">
              {/* Table header */}
              <div className="h-9 w-full animate-pulse rounded-xl bg-muted/30" />
              {/* Skeleton rows */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-full animate-pulse rounded-xl bg-muted/20"
                  style={{ animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !formConfig) {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mt-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive backdrop-blur-sm">
            <h2 className="text-lg font-semibold">Error</h2>
            <p className="mt-2 text-sm">{error}</p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg relative min-h-dvh pb-20">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        <div className="mt-8 mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {formConfig.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Admin Dashboard &bull; {submissions.length} responses
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Status toggle — always visible */}
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2">
              <span className="text-sm font-medium text-foreground hidden sm:inline">
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
                  More
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={fetchSubmissions} className="cursor-pointer gap-2">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                  <Link href={`/forms/${formId}/edit?token=${adminToken}`}>
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit Form
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAdminsDialogOpen(true)} className="cursor-pointer gap-2">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Manage Admins
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6 min-w-0">
            {hasResults && (
              <div className="flex p-1 space-x-1 bg-muted/30 border border-border/50 rounded-xl w-fit">
                <button
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
                  onClick={() => setActiveTab("groups")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === "groups"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Generated Groups
                </button>
              </div>
            )}

            {(!hasResults || activeTab === "submissions") && (
              <div className="rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm shadow-md animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Recent Submissions
                  </h2>
                  {submissions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted/80 shadow-sm animate-fade-in">
                            Export
                            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExportResponses("excel")} className="cursor-pointer">
                            Export as Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportResponses("word")} className="cursor-pointer">
                            Export as Word
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button
                        onClick={handleGenerate}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 shadow-sm animate-fade-in"
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
                  <div className="py-12 text-center text-muted-foreground">
                    <p>No responses yet.</p>
                    <p className="text-sm mt-1">
                      Share the public link to start collecting data.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                        <tr>
                          {formConfig.fields.map((f) => (
                            <th 
                              key={f.id} 
                              className={`px-4 py-3 font-medium whitespace-nowrap ${f.isPrimary ? 'cursor-pointer hover:bg-muted/30 select-none' : ''}`}
                              onClick={f.isPrimary ? () => requestSort(f.id) : undefined}
                            >
                              <div className="flex items-center gap-1">
                                {f.label}
                                {f.isPrimary && (
                                  <span className="ml-1 text-xs text-primary">
                                    (Primary)
                                  </span>
                                )}
                                {f.isPrimary && sortConfig?.key === f.id && (
                                  <span className="text-primary text-xs">
                                    {sortConfig.direction === "asc" ? "▲" : "▼"}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                          <th 
                            className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-muted/30 select-none whitespace-nowrap"
                            onClick={() => requestSort("time")}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Time
                              {sortConfig?.key === "time" && (
                                <span className="text-primary text-xs">
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </div>
                          </th>
                          <th className="px-4 py-3 font-medium w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSubmissions.map((sub) => (
                          <tr
                            key={sub._id}
                            className="border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors"
                          >
                            {formConfig.fields.map((f) => (
                              <td
                                key={f.id}
                                className="px-4 py-3 text-foreground whitespace-nowrap"
                              >
                                {Array.isArray(sub.data[f.id]) 
                                  ? (sub.data[f.id] as string[]).join(", ") 
                                  : sub.data[f.id] || "-"}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-muted-foreground text-right whitespace-nowrap">
                              <span
                                title={new Date(
                                  sub.submittedAt,
                                ).toLocaleString()}
                              >
                                {formatDistanceToNow(
                                  new Date(sub.submittedAt),
                                  { addSuffix: true },
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setConfirmDeleteId(sub._id)}
                                className="p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                title="Delete submission"
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
            {hasResults && activeTab === "groups" && (
              <ResultsPanel
                groups={groups}
                totalGrouped={totalGrouped}
                onShuffle={handleShuffle}
              />
            )}
          </div>

          <Sidebar
            groupBy={groupBy}
            size={size}
            groupCount={groupCount}
            mode={mode}
            isWorking={isWorking}
            nameCount={nameCount}
            hasResults={hasResults}
            copiedText={copiedText}
            estGroups={estGroups}
            groupsCount={groups.length}
            onGroupByChange={setGroupBy}
            onSizeChange={handleSizeChange}
            onGroupCountChange={handleGroupCountChange}
            onModeChange={handleModeChange}
            onGenerate={handleGenerate}
            onExport={handleExport}
            onCopyText={handleCopyText}
          />
        </div>
        
        <ShareDialog
          isOpen={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          shareUrl={publicUrl}
          onRegenerate={() => setIsRegenerateDialogOpen(true)}
        />

        <Dialog open={isRegenerateDialogOpen} onOpenChange={setIsRegenerateDialogOpen}>
          <DialogContent className="w-[calc(100%-2rem)] sm:w-full rounded-2xl sm:max-w-md border-border/50 bg-card/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-destructive text-xl">Regenerate Link?</DialogTitle>
              <DialogDescription>
                This will generate a new public link for this form. <strong>The old link will immediately stop working</strong>, and anyone using it will get a 404 error.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 sm:justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRegenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRegenerateLink} disabled={isRegenerating}>
                {isRegenerating ? "Regenerating..." : "Regenerate Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAdminsDialogOpen} onOpenChange={setIsAdminsDialogOpen}>
          <DialogContent className="w-[calc(100%-2rem)] sm:w-full rounded-2xl sm:max-w-md border-border/50 bg-card/95 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Manage Admins</DialogTitle>
              <DialogDescription>
                Admins will be able to view responses, generate groups, and manage the form settings. They will see this form in their &quot;My Forms&quot; dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="admin@example.com"
                  className="flex-1 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAdmin();
                    }
                  }}
                />
                <Button onClick={handleAddAdmin} variant="secondary" className="rounded-xl">
                  Add
                </Button>
              </div>
              {adminEmails.length > 0 ? (
                <ul className="space-y-2">
                  {adminEmails.map((email) => (
                    <li key={email} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                      <span className="text-foreground">{email}</span>
                      <button
                        onClick={() => handleRemoveAdmin(email)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No admins added yet.</p>
              )}
            </div>
            <DialogFooter className="mt-4 sm:justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAdminsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAdmins} disabled={isUpdatingAdmins}>
                {isUpdatingAdmins ? "Saving..." : "Save Admins"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Footer />
      </div>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
        title="Delete response?"
        description="This will permanently remove this submission. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (confirmDeleteId) handleDeleteSubmission(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}
