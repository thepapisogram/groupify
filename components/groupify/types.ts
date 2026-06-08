export type DistributionMode = "best" | "overflow";
export type ExportFormat = "excel" | "word";

export interface Group {
  id: number;
  label: string;
  members: string[];
  rawMembers?: Record<string, string | string[]>[];
  originalIds?: (string | undefined)[];
  hue: number;
}
