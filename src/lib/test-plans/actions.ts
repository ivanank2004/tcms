"use server";

import { db } from "@/db";
import {
  testPlans,
  testPlanCases,
  testRuns,
  testCases,
  modules,
  users,
} from "@/db/schema";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CreateTestPlanSchema,
  UpdateTestPlanSchema,
  type TestPlanStatus,
  type TestPlanActionResult,
} from "./types";

export async function createTestPlanAction(
  prevState: TestPlanActionResult | null,
  payload: z.infer<typeof CreateTestPlanSchema>
): Promise<TestPlanActionResult> {
  const parsed = CreateTestPlanSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const data = parsed.data;

  try {
    const { user, project } = await requireProjectAccess(data.workspaceId, data.projectId, [
      "owner",
      "admin",
      "member",
    ]);

    if (project.status === "archived") {
      return { error: "Cannot create test plans in an archived project." };
    }

    const planId = crypto.randomUUID();

    const newPlan = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(testPlans)
        .values({
          id: planId,
          projectId: data.projectId,
          name: data.name,
          description: data.description || null,
          scopeNotes: data.scopeNotes || null,
          targetRelease: data.targetRelease || null,
          environment: data.environment || null,
          plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          ownerId: data.ownerId || user.id,
          status: data.status,
          createdBy: user.id,
        })
        .returning();

      if (data.testCaseIds.length > 0) {
        // Filter to ensure test cases belong to this project
        const validCases = await tx
          .select({ id: testCases.id })
          .from(testCases)
          .where(and(eq(testCases.projectId, data.projectId), inArray(testCases.id, data.testCaseIds)));

        if (validCases.length > 0) {
          await tx.insert(testPlanCases).values(
            validCases.map((c) => ({
              id: crypto.randomUUID(),
              testPlanId: planId,
              testCaseId: c.id,
            }))
          );
        }
      }

      return inserted;
    });

    revalidatePath(`/workspaces`);
    return { success: true, plan: newPlan };
  } catch (error: any) {
    return { error: error.message || "Failed to create test plan" };
  }
}

export async function updateTestPlanAction(
  prevState: TestPlanActionResult | null,
  payload: z.infer<typeof UpdateTestPlanSchema>
): Promise<TestPlanActionResult> {
  const parsed = UpdateTestPlanSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const data = parsed.data;

  try {
    const { project } = await requireProjectAccess(data.workspaceId, data.projectId, [
      "owner",
      "admin",
      "member",
    ]);

    if (project.status === "archived") {
      return { error: "Cannot update test plans in an archived project." };
    }

    const [existing] = await db
      .select()
      .from(testPlans)
      .where(and(eq(testPlans.id, data.planId), eq(testPlans.projectId, data.projectId)))
      .limit(1);

    if (!existing) {
      return { error: "Test plan not found" };
    }

    const updated = await db.transaction(async (tx) => {
      const [plan] = await tx
        .update(testPlans)
        .set({
          name: data.name,
          description: data.description || null,
          scopeNotes: data.scopeNotes || null,
          targetRelease: data.targetRelease || null,
          environment: data.environment || null,
          plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          ownerId: data.ownerId || null,
          status: data.status,
          updatedAt: new Date(),
        })
        .where(eq(testPlans.id, data.planId))
        .returning();

      return plan;
    });

    revalidatePath(`/workspaces`);
    return { success: true, plan: updated };
  } catch (error: any) {
    return { error: error.message || "Failed to update test plan" };
  }
}

export async function archiveTestPlanAction(
  workspaceId: string,
  projectId: string,
  planId: string
): Promise<TestPlanActionResult> {
  try {
    await requireProjectAccess(workspaceId, projectId, ["owner", "admin"]);

    await db
      .update(testPlans)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(testPlans.id, planId), eq(testPlans.projectId, projectId)));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to archive test plan" };
  }
}

export async function restoreTestPlanAction(
  workspaceId: string,
  projectId: string,
  planId: string
): Promise<TestPlanActionResult> {
  try {
    await requireProjectAccess(workspaceId, projectId, ["owner", "admin"]);

    await db
      .update(testPlans)
      .set({ status: "draft", updatedAt: new Date() })
      .where(and(eq(testPlans.id, planId), eq(testPlans.projectId, projectId)));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to restore test plan" };
  }
}

