"use server";

import { db } from "@/db";
import {
  testRuns,
  testRunCases,
  testExecutionAttempts,
  testPlans,
  testPlanCases,
  testCases,
  testCaseSteps,
  modules,
  users,
  type TestRun,
  type StepSnapshot,
} from "@/db/schema";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CreateTestRunSchema,
  RecordExecutionSchema,
  type TestRunStatus,
  type ExecutionStatus,
  type TestRunActionResult,
} from "./types";

export async function createTestRunAction(
  prevState: TestRunActionResult | null,
  payload: z.infer<typeof CreateTestRunSchema>
): Promise<TestRunActionResult> {
  const parsed = CreateTestRunSchema.safeParse(payload);
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
      return { error: "Cannot create test runs in an archived project." };
    }

    let targetCaseIds = data.testCaseIds;

    // If a plan is selected and no explicit case list passed, pull from plan
    if (data.testPlanId && targetCaseIds.length === 0) {
      const planCases = await db
        .select({ testCaseId: testPlanCases.testCaseId })
        .from(testPlanCases)
        .where(eq(testPlanCases.testPlanId, data.testPlanId));

      targetCaseIds = planCases.map((pc) => pc.testCaseId);
    }

    if (targetCaseIds.length === 0) {
      return { error: "A test run must include at least one test case." };
    }

    // Fetch repository test cases and their steps to construct snapshots
    const casesToSnapshot = await db
      .select({
        tc: testCases,
        moduleName: modules.name,
      })
      .from(testCases)
      .leftJoin(modules, eq(testCases.moduleId, modules.id))
      .where(and(eq(testCases.projectId, data.projectId), inArray(testCases.id, targetCaseIds)));

    if (casesToSnapshot.length === 0) {
      return { error: "None of the specified test cases were found in this project." };
    }

    const steps = await db
      .select()
      .from(testCaseSteps)
      .where(inArray(testCaseSteps.testCaseId, targetCaseIds))
      .orderBy(asc(testCaseSteps.stepNumber));

    const stepsByCaseId = new Map<string, typeof steps>();
    for (const s of steps) {
      if (!stepsByCaseId.has(s.testCaseId)) {
        stepsByCaseId.set(s.testCaseId, []);
      }
      stepsByCaseId.get(s.testCaseId)!.push(s);
    }

    const runId = crypto.randomUUID();

    const createdRun = await db.transaction(async (tx) => {
      const [run] = await tx
        .insert(testRuns)
        .values({
          id: runId,
          projectId: data.projectId,
          testPlanId: data.testPlanId || null,
          name: data.name,
          environment: data.environment,
          buildVersion: data.buildVersion || null,
          assignedTo: data.assignedTo || null,
          status: "not_started",
          notes: data.notes || null,
          createdBy: user.id,
        })
        .returning();

      // Snapshot all cases with immutable data
      for (const { tc, moduleName } of casesToSnapshot) {
        const caseSteps = stepsByCaseId.get(tc.id) || [];
        const snapshotSteps: StepSnapshot[] = caseSteps.map((cs) => ({
          stepNumber: cs.stepNumber,
          instruction: cs.instruction,
          expectedResult: cs.expectedResult || null,
        }));

        await tx.insert(testRunCases).values({
          id: crypto.randomUUID(),
          testRunId: runId,
          testCaseId: tc.id,
          revisionNumber: tc.revision,
          snapshotTitle: tc.title,
          snapshotDescription: tc.description || null,
          snapshotPreconditions: tc.preconditions || null,
          snapshotSteps,
          snapshotExpectedResult: tc.expectedResult || null,
          snapshotPriority: tc.priority,
          snapshotModuleName: moduleName || null,
          currentStatus: "not_run",
        });
      }

      return run;
    });

    revalidatePath(`/workspaces`);
    return { success: true, run: createdRun };
  } catch (error: any) {
    return { error: error.message || "Failed to create test run" };
  }
}

