import { db } from "@/db";
import {
  projects,
  modules,
  testCases,
  testPlans,
  testPlanCases,
  testRuns,
  testRunCases,
  testExecutionAttempts,
  users,
} from "@/db/schema";
import { eq, and, sql, desc, asc, inArray, gte, isNull } from "drizzle-orm";
import type { WorkspaceDashboardMetrics, ProjectDashboardMetrics } from "./types";
import type { Priority, Lifecycle } from "@/lib/test-cases/taxonomy";

export async function getWorkspaceDashboardMetrics(
  workspaceId: string
): Promise<WorkspaceDashboardMetrics> {
  const wsProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      key: projects.key,
      status: projects.status,
    })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  const totalProjects = wsProjects.length;
  const activeProjects = wsProjects.filter((p) => p.status === "active").length;
  const projectIds = wsProjects.map((p) => p.id);

  if (projectIds.length === 0) {
    return {
      totalProjects: 0,
      activeProjects: 0,
      totalTestCases: 0,
      totalTestRuns: 0,
      recentRuns: [],
    };
  }

  // Count total cases in workspace
  const [caseCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(testCases)
    .where(inArray(testCases.projectId, projectIds));

  const totalTestCases = Number(caseCountResult?.count || 0);

  // Fetch recent runs across all workspace projects
  const runs = await db
    .select({
      run: testRuns,
      projectName: projects.name,
      projectKey: projects.key,
      totalCases: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id})`,
      passedCases: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'passed')`,
      failedCases: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'failed')`,
    })
    .from(testRuns)
    .innerJoin(projects, eq(testRuns.projectId, projects.id))
    .where(inArray(testRuns.projectId, projectIds))
    .orderBy(desc(testRuns.createdAt))
    .limit(6);

  const totalTestRuns = runs.length;

  const recentRuns = runs.map((r) => {
    const total = Number(r.totalCases || 0);
    const passed = Number(r.passedCases || 0);
    const failed = Number(r.failedCases || 0);
    const evaluated = passed + failed;
    const progressPercent = total > 0 ? Math.round((evaluated / total) * 100) : 0;

    return {
      id: r.run.id,
      name: r.run.name,
      projectKey: r.projectKey,
      projectName: r.projectName,
      environment: r.run.environment,
      status: r.run.status as any,
      totalCases: total,
      passedCases: passed,
      failedCases: failed,
      progressPercent,
      createdAt: r.run.createdAt,
    };
  });

  return {
    totalProjects,
    activeProjects,
    totalTestCases,
    totalTestRuns,
    recentRuns,
  };
}

export async function getProjectDashboardMetrics(
  projectId: string
): Promise<ProjectDashboardMetrics> {
  // 1. Overall counts
  const [tcCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(testCases)
    .where(eq(testCases.projectId, projectId));
  const totalTestCases = Number(tcCountResult?.count || 0);

  const [planCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(testPlans)
    .where(eq(testPlans.projectId, projectId));
  const totalPlans = Number(planCountResult?.count || 0);

  const [runCountResult] = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) FILTER (WHERE ${testRuns.status} = 'in_progress')`,
    })
    .from(testRuns)
    .where(eq(testRuns.projectId, projectId));
  const totalRuns = Number(runCountResult?.total || 0);
  const activeRuns = Number(runCountResult?.active || 0);

  // 2. Lifecycle breakdown
  const lifecycleRows = await db
    .select({
      lifecycle: testCases.lifecycle,
      count: sql<number>`count(*)`,
    })
    .from(testCases)
    .where(eq(testCases.projectId, projectId))
    .groupBy(testCases.lifecycle);

  const lifecycleCounts: Record<Lifecycle, number> = {
    draft: 0,
    ready: 0,
    deprecated: 0,
  };
  for (const row of lifecycleRows) {
    if (row.lifecycle in lifecycleCounts) {
      lifecycleCounts[row.lifecycle as Lifecycle] = Number(row.count);
    }
  }

  // 3. Priority breakdown
  const priorityRows = await db
    .select({
      priority: testCases.priority,
      count: sql<number>`count(*)`,
    })
    .from(testCases)
    .where(eq(testCases.projectId, projectId))
    .groupBy(testCases.priority);

  const priorityCounts: Record<Priority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const row of priorityRows) {
    if (row.priority in priorityCounts) {
      priorityCounts[row.priority as Priority] = Number(row.count);
    }
  }

  // 4. Aggregated outcomes across test_run_cases in this project
  const [outcomeResult] = await db
    .select({
      passed: sql<number>`count(*) FILTER (WHERE ${testRunCases.currentStatus} = 'passed')`,
      failed: sql<number>`count(*) FILTER (WHERE ${testRunCases.currentStatus} = 'failed')`,
      blocked: sql<number>`count(*) FILTER (WHERE ${testRunCases.currentStatus} = 'blocked')`,
      skipped: sql<number>`count(*) FILTER (WHERE ${testRunCases.currentStatus} = 'skipped')`,
      notRun: sql<number>`count(*) FILTER (WHERE ${testRunCases.currentStatus} = 'not_run')`,
    })
    .from(testRunCases)
    .innerJoin(testRuns, eq(testRunCases.testRunId, testRuns.id))
    .where(eq(testRuns.projectId, projectId));

  const passed = Number(outcomeResult?.passed || 0);
  const failed = Number(outcomeResult?.failed || 0);
  const blocked = Number(outcomeResult?.blocked || 0);
  const skipped = Number(outcomeResult?.skipped || 0);
  const notRun = Number(outcomeResult?.notRun || 0);
  const totalEvaluated = passed + failed + blocked + skipped;
  const overallPassRate = totalEvaluated > 0 ? Math.round((passed / totalEvaluated) * 100) : 0;

  // 5. QA Perspective: In-Progress Runs
  const activeRunsData = await db
    .select({
      run: testRuns,
      assigneeName: users.name,
      totalCases: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id})`,
      passed: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'passed')`,
      failed: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'failed')`,
      blocked: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'blocked')`,
      notRun: sql<number>`(SELECT count(*) FROM ${testRunCases} WHERE ${testRunCases.testRunId} = ${testRuns.id} AND ${testRunCases.currentStatus} = 'not_run')`,
    })
    .from(testRuns)
    .leftJoin(users, eq(testRuns.assignedTo, users.id))
    .where(and(eq(testRuns.projectId, projectId), eq(testRuns.status, "in_progress")))
    .orderBy(desc(testRuns.updatedAt))
    .limit(5);

  const inProgressRuns = activeRunsData.map((r) => {
    const total = Number(r.totalCases || 0);
    const p = Number(r.passed || 0);
    const f = Number(r.failed || 0);
    const b = Number(r.blocked || 0);
    const nr = Number(r.notRun || 0);
    const evaluated = p + f + b;
    const progressPercent = total > 0 ? Math.round((evaluated / total) * 100) : 0;

    return {
      id: r.run.id,
      name: r.run.name,
      environment: r.run.environment,
      buildVersion: r.run.buildVersion,
      assigneeName: r.assigneeName,
      totalCases: total,
      passed: p,
      failed: f,
      blocked: b,
      notRun: nr,
      progressPercent,
    };
  });

  // Total unexecuted cases across all active runs
  const totalUnexecutedCases = inProgressRuns.reduce((acc, r) => acc + r.notRun, 0);

  // Urgent failing cases (Critical or High priority currently failing in active/latest runs)
  const urgentFails = await db
    .select({
      id: testRunCases.id,
      stableId: testCases.stableId,
      title: testRunCases.snapshotTitle,
      priority: testRunCases.snapshotPriority,
      runName: testRuns.name,
      lastAttemptResult: sql<string | null>`(
        SELECT ${testExecutionAttempts.actualResult}
        FROM ${testExecutionAttempts}
        WHERE ${testExecutionAttempts.testRunCaseId} = ${testRunCases.id}
        ORDER BY ${testExecutionAttempts.attemptNumber} DESC
        LIMIT 1
      )`,
    })
    .from(testRunCases)
    .innerJoin(testRuns, eq(testRunCases.testRunId, testRuns.id))
    .innerJoin(testCases, eq(testRunCases.testCaseId, testCases.id))
    .where(
      and(
        eq(testRuns.projectId, projectId),
        eq(testRunCases.currentStatus, "failed"),
        inArray(testRunCases.snapshotPriority, ["critical", "high"])
      )
    )
    .orderBy(desc(testRunCases.lastExecutedAt))
    .limit(5);

  // Plans due soon (within next 14 days or overdue)
  const now = new Date();
  const plansDueSoonRows = await db
    .select({
      id: testPlans.id,
      name: testPlans.name,
      targetRelease: testPlans.targetRelease,
      dueDate: testPlans.dueDate,
      casesCount: sql<number>`(SELECT count(*) FROM ${testPlanCases} WHERE ${testPlanCases.testPlanId} = ${testPlans.id})`,
    })
    .from(testPlans)
    .where(
      and(
        eq(testPlans.projectId, projectId),
        eq(testPlans.status, "active"),
        sql`${testPlans.dueDate} IS NOT NULL`
      )
    )
    .orderBy(asc(testPlans.dueDate))
    .limit(4);

  const plansDueSoon = plansDueSoonRows
    .filter((p) => p.dueDate !== null)
    .map((p) => {
      const due = new Date(p.dueDate!);
      const diffTime = due.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: p.id,
        name: p.name,
        targetRelease: p.targetRelease,
        dueDate: due,
        casesCount: Number(p.casesCount || 0),
        daysRemaining,
      };
    });

  // 6. Developer Perspective: Recent Failures with Symptoms
  const recentFailures = await db
    .select({
      runCaseId: testRunCases.id,
      testCaseId: testRunCases.testCaseId,
      stableId: testCases.stableId,
      title: testRunCases.snapshotTitle,
      moduleName: testRunCases.snapshotModuleName,
      priority: testRunCases.snapshotPriority,
      runName: testRuns.name,
      failedAt: testRunCases.lastExecutedAt,
      actualResult: sql<string | null>`(
        SELECT ${testExecutionAttempts.actualResult}
        FROM ${testExecutionAttempts}
        WHERE ${testExecutionAttempts.testRunCaseId} = ${testRunCases.id}
        ORDER BY ${testExecutionAttempts.attemptNumber} DESC
        LIMIT 1
      )`,
    })
    .from(testRunCases)
    .innerJoin(testRuns, eq(testRunCases.testRunId, testRuns.id))
    .innerJoin(testCases, eq(testRunCases.testCaseId, testCases.id))
    .where(and(eq(testRuns.projectId, projectId), eq(testRunCases.currentStatus, "failed")))
    .orderBy(desc(testRunCases.lastExecutedAt))
    .limit(6);

  // Blocked cases with reasons
  const blockedCases = await db
    .select({
      runCaseId: testRunCases.id,
      stableId: testCases.stableId,
      title: testRunCases.snapshotTitle,
      moduleName: testRunCases.snapshotModuleName,
      runName: testRuns.name,
      actualResult: sql<string | null>`(
        SELECT ${testExecutionAttempts.actualResult}
        FROM ${testExecutionAttempts}
        WHERE ${testExecutionAttempts.testRunCaseId} = ${testRunCases.id}
        ORDER BY ${testExecutionAttempts.attemptNumber} DESC
        LIMIT 1
      )`,
    })
    .from(testRunCases)
    .innerJoin(testRuns, eq(testRunCases.testRunId, testRuns.id))
    .innerJoin(testCases, eq(testRunCases.testCaseId, testCases.id))
    .where(and(eq(testRuns.projectId, projectId), eq(testRunCases.currentStatus, "blocked")))
    .orderBy(desc(testRunCases.lastExecutedAt))
    .limit(5);

  // Modules with failure counts
  const failureConcentrationRows = await db
    .select({
      moduleName: sql<string>`COALESCE(${testRunCases.snapshotModuleName}, 'Unassigned')`,
      failureCount: sql<number>`count(*)`,
    })
    .from(testRunCases)
    .innerJoin(testRuns, eq(testRunCases.testRunId, testRuns.id))
    .where(and(eq(testRuns.projectId, projectId), eq(testRunCases.currentStatus, "failed")))
    .groupBy(sql`COALESCE(${testRunCases.snapshotModuleName}, 'Unassigned')`)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  const modulesWithFailureCounts = failureConcentrationRows.map((r) => ({
    moduleName: r.moduleName,
    failureCount: Number(r.failureCount || 0),
  }));

  // Modules without any test cases (untested feature modules)
  const untestedModulesRows = await db
    .select({
      id: modules.id,
      name: modules.name,
      description: modules.description,
      casesCount: sql<number>`count(${testCases.id})`,
    })
    .from(modules)
    .leftJoin(testCases, eq(modules.id, testCases.moduleId))
    .where(eq(modules.projectId, projectId))
    .groupBy(modules.id, modules.name, modules.description)
    .having(sql`count(${testCases.id}) = 0`);

  const untestedModules = untestedModulesRows.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
  }));

  return {
    summary: {
      totalTestCases,
      totalPlans,
      totalRuns,
      activeRuns,
    },
    lifecycleCounts,
    priorityCounts,
    runOutcomes: {
      passed,
      failed,
      blocked,
      skipped,
      notRun,
      totalEvaluated,
      overallPassRate,
    },
    qaPerspective: {
      inProgressRuns,
      totalUnexecutedCases,
      urgentFailingCases: urgentFails.map((u) => ({
        id: u.id,
        stableId: u.stableId,
        title: u.title,
        priority: u.priority,
        runName: u.runName,
        lastAttemptResult: u.lastAttemptResult,
      })),
      plansDueSoon,
    },
    devPerspective: {
      recentFailures: recentFailures.map((rf) => ({
        runCaseId: rf.runCaseId,
        testCaseId: rf.testCaseId,
        stableId: rf.stableId,
        title: rf.title,
        moduleName: rf.moduleName,
        priority: rf.priority,
        runName: rf.runName,
        actualResult: rf.actualResult,
        failedAt: rf.failedAt || new Date(),
      })),
      blockedCases: blockedCases.map((bc) => ({
        runCaseId: bc.runCaseId,
        stableId: bc.stableId,
        title: bc.title,
        moduleName: bc.moduleName,
        runName: bc.runName,
        actualResult: bc.actualResult,
      })),
      modulesWithFailureCounts,
      untestedModules,
    },
  };
}
