import { z } from "zod";
import type { TestRun } from "@/db/schema";

export type TestRunStatus = "not_started" | "in_progress" | "completed" | "aborted";
export type ExecutionStatus = "not_run" | "passed" | "failed" | "blocked" | "skipped";

export const EXECUTION_STATUS_CONFIG: Record<
  ExecutionStatus,
  { label: string; badgeClass: string; bgClass: string; textClass: string; borderClass: string }
> = {
  not_run: {
    label: "Not Run",
    badgeClass: "bg-zinc-900 text-zinc-400 border-zinc-800",
    bgClass: "bg-zinc-800",
    textClass: "text-zinc-400",
    borderClass: "border-zinc-800",
  },
  passed: {
    label: "Passed",
    badgeClass: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
    bgClass: "bg-emerald-500",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-800/50",
  },
  failed: {
    label: "Failed",
    badgeClass: "bg-rose-950/40 text-rose-300 border-rose-800/50",
    bgClass: "bg-rose-500",
    textClass: "text-rose-400",
    borderClass: "border-rose-800/50",
  },
  blocked: {
    label: "Blocked",
    badgeClass: "bg-amber-950/40 text-amber-300 border-amber-800/50",
    bgClass: "bg-amber-500",
    textClass: "text-amber-400",
    borderClass: "border-amber-800/50",
  },
  skipped: {
    label: "Skipped",
    badgeClass: "bg-zinc-800/80 text-zinc-300 border-zinc-700/60",
    bgClass: "bg-zinc-500",
    textClass: "text-zinc-300",
    borderClass: "border-zinc-700/60",
  },
};

export const RUN_STATUS_CONFIG: Record<
  TestRunStatus,
  { label: string; badgeClass: string }
> = {
  not_started: {
    label: "Not Started",
    badgeClass: "bg-zinc-900 text-zinc-400 border-zinc-800",
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-sky-950/40 text-sky-300 border-sky-800/50",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
  },
  aborted: {
    label: "Aborted",
    badgeClass: "bg-rose-950/40 text-rose-300 border-rose-800/50",
  },
};

export const CreateTestRunSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  projectId: z.string().min(1, "Project ID is required"),
  testPlanId: z.string().optional(),
  name: z.string().min(2, "Test run name must be at least 2 characters").max(255),
  environment: z.string().min(1, "Environment is required").max(50).default("staging"),
  buildVersion: z.string().max(100).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().max(4000).optional(),
  testCaseIds: z.array(z.string()).default([]),
});

export const RecordExecutionSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  projectId: z.string().min(1, "Project ID is required"),
  testRunId: z.string().min(1, "Test Run ID is required"),
  testRunCaseId: z.string().min(1, "Test Run Case ID is required"),
  status: z.enum(["passed", "failed", "blocked", "skipped"]),
  actualResult: z.string().max(4000).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
});

export interface TestRunActionResult {
  error?: string;
  success?: boolean;
  run?: TestRun;
}