export async function recordExecutionAttemptAction(
  prevState: TestRunActionResult | null,
  payload: z.infer<typeof RecordExecutionSchema>
): Promise<TestRunActionResult> {
  const parsed = RecordExecutionSchema.safeParse(payload);
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
      return { error: "Cannot execute tests in an archived project." };
    }

    const [run] = await db
      .select()
      .from(testRuns)
      .where(and(eq(testRuns.id, data.testRunId), eq(testRuns.projectId, data.projectId)))
      .limit(1);

    if (!run) {
      return { error: "Test run not found" };
    }

    if (run.status === "completed" || run.status === "aborted") {
      return { error: `Cannot log results on a ${run.status} test run.` };
    }

    const [runCase] = await db
      .select()
      .from(testRunCases)
      .where(
        and(
          eq(testRunCases.id, data.testRunCaseId),
          eq(testRunCases.testRunId, data.testRunId)
        )
      )
      .limit(1);

    if (!runCase) {
      return { error: "Test case is not part of this run" };
    }

    await db.transaction(async (tx) => {
      // Calculate next attempt number for this test_run_case
      const [attemptCount] = await tx
        .select({ maxAttempt: sql<number>`COALESCE(MAX(${testExecutionAttempts.attemptNumber}), 0)` })
        .from(testExecutionAttempts)
        .where(eq(testExecutionAttempts.testRunCaseId, data.testRunCaseId));

      const nextAttemptNumber = Number(attemptCount?.maxAttempt || 0) + 1;

      // Insert new append-only execution attempt record
      await tx.insert(testExecutionAttempts).values({
        id: crypto.randomUUID(),
        testRunCaseId: data.testRunCaseId,
        attemptNumber: nextAttemptNumber,
        status: data.status,
        actualResult: data.actualResult || null,
        durationSeconds: data.durationSeconds || null,
        executedBy: user.id,
      });

      // Update current status on the run case snapshot
      await tx
        .update(testRunCases)
        .set({
          currentStatus: data.status,
          lastExecutedAt: new Date(),
          lastExecutedBy: user.id,
        })
        .where(eq(testRunCases.id, data.testRunCaseId));

      // Transition run status to in_progress if currently not_started
      if (run.status === "not_started") {
        await tx
          .update(testRuns)
          .set({
            status: "in_progress",
            startedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(testRuns.id, run.id));
      }
    });

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to record execution attempt" };
  }
}

