"use server";

import { z } from "zod";
import { db } from "@/db";
import {
  testCases,
  testCaseSteps,
  testCaseRevisions,
  projects,
  modules,
  users,
  type TestCase,
  type TestCaseStep,
  type TestCaseRevision,
  type StepSnapshot,
} from "@/db/schema";
import { eq, and, desc, asc, ilike, inArray, sql } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import { PRIORITIES, LIFECYCLES, type Priority, type Lifecycle } from "./taxonomy";

export interface StepInput {
  stepNumber: number;
  instruction: string;
  expectedResult?: string;
}

const CreateTestCaseSchema = z.object({
  workspaceId: z.string().min(1, "Workspace is required"),
  projectId: z.string().min(1, "Project is required"),
  moduleId: z.string().optional().or(z.literal("")),
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  description: z.string().trim().optional(),
  preconditions: z.string().trim().optional(),
  expectedResult: z.string().trim().optional(),
  priority: z.enum(PRIORITIES).default("medium"),
  lifecycle: z.enum(LIFECYCLES).default("draft"),
  testTypes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  ownerId: z.string().optional().or(z.literal("")),
  steps: z
    .array(
      z.object({
        stepNumber: z.number().int().positive(),
        instruction: z.string().trim().min(1, "Step instruction cannot be empty"),
        expectedResult: z.string().trim().optional(),
      })
    )
    .default([]),
});

export type TestCaseActionResult = {
  error?: string;
  success?: boolean;
  testCase?: TestCase;
};