export async function syncPlanTestCasesAction(
  workspaceId: string,
  projectId: string,
  planId: string,
  testCaseIds: string[]
): Promise<TestPlanActionResult> {
  try {
    await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    const [plan] = await db
      .select()
      .from(testPlans)
      .where(and(eq(testPlans.id, planId), eq(testPlans.projectId, projectId)))
      .limit(1);

    if (!plan) return { error: "Test plan not found" };

    await db.transaction(async (tx) => {
      // Remove current associations
      await tx.delete(testPlanCases).where(eq(testPlanCases.testPlanId, planId));

      if (testCaseIds.length > 0) {
        // Validate cases belong to project
        const validCases = await tx
          .select({ id: testCases.id })
          .from(testCases)
          .where(and(eq(testCases.projectId, projectId), inArray(testCases.id, testCaseIds)));

        if (validCases.length > 0) {
          await tx.insert(testPlanCases).values(
            validCases.map((c) => ({
              id: crypto.randomUUID(),
              testPlanId: planId,
              testCaseId: c.id,
            }))
          );
        }
      }
    });

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update test plan scope" };
  }
}

export interface GetTestPlansOptions {
  search?: string;
  status?: TestPlanStatus;
  page?: number;
  pageSize?: number;
}

export async function getProjectTestPlans(projectId: string, options: GetTestPlansOptions = {}) {
  const { search, status, page = 1, pageSize = 20 } = options;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(testPlans.projectId, projectId)];

  if (status) {
    conditions.push(eq(testPlans.status, status));
  }
  if (search) {
    conditions.push(
      sql`(${testPlans.name} ILIKE ${`%${search}%`} OR ${testPlans.targetRelease} ILIKE ${`%${search}%`})`
    );
  }

  const whereClause = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(testPlans)
    .where(whereClause);

  const total = Number(countResult?.count || 0);

  const items = await db
    .select({
      plan: testPlans,
      ownerName: users.name,
      casesCount: sql<number>`(SELECT count(*) FROM ${testPlanCases} WHERE ${testPlanCases.testPlanId} = ${testPlans.id})`,
      runsCount: sql<number>`(SELECT count(*) FROM ${testRuns} WHERE ${testRuns.testPlanId} = ${testPlans.id})`,
    })
    .from(testPlans)
    .leftJoin(users, eq(testPlans.ownerId, users.id))
    .where(whereClause)
    .orderBy(desc(testPlans.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: items.map((i) => ({
      ...i.plan,
      ownerName: i.ownerName,
      casesCount: Number(i.casesCount || 0),
      runsCount: Number(i.runsCount || 0),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getTestPlanWithDetails(planId: string) {
  const [plan] = await db
    .select({
      plan: testPlans,
      owner: { id: users.id, name: users.name, email: users.email },
    })
    .from(testPlans)
    .leftJoin(users, eq(testPlans.ownerId, users.id))
    .where(eq(testPlans.id, planId))
    .limit(1);

  if (!plan) return null;

  // Fetch linked test cases
  const planCases = await db
    .select({
      testPlanCase: testPlanCases,
      testCase: testCases,
      moduleName: modules.name,
    })
    .from(testPlanCases)
    .innerJoin(testCases, eq(testPlanCases.testCaseId, testCases.id))
    .leftJoin(modules, eq(testCases.moduleId, modules.id))
    .where(eq(testPlanCases.testPlanId, planId))
    .orderBy(asc(testCases.sequenceNumber));

  // Fetch associated test runs
  const runs = await db
    .select({
      run: testRuns,
      assigneeName: users.name,
    })
    .from(testRuns)
    .leftJoin(users, eq(testRuns.assignedTo, users.id))
    .where(eq(testRuns.testPlanId, planId))
    .orderBy(desc(testRuns.createdAt));

  return {
    ...plan.plan,
    owner: plan.owner,
    cases: planCases.map((pc) => ({
      ...pc.testCase,
      moduleName: pc.moduleName,
      addedAt: pc.testPlanCase.addedAt,
    })),
    runs: runs.map((r) => ({
      ...r.run,
      assigneeName: r.assigneeName,
    })),
  };
}