export async function updateTestRunStatusAction(
  workspaceId: string,
  projectId: string,
  testRunId: string,
  status: TestRunStatus,
  notes?: string
): Promise<TestRunActionResult> {
  try {
    await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    const [run] = await db
      .select()
      .from(testRuns)
      .where(and(eq(testRuns.id, testRunId), eq(testRuns.projectId, projectId)))
      .limit(1);

    if (!run) return { error: "Test run not found" };

    const updateData: Partial<typeof testRuns.$inferInsert> = {
      status,
      updatedAt: new Date(),
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (status === "in_progress" && !run.startedAt) {
      updateData.startedAt = new Date();
    } else if ((status === "completed" || status === "aborted") && !run.completedAt) {
      updateData.completedAt = new Date();
    }

    await db.update(testRuns).set(updateData).where(eq(testRuns.id, testRunId));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update test run status" };
  }
}

export interface GetTestRunsOptions {
  status?: TestRunStatus;
  environment?: string;
  testPlanId?: string;
  page?: number;
  pageSize?: number;
}

export async function getProjectTestRuns(projectId: string, options: GetTestRunsOptions = {}) {
  const { status, environment, testPlanId, page = 1, pageSize = 20 } = options;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(testRuns.projectId, projectId)];

  if (status) {
    conditions.push(eq(testRuns.status, status));
  }
  if (environment) {
    conditions.push(eq(testRuns.environment, environment));
  }
  if (testPlanId) {
    conditions.push(eq(testRuns.testPlanId, testPlanId));
  }

  const whereClause = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(testRuns)
    .where(whereClause);

  const total = Number(countResult?.count || 0);

  const runs = await db
    .select({
      run: testRuns,
      planName: testPlans.name,
      assigneeName: users.name,
      totalCases: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id})`,
      passedCount: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'passed')`,
      failedCount: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'failed')`,
      blockedCount: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'blocked')`,
      skippedCount: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'skipped')`,
      notRunCount: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'not_run')`,
    })
    .from(testRuns)
    .leftJoin(testPlans, eq(testRuns.testPlanId, testPlans.id))
    .leftJoin(users, eq(testRuns.assignedTo, users.id))
    .where(whereClause)
    .orderBy(desc(testRuns.createdAt))
    .limit(pageSize)
    .offset(offset);

  const items = runs.map((r) => {
    const totalCases = Number(r.totalCases || 0);
    const passed = Number(r.passedCount || 0);
    const failed = Number(r.failedCount || 0);
    const blocked = Number(r.blockedCount || 0);
    const skipped = Number(r.skippedCount || 0);
    const notRun = Number(r.notRunCount || 0);

    const evaluated = passed + failed + blocked + skipped;
    const progressPercent = totalCases > 0 ? Math.round((evaluated / totalCases) * 100) : 0;
    const passRate = evaluated > 0 ? Math.round((passed / evaluated) * 100) : 0;

    return {
      ...r.run,
      planName: r.planName,
      assigneeName: r.assigneeName,
      stats: {
        totalCases,
        passed,
        failed,
        blocked,
        skipped,
        notRun,
        evaluated,
        progressPercent,
        passRate,
      },
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getTestRunWithExecutionDetails(runId: string) {
  const [run] = await db
    .select({
      run: testRuns,
      plan: testPlans,
      assignee: { id: users.id, name: users.name, email: users.email },
    })
    .from(testRuns)
    .leftJoin(testPlans, eq(testRuns.testPlanId, testPlans.id))
    .leftJoin(users, eq(testRuns.assignedTo, users.id))
    .where(eq(testRuns.id, runId))
    .limit(1);

  if (!run) return null;

  // Fetch all run cases
  const runCases = await db
    .select({
      runCase: testRunCases,
      stableId: testCases.stableId,
      originalLifecycle: testCases.lifecycle,
      lastExecutorName: users.name,
    })
    .from(testRunCases)
    .innerJoin(testCases, eq(testRunCases.testCaseId, testCases.id))
    .leftJoin(users, eq(testRunCases.lastExecutedBy, users.id))
    .where(eq(testRunCases.testRunId, runId))
    .orderBy(asc(testCases.sequenceNumber));

  // Fetch all execution attempts for these cases
  const runCaseIds = runCases.map((rc) => rc.runCase.id);
  const attempts = runCaseIds.length > 0
    ? await db
        .select({
          attempt: testExecutionAttempts,
          executorName: users.name,
        })
        .from(testExecutionAttempts)
        .leftJoin(users, eq(testExecutionAttempts.executedBy, users.id))
        .where(inArray(testExecutionAttempts.testRunCaseId, runCaseIds))
        .orderBy(asc(testExecutionAttempts.attemptNumber))
    : [];

  const attemptsByRunCaseId = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const rcId = a.attempt.testRunCaseId;
    if (!attemptsByRunCaseId.has(rcId)) {
      attemptsByRunCaseId.set(rcId, []);
    }
    attemptsByRunCaseId.get(rcId)!.push(a);
  }

  let passed = 0;
  let failed = 0;
  let blocked = 0;
  let skipped = 0;
  let notRun = 0;

  const casesWithAttempts = runCases.map(({ runCase, stableId, originalLifecycle, lastExecutorName }) => {
    const status = runCase.currentStatus as ExecutionStatus;
    if (status === "passed") passed++;
    else if (status === "failed") failed++;
    else if (status === "blocked") blocked++;
    else if (status === "skipped") skipped++;
    else notRun++;

    return {
      ...runCase,
      stableId,
      originalLifecycle,
      lastExecutorName,
      attempts: attemptsByRunCaseId.get(runCase.id) || [],
    };
  });

  const totalCases = runCases.length;
  const evaluated = passed + failed + blocked + skipped;
  const progressPercent = totalCases > 0 ? Math.round((evaluated / totalCases) * 100) : 0;
  const passRate = evaluated > 0 ? Math.round((passed / evaluated) * 100) : 0;

  return {
    ...run.run,
    plan: run.plan,
    assignee: run.assignee,
    cases: casesWithAttempts,
    stats: {
      totalCases,
      passed,
      failed,
      blocked,
      skipped,
      notRun,
      evaluated,
      progressPercent,
      passRate,
    },
  };
}
