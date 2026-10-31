export const TEST_TYPE_TAXONOMY = [
  "Positive",
  "Negative",
  "Edge Case",
  "Boundary Value",
  "Validation",
  "Security",
  "Integration",
  "Regression",
  "Error Handling",
  "Performance",
  "Compatibility",
] as const;

export type TestType = (typeof TEST_TYPE_TAXONOMY)[number];

export const PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const LIFECYCLES = ["draft", "ready", "deprecated"] as const;
export type Lifecycle = (typeof LIFECYCLES)[number];

export const PRIORITY_CONFIG: Record<Priority, { label: string; badgeClass: string }> = {
  critical: { label: "Critical", badgeClass: "bg-red-500/10 text-red-300 border-red-500/30" },
  high: { label: "High", badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  medium: { label: "Medium", badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  low: { label: "Low", badgeClass: "bg-slate-800 text-slate-300 border-slate-700" },
};

export const LIFECYCLE_CONFIG: Record<Lifecycle, { label: string; badgeClass: string }> = {
  draft: { label: "Draft", badgeClass: "bg-slate-800 text-slate-400 border-slate-700" },
  ready: { label: "Ready", badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  deprecated: { label: "Deprecated", badgeClass: "bg-red-950/40 text-red-400 border-red-800/40 line-through" },
};
