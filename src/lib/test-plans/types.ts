import { z } from "zod";
import type { TestPlan } from "@/db/schema";

export type TestPlanStatus = "draft" | "active" | "completed" | "archived";
export const TEST_PLAN_STATUSES: TestPlanStatus[] = ["draft", "active", "completed", "archived"];

export const CreateTestPlanSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  projectId: z.string().min(1, "Project ID is required"),
  name: z.string().min(2, "Test plan name must be at least 2 characters").max(255),
  description: z.string().max(2000).optional(),
  scopeNotes: z.string().max(4000).optional(),
  targetRelease: z.string().max(100).optional(),
  environment: z.string().max(50).optional(),
  plannedStartDate: z.string().optional(),
  dueDate: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).default("draft"),
  testCaseIds: z.array(z.string()).default([]),
});

export const UpdateTestPlanSchema = CreateTestPlanSchema.extend({
  planId: z.string().min(1, "Plan ID is required"),
});

export interface TestPlanActionResult {
  error?: string;
  success?: boolean;
  plan?: TestPlan;
  deprecatedCount?: number;
}
