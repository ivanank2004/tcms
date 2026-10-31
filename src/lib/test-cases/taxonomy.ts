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
  critical: { label: "Critical", badgeClass: "bg-rose-950/40 text-rose-300 border-rose-800/50" },
  high: { label: "High", badgeClass: "bg-amber-950/40 text-amber-300 border-amber-800/50" },
  medium: { label: "Medium", badgeClass: "bg-zinc-800/80 text-zinc-300 border-zinc-700/60" },
  low: { label: "Low", badgeClass: "bg-zinc-900 text-zinc-400 border-zinc-800" },
};

export const LIFECYCLE_CONFIG: Record<Lifecycle, { label: string; badgeClass: string }> = {
  draft: { label: "Draft", badgeClass: "bg-zinc-900 text-zinc-400 border-zinc-800" },
  ready: { label: "Ready", badgeClass: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50" },
  deprecated: { label: "Deprecated", badgeClass: "bg-zinc-900 text-zinc-500 border-zinc-800 line-through" },
};
