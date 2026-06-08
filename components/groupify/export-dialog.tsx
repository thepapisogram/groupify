"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiArrowRightSLine, RiArrowDownSLine } from "@remixicon/react";
import { FormField } from "./form-builder";
type SubmissionData = { _id: string; submittedAt: string; data: Record<string, string | string[]> };

interface ExportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formConfig: { title: string; fields: FormField[] };
  submissions: SubmissionData[];
  onExport: (
    filteredSubmissions: SubmissionData[],
    format: "excel" | "word",
    filteredFields: FormField[],
    fileName: string
  ) => Promise<void>;
}

export function ExportDialog({
  isOpen,
  onOpenChange,
  formConfig,
  submissions,
  onExport,
}: ExportDialogProps) {
  const fieldsWithTime = useMemo(() => {
    return [...formConfig.fields, { id: "_time", label: "Time", type: "text" } as FormField];
  }, [formConfig.fields]);

  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(fieldsWithTime.map((f) => f.id))
  );
  
  // State for value filters: fieldId -> Set of selected values
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [isExporting, setIsExporting] = useState<"excel" | "word" | null>(null);
  const [fileName, setFileName] = useState(formConfig.title);

  // Get distinct values for filterable fields (radio, select)
  const filterableFields = useMemo(() => {
    return fieldsWithTime.filter(
      (f) => f.type === "radio" || f.type === "select"
    );
  }, [fieldsWithTime]);

  const distinctValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const field of filterableFields) {
      const values = new Set<string>();
      submissions.forEach((sub) => {
        const val = sub.data[field.id];
        if (val) {
          if (Array.isArray(val)) {
            val.forEach(v => values.add(v));
          } else {
            values.add(String(val));
          }
        }
      });
      map[field.id] = Array.from(values);
    }
    return map;
  }, [submissions, filterableFields]);

  const toggleField = (fieldId: string) => {
    const next = new Set(selectedFields);
    if (next.has(fieldId)) {
      next.delete(fieldId);
    } else {
      next.add(fieldId);
    }
    setSelectedFields(next);
  };

  const toggleFilter = (fieldId: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[fieldId] || []);
      if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      next[fieldId] = set;
      return next;
    });
  };

  const handleExport = async (format: "excel" | "word") => {
    setIsExporting(format);
    
    try {
      const filteredFields = fieldsWithTime.filter((f) =>
        selectedFields.has(f.id)
      );

      const filteredSubmissions = submissions.filter((sub) => {
        // Check all active filters
        for (const [fieldId, selectedValues] of Object.entries(filters)) {
          if (selectedValues.size === 0) continue; // no filter active for this field
          
          const val = sub.data[fieldId];
          if (!val) return false; // if it has no value but we have a filter, it fails
          
          if (Array.isArray(val)) {
            // for checklists (if we ever filter by them), at least one selected value must be present
            if (!val.some(v => selectedValues.has(v))) return false;
          } else {
            if (!selectedValues.has(String(val))) return false;
          }
        }
        return true;
      });

      await onExport(filteredSubmissions, format, filteredFields, fileName || formConfig.title);
    } finally {
      setIsExporting(null);
      onOpenChange(false);
    }
  };

  // Calculate match count
  const matchCount = useMemo(() => {
    return submissions.filter((sub) => {
      for (const [fieldId, selectedValues] of Object.entries(filters)) {
        if (selectedValues.size === 0) continue;
        const val = sub.data[fieldId];
        if (!val) return false;
        if (Array.isArray(val)) {
          if (!val.some(v => selectedValues.has(v))) return false;
        } else {
          if (!selectedValues.has(String(val))) return false;
        }
      }
      return true;
    }).length;
  }, [submissions, filters]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:w-full rounded-2xl sm:max-w-2xl border-border/50 bg-card/95 backdrop-blur-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">
            Export Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 pt-4">
          <details className="group space-y-3 [&_summary::-webkit-details-marker]:hidden">
            <summary className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex justify-between items-center cursor-pointer select-none list-none">
              <span className="flex items-center gap-1">
                <RiArrowRightSLine className="size-4 group-open:hidden" />
                <RiArrowDownSLine className="size-4 hidden group-open:block" />
                Select Columns (Optional)
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {selectedFields.size} selected
              </span>
            </summary>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {formConfig.fields.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-2 text-sm text-foreground cursor-pointer hover:bg-muted/20 p-2 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.has(f.id)}
                    onChange={() => toggleField(f.id)}
                    className="rounded border-border/50 text-primary focus:ring-primary/50"
                  />
                  <span className="truncate">{f.label}</span>
                </label>
              ))}
            </div>
          </details>

          {filterableFields.length > 0 && (
            <details className="group space-y-3 [&_summary::-webkit-details-marker]:hidden">
              <summary className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex justify-between items-center cursor-pointer select-none list-none">
                <span className="flex items-center gap-1">
                  <RiArrowRightSLine className="size-4 group-open:hidden" />
                  <RiArrowDownSLine className="size-4 hidden group-open:block" />
                  Filter Rows (Optional)
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  Matching {matchCount} of {submissions.length}
                </span>
              </summary>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {filterableFields.map((field) => {
                  const values = distinctValues[field.id] || [];
                  if (values.length === 0) return null;
                  
                  return (
                    <div key={field.id} className="space-y-2 border border-border/50 p-3 rounded-xl bg-muted/10">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        {field.label}
                      </p>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-2">
                        {values.map((val) => {
                          const isActive = filters[field.id]?.has(val);
                          return (
                            <label
                              key={val}
                              className="flex items-center gap-2 text-sm text-foreground cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                checked={isActive || false}
                                onChange={() => toggleFilter(field.id, val)}
                                className="rounded border-border/50 text-primary focus:ring-primary/50"
                              />
                              <span className="truncate group-hover:text-primary transition-colors">
                                {val}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">
              File Name
            </h3>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={formConfig.title}
              className="bg-muted/50 border-border/50"
              autoFocus={false}
            />
          </div>

          <div className="pt-4 flex flex-col gap-3 border-t border-border/50">
            <Button
              onClick={() => handleExport("excel")}
              disabled={isExporting !== null || selectedFields.size === 0 || matchCount === 0}
              className="w-full font-semibold"
              size="lg"
            >
              {isExporting === "excel" ? "Exporting..." : `Export as Excel (.xlsx)`}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("word")}
              disabled={isExporting !== null || selectedFields.size === 0 || matchCount === 0}
              className="w-full font-semibold"
              size="lg"
            >
              {isExporting === "word" ? "Exporting..." : `Export as Word (.docx)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