export async function createTestCaseAction(
  prevState: TestCaseActionResult | null,
  payload: z.infer<typeof CreateTestCaseSchema>
): Promise<TestCaseActionResult> {
  const parsed = CreateTestCaseSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid test case input" };
  }

  const data = parsed.data;

  // Validation: If Ready, must have expected result and at least 1 step
  if (data.lifecycle === "ready") {
    if (!data.expectedResult) {
      return { error: "A Ready test case must define an Expected Result." };
    }
    if (data.steps.length === 0) {
      return { error: "A Ready test case must define at least one test step." };
    }
  }

  try {
    const { user, project } = await requireProjectAccess(data.workspaceId, data.projectId, [
      "owner",
      "admin",
      "member",
    ]);

    if (project.status === "archived") {
      return { error: "Cannot create test cases in an archived project. Restore the project first." };
    }

    const testCaseId = crypto.randomUUID();

    // Atomic transaction for sequence generation, test case, steps, and initial revision
    const createdTestCase = await db.transaction(async (tx) => {
      // Calculate next sequence number for this project
      const [seqResult] = await tx
        .select({
          maxSeq: sql<number>`COALESCE(MAX(${testCases.sequenceNumber}), 0)`,
        })
        .from(testCases)
        .where(eq(testCases.projectId, data.projectId));

      const nextSeq = Number(seqResult?.maxSeq || 0) + 1;
      const stableId = `${project.key}-${String(nextSeq).padStart(3, "0")}`;

      const [newCase] = await tx
        .insert(testCases)
        .values({
          id: testCaseId,
          projectId: data.projectId,
          moduleId: data.moduleId || null,
          stableId,
          sequenceNumber: nextSeq,
          title: data.title,
          description: data.description || null,
          preconditions: data.preconditions || null,
          expectedResult: data.expectedResult || null,
          priority: data.priority,
          lifecycle: data.lifecycle,
          testTypes: data.testTypes,
          tags: data.tags,
          ownerId: data.ownerId || null,
          revision: 1,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();

      // Insert ordered steps
      if (data.steps.length > 0) {
        await tx.insert(testCaseSteps).values(
          data.steps.map((s, idx) => ({
            id: crypto.randomUUID(),
            testCaseId,
            stepNumber: idx + 1,
            instruction: s.instruction,
            expectedResult: s.expectedResult || null,
          }))
        );
      }

      // Snapshot initial revision (Revision 1)
      const stepsSnapshot: StepSnapshot[] = data.steps.map((s, idx) => ({
        stepNumber: idx + 1,
        instruction: s.instruction,
        expectedResult: s.expectedResult || null,
      }));

      await tx.insert(testCaseRevisions).values({
        id: crypto.randomUUID(),
        testCaseId,
        revisionNumber: 1,
        title: data.title,
        description: data.description || null,
        preconditions: data.preconditions || null,
        expectedResult: data.expectedResult || null,
        stepsSnapshot,
        changeSummary: "Initial version created",
        changedBy: user.id,
      });

      return newCase;
    });

    revalidatePath(`/workspaces`);
    return { success: true, testCase: createdTestCase };
  } catch (error: any) {
    console.error("Create test case failure:", error);
    return { error: error.message || "Failed to create test case" };
  }
}

export async function updateTestCaseAction(
  prevState: TestCaseActionResult | null,
  payload: z.infer<typeof CreateTestCaseSchema> & { testCaseId: string; changeSummary?: string }
): Promise<TestCaseActionResult> {
  const { testCaseId, changeSummary, ...rest } = payload;
  const parsed = CreateTestCaseSchema.safeParse(rest);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const data = parsed.data;

  if (data.lifecycle === "ready") {
    if (!data.expectedResult) {
      return { error: "A Ready test case must define an Expected Result." };
    }
    if (data.steps.length === 0) {
      return { error: "A Ready test case must define at least one test step." };
    }
  }

  try {
    const { user, project } = await requireProjectAccess(data.workspaceId, data.projectId, [
      "owner",
      "admin",
      "member",
    ]);

    if (project.status === "archived") {
      return { error: "Cannot edit test cases in an archived project." };
    }

    const [existing] = await db
      .select()
      .from(testCases)
      .where(and(eq(testCases.id, testCaseId), eq(testCases.projectId, data.projectId)))
      .limit(1);

    if (!existing) {
      return { error: "Test case not found" };
    }

    const existingSteps = await db
      .select()
      .from(testCaseSteps)
      .where(eq(testCaseSteps.testCaseId, testCaseId))
      .orderBy(asc(testCaseSteps.stepNumber));

    // Check substantive vs metadata change
    const isSubstantive =
      existing.title !== data.title ||
      (existing.description || "") !== (data.description || "") ||
      (existing.preconditions || "") !== (data.preconditions || "") ||
      (existing.expectedResult || "") !== (data.expectedResult || "") ||
      existingSteps.length !== data.steps.length ||
      existingSteps.some(
        (es, idx) =>
          es.instruction !== data.steps[idx]?.instruction ||
          (es.expectedResult || "") !== (data.steps[idx]?.expectedResult || "")
      );

    const updatedTestCase = await db.transaction(async (tx) => {
      const newRevision = isSubstantive ? existing.revision + 1 : existing.revision;

      const [updated] = await tx
        .update(testCases)
        .set({
          moduleId: data.moduleId || null,
          title: data.title,
          description: data.description || null,
          preconditions: data.preconditions || null,
          expectedResult: data.expectedResult || null,
          priority: data.priority,
          lifecycle: data.lifecycle,
          testTypes: data.testTypes,
          tags: data.tags,
          ownerId: data.ownerId || null,
          revision: newRevision,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(testCases.id, testCaseId))
        .returning();

      if (isSubstantive) {
        // Replace current steps
        await tx.delete(testCaseSteps).where(eq(testCaseSteps.testCaseId, testCaseId));

        if (data.steps.length > 0) {
          await tx.insert(testCaseSteps).values(
            data.steps.map((s, idx) => ({
              id: crypto.randomUUID(),
              testCaseId,
              stepNumber: idx + 1,
              instruction: s.instruction,
              expectedResult: s.expectedResult || null,
            }))
          );
        }

        // Snapshot new immutable revision
        const stepsSnapshot: StepSnapshot[] = data.steps.map((s, idx) => ({
          stepNumber: idx + 1,
          instruction: s.instruction,
          expectedResult: s.expectedResult || null,
        }));

        await tx.insert(testCaseRevisions).values({
          id: crypto.randomUUID(),
          testCaseId,
          revisionNumber: newRevision,
          title: data.title,
          description: data.description || null,
          preconditions: data.preconditions || null,
          expectedResult: data.expectedResult || null,
          stepsSnapshot,
          changeSummary: changeSummary || `Updated to revision ${newRevision}`,
          changedBy: user.id,
        });
      }

      return updated;
    });

    revalidatePath(`/workspaces`);
    return { success: true, testCase: updatedTestCase };
  } catch (error: any) {
    return { error: error.message || "Failed to update test case" };
  }
}

export async function duplicateTestCaseAction(workspaceId: string, projectId: string, testCaseId: string) {
  try {
    const { user, project } = await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    if (project.status === "archived") {
      return { error: "Cannot duplicate test cases in an archived project." };
    }

    const [source] = await db
      .select()
      .from(testCases)
      .where(and(eq(testCases.id, testCaseId), eq(testCases.projectId, projectId)))
      .limit(1);

    if (!source) {
      return { error: "Test case not found" };
    }

    const sourceSteps = await db
      .select()
      .from(testCaseSteps)
      .where(eq(testCaseSteps.testCaseId, testCaseId))
      .orderBy(asc(testCaseSteps.stepNumber));

    const newId = crypto.randomUUID();

    const cloned = await db.transaction(async (tx) => {
      const [seqResult] = await tx
        .select({
          maxSeq: sql<number>`COALESCE(MAX(${testCases.sequenceNumber}), 0)`,
        })
        .from(testCases)
        .where(eq(testCases.projectId, projectId));

      const nextSeq = Number(seqResult?.maxSeq || 0) + 1;
      const stableId = `${project.key}-${String(nextSeq).padStart(3, "0")}`;

      const [newCase] = await tx
        .insert(testCases)
        .values({
          id: newId,
          projectId,
          moduleId: source.moduleId,
          stableId,
          sequenceNumber: nextSeq,
          title: `Copy of ${source.title}`,
          description: source.description,
          preconditions: source.preconditions,
          expectedResult: source.expectedResult,
          priority: source.priority,
          lifecycle: "draft", // Clones reset to draft
          testTypes: source.testTypes,
          tags: source.tags,
          ownerId: user.id,
          revision: 1,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();

      if (sourceSteps.length > 0) {
        await tx.insert(testCaseSteps).values(
          sourceSteps.map((s) => ({
            id: crypto.randomUUID(),
            testCaseId: newId,
            stepNumber: s.stepNumber,
            instruction: s.instruction,
            expectedResult: s.expectedResult,
          }))
        );
      }

      const stepsSnapshot: StepSnapshot[] = sourceSteps.map((s) => ({
        stepNumber: s.stepNumber,
        instruction: s.instruction,
        expectedResult: s.expectedResult,
      }));

      await tx.insert(testCaseRevisions).values({
        id: crypto.randomUUID(),
        testCaseId: newId,
        revisionNumber: 1,
        title: `Copy of ${source.title}`,
        description: source.description,
        preconditions: source.preconditions,
        expectedResult: source.expectedResult,
        stepsSnapshot,
        changeSummary: `Cloned from ${source.stableId}`,
        changedBy: user.id,
      });

      return newCase;
    });

    revalidatePath(`/workspaces`);
    return { success: true, testCase: cloned };
  } catch (error: any) {
    return { error: error.message || "Failed to duplicate test case" };
  }
}

export async function deprecateTestCaseAction(workspaceId: string, projectId: string, testCaseId: string) {
  try {
    const { user, project } = await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    if (project.status === "archived") {
      return { error: "Cannot deprecate test case in an archived project." };
    }

    await db
      .update(testCases)
      .set({
        lifecycle: "deprecated",
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(and(eq(testCases.id, testCaseId), eq(testCases.projectId, projectId)));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to deprecate test case" };
  }
}

export async function bulkUpdateLifecycleAction(
  workspaceId: string,
  projectId: string,
  testCaseIds: string[],
  newLifecycle: Lifecycle
) {
  if (!testCaseIds.length) return { success: true };

  try {
    const { user, project } = await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    if (project.status === "archived") {
      return { error: "Cannot update test cases in an archived project." };
    }

    await db
      .update(testCases)
      .set({
        lifecycle: newLifecycle,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(and(eq(testCases.projectId, projectId), inArray(testCases.id, testCaseIds)));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to bulk update test cases" };
  }
}

export interface GetTestCasesOptions {
  search?: string;
  moduleId?: string;
  lifecycle?: Lifecycle;
  priority?: Priority;
  testType?: string;
  page?: number;
  pageSize?: number;
}

export async function getProjectTestCases(projectId: string, options: GetTestCasesOptions = {}) {
  const { search, moduleId, lifecycle, priority, testType, page = 1, pageSize = 50 } = options;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(testCases.projectId, projectId)];

  if (moduleId) {
    conditions.push(eq(testCases.moduleId, moduleId));
  }
  if (lifecycle) {
    conditions.push(eq(testCases.lifecycle, lifecycle));
  }
  if (priority) {
    conditions.push(eq(testCases.priority, priority));
  }
  if (testType) {
    conditions.push(sql`${testType} = ANY(${testCases.testTypes})`);
  }
  if (search) {
    conditions.push(
      sql`(${testCases.stableId} ILIKE ${`%${search}%`} OR ${testCases.title} ILIKE ${`%${search}%`} OR ${testCases.description} ILIKE ${`%${search}%`})`
    );
  }

  const whereClause = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(testCases)
    .where(whereClause);

  const total = Number(countResult?.count || 0);

  const items = await db
    .select({
      testCase: testCases,
      moduleName: modules.name,
      creatorName: users.name,
    })
    .from(testCases)
    .leftJoin(modules, eq(testCases.moduleId, modules.id))
    .leftJoin(users, eq(testCases.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(testCases.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getTestCaseWithHistory(testCaseId: string) {
  const [testCase] = await db
    .select({
      testCase: testCases,
      module: modules,
      creator: { id: users.id, name: users.name, email: users.email },
    })
    .from(testCases)
    .leftJoin(modules, eq(testCases.moduleId, modules.id))
    .leftJoin(users, eq(testCases.createdBy, users.id))
    .where(eq(testCases.id, testCaseId))
    .limit(1);

  if (!testCase) return null;

  const steps = await db
    .select()
    .from(testCaseSteps)
    .where(eq(testCaseSteps.testCaseId, testCaseId))
    .orderBy(asc(testCaseSteps.stepNumber));

  const revisions = await db
    .select({
      revision: testCaseRevisions,
      changerName: users.name,
    })
    .from(testCaseRevisions)
    .leftJoin(users, eq(testCaseRevisions.changedBy, users.id))
    .where(eq(testCaseRevisions.testCaseId, testCaseId))
    .orderBy(desc(testCaseRevisions.revisionNumber));

  return {
    ...testCase.testCase,
    module: testCase.module,
    creator: testCase.creator,
    steps,
    revisions,
  };
}
