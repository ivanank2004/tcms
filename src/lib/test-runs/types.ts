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
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
    bgClass: "bg-slate-800",
    textClass: "text-slate-300",
    borderClass: "border-slate-700",
  },
  passed: {
    label: "Passed",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    bgClass: "bg-emerald-500",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
  },
  failed: {
    label: "Failed",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    bgClass: "bg-rose-500",
    textClass: "text-rose-400",
    borderClass: "border-rose-500/30",
  },
  blocked: {
    label: "Blocked",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    bgClass: "bg-amber-500",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
  },
  skipped: {
    label: "Skipped",
    badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    bgClass: "bg-indigo-500",
    textClass: "text-indigo-400",
    borderClass: "border-indigo-500/30",
  },
};

export const RUN_STATUS_CONFIG: Record<
  TestRunStatus,
  { label: string; badgeClass: string }
> = {
  not_started: {
    label: "Not Started",
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  aborted: {
    label: "Aborted",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
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
