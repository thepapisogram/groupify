"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { FormField } from "@/components/groupify/form-builder";
import { PageHeader } from "@/components/groupify/page-header";
import { Sidebar } from "@/components/groupify/sidebar";
import { ResultsPanel } from "@/components/groupify/results-panel";
import { buildGroups, exportGroups } from "@/components/groupify/utils";
import { DistributionMode, Group, ExportFormat } from "@/components/groupify/types";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.formId as string;
  const adminToken = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [formConfig, setFormConfig] = useState<{ title: string; fields: FormField[] } | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  
  // Grouping state
  const [size, setSize] = useState(4);
  const [groupCount, setGroupCount] = useState(2);
  const [groupBy, setGroupBy] = useState<"size" | "count">("size");
  const [mode, setMode] = useState<DistributionMode>("best");
  const [groups, setGroups] = useState<Group[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${formId}/admin?token=${adminToken}`);
      if (!res.ok) {
        throw new Error("Unauthorized or form not found");
      }
      const data = await res.json();
      setFormConfig(data.form);
      setSubmissions(data.submissions || []);
    } catch (err: any) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [formId, adminToken]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!window.confirm("Are you sure you want to delete this response?")) return;

    try {
      const res = await fetch(`/api/forms/${formId}/submissions/${submissionId}?token=${adminToken}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to delete");

      setSubmissions(submissions.filter(s => s._id !== submissionId));
      toast.success("Submission deleted");
    } catch (error) {
      toast.error("Failed to delete submission");
    }
  };

  // Handlers for synchronization (same as homepage)
  const nameCount = submissions.length;
  const hasResults = groups.length > 0;
  const totalGrouped = groups.reduce((sum, group) => sum + group.members.length, 0);

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

  const handleGenerate = useCallback(() => {
    if (nameCount === 0 || !formConfig) return;

    setIsWorking(true);
    setTimeout(() => {
      // Map submissions to the expected structured format
      const primaryField = formConfig.fields.find(f => f.isPrimary) || formConfig.fields[0];
      const items = submissions.map(sub => ({
        label: sub.data[primaryField.id] || "Unknown",
        data: sub.data
      }));

      const result = buildGroups(
        items,
        groupBy,
        groupBy === "size" ? size : groupCount,
        mode,
      );
      
      setGroups(result);
      setIsWorking(false);
      toast.success(`${result.length} group${result.length !== 1 ? "s" : ""} created`);
    }, 380);
  }, [mode, nameCount, submissions, size, groupCount, groupBy, formConfig]);

  const handleShuffle = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleExport = async (format: ExportFormat) => {
    if (groups.length === 0 || !formConfig) return;

    const id = toast.loading(`Preparing ${format === "excel" ? "Excel" : "Word"} file...`);

    try {
      await exportGroups(groups, format, formConfig.fields);
      toast.dismiss(id);
      toast.success("File downloaded!");
    } catch {
      toast.dismiss(id);
      toast.error("Export failed - please try again");
    }
  };

  const handleCopyText = async () => {
    if (groups.length === 0 || !formConfig) return;

    const primaryField = formConfig.fields.find(f => f.isPrimary) || formConfig.fields[0];

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

  if (loading) {
    return (
      <div className="mesh-bg relative min-h-dvh flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
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
            <p className="mt-2 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg relative min-h-dvh pb-20">
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-12">
        <PageHeader />
        
        <div className="mt-8 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{formConfig.title}</h1>
            <p className="text-sm text-muted-foreground">Admin Dashboard &bull; {submissions.length} responses</p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/forms/${formId}/edit?token=${adminToken}`}
              className="rounded-xl border border-border/50 bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted"
            >
              Edit Form
            </Link>
            <button
              onClick={fetchSubmissions}
              className="rounded-xl border border-border/50 bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted flex items-center gap-2"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            {!hasResults ? (
              <div className="rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Recent Submissions</h2>
                  {submissions.length > 0 && (
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 shadow-sm animate-fade-in"
                    >
                      Generate Groups
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
                {submissions.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <p>No responses yet.</p>
                    <p className="text-sm mt-1">Share the public link to start collecting data.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                        <tr>
                          {formConfig.fields.map(f => (
                            <th key={f.id} className="px-4 py-3 font-medium">
                              {f.label}
                              {f.isPrimary && <span className="ml-1 text-[10px] text-primary">(Primary)</span>}
                            </th>
                          ))}
                          <th className="px-4 py-3 font-medium text-right">Time</th>
                          <th className="px-4 py-3 font-medium w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((sub) => (
                          <tr key={sub._id} className="border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors">
                            {formConfig.fields.map(f => (
                              <td key={f.id} className="px-4 py-3 text-foreground whitespace-nowrap">
                                {sub.data[f.id] || "-"}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-muted-foreground text-right whitespace-nowrap">
                              <span title={new Date(sub.submittedAt).toLocaleString()}>
                                {formatDistanceToNow(new Date(sub.submittedAt), { addSuffix: true })}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => handleDeleteSubmission(sub._id)}
                                className="p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                title="Delete submission"
                              >
                                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
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
            ) : (
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
            onGroupByChange={setGroupBy}
            onSizeChange={handleSizeChange}
            onGroupCountChange={handleGroupCountChange}
            onModeChange={handleModeChange}
            onGenerate={handleGenerate}
            onExport={handleExport}
            onCopyText={handleCopyText}
          />
        </div>
      </div>
    </div>
  );
}
