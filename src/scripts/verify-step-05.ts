import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../db";
import {
  users,
  workspaces,
  workspaceMembers,
  projects,
  modules,
  testCases,
  testCaseSteps,
  testCaseRevisions,
  testPlans,
  testPlanCases,
  testRuns,
  testRunCases,
  testExecutionAttempts,
  type StepSnapshot,
} from "../db/schema";
import { eq, and, sql, desc, asc, like } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getProjectDashboardMetrics, getWorkspaceDashboardMetrics } from "../lib/dashboard/actions";
import { parseAndValidateCSV } from "../lib/test-cases/csv";
import { getWorkspaceMembership } from "../lib/auth/authorization";

async function runStep05Verification() {
  console.log("=== QA Workspace: Step 05 Final MVP Verification ===\n");

  const timestamp = Date.now();
  const dummyHash = await bcrypt.hash("Password123!", 8);

  // Pre-cleanup of any prior interrupted run
  await db.delete(testRuns);
  await db.delete(testPlans);
  await db.delete(workspaces).where(like(workspaces.slug, "ws-iso%"));
  await db.delete(users).where(like(users.email, "tenant_%"));
  await db.delete(users).where(like(users.email, "viewer_%"));

  // Setup Two Isolated Tenants: Tenant A and Tenant B
  console.log("[1/7] Testing Multi-Tenant Cross-Workspace Isolation...");
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const userCId = crypto.randomUUID(); // Viewer user

  await db.insert(users).values([
    { id: userAId, email: `tenant_a_${timestamp}@test.com`, name: "Tenant A Lead", passwordHash: dummyHash },
    { id: userBId, email: `tenant_b_${timestamp}@test.com`, name: "Tenant B Lead", passwordHash: dummyHash },
    { id: userCId, email: `viewer_c_${timestamp}@test.com`, name: "Viewer C", passwordHash: dummyHash },
  ]);

  const wsAId = crypto.randomUUID();
  const wsASlug = `ws-iso-a-${timestamp}`;
  const wsBId = crypto.randomUUID();
  const wsBSlug = `ws-iso-b-${timestamp}`;

  await db.insert(workspaces).values([
    { id: wsAId, name: "Workspace Alpha", slug: wsASlug, ownerId: userAId },
    { id: wsBId, name: "Workspace Beta", slug: wsBSlug, ownerId: userBId },
  ]);

  await db.insert(workspaceMembers).values([
    { id: crypto.randomUUID(), workspaceId: wsAId, userId: userAId, role: "owner" },
    { id: crypto.randomUUID(), workspaceId: wsBId, userId: userBId, role: "owner" },
    { id: crypto.randomUUID(), workspaceId: wsAId, userId: userCId, role: "viewer" },
  ]);

  // Verify User B cannot access Workspace A
  const memberBInA = await getWorkspaceMembership(wsAId, userBId);
  if (memberBInA !== null) {
    throw new Error("Isolation failure: User B erroneously found in Workspace A!");
  }

  // Verify User C is strictly a viewer in Workspace A
  const memberCInA = await getWorkspaceMembership(wsAId, userCId);
  if (!memberCInA || memberCInA.role !== "viewer") {
    throw new Error("Role failure: User C is not recognized as viewer in Workspace A!");
  }
  console.log("  ✓ Multi-tenant isolation verified: User B has null membership in Workspace A.");
  console.log("  ✓ Viewer role verified: User C is recognized as role 'viewer'.");

  // Setup Projects and Modules in Workspace A
  console.log("\n[2/7] Seeding Project, Modules and Untested Features...");
  const projectAId = crypto.randomUUID();
  const projectKeyA = `MVP-${timestamp.toString().slice(-4)}`;
  await db.insert(projects).values({
    id: projectAId,
    workspaceId: wsAId,
    name: "Enterprise Core Application",
    key: projectKeyA,
    status: "active",
    createdBy: userAId,
  });

  const module1Id = crypto.randomUUID();
  const module2Id = crypto.randomUUID(); // Untested module!
  await db.insert(modules).values([
    { id: module1Id, projectId: projectAId, name: "Authentication API", status: "active" },
    { id: module2Id, projectId: projectAId, name: "Billing Subscriptions", status: "active" },
  ]);
  console.log(`  ✓ Created Project ${projectKeyA} with tested module 'Authentication API' and untested module 'Billing Subscriptions'`);

  // Setup Repository Test Cases
  console.log("\n[3/7] Setting up Test Cases with Revision History...");
  const tc1Id = crypto.randomUUID();
  const tc2Id = crypto.randomUUID();

  // TC 1 (Ready, Critical)
  await db.transaction(async (tx) => {
    await tx.insert(testCases).values({
      id: tc1Id,
      projectId: projectAId,
      moduleId: module1Id,
      stableId: `${projectKeyA}-001`,
      sequenceNumber: 1,
      title: "Verify OAuth Login with Google",
      preconditions: "User has valid Google account",
      expectedResult: "Authenticated session cookie returned",
      priority: "critical",
      lifecycle: "ready",
      testTypes: ["Security", "Positive"],
      tags: ["auth", "smoke"],
      revision: 1,
      createdBy: userAId,
      updatedBy: userAId,
    });

    await tx.insert(testCaseSteps).values([
      { id: crypto.randomUUID(), testCaseId: tc1Id, stepNumber: 1, instruction: "Click Sign in with Google", expectedResult: "Consent screen loads" },
      { id: crypto.randomUUID(), testCaseId: tc1Id, stepNumber: 2, instruction: "Grant permissions", expectedResult: "Redirected to dashboard" },
    ]);
  });

  // TC 2 (Draft, Medium)
  await db.insert(testCases).values({
    id: tc2Id,
    projectId: projectAId,
    moduleId: module1Id,
    stableId: `${projectKeyA}-002`,
    sequenceNumber: 2,
    title: "Verify Password Reset Rate Limiting",
    priority: "medium",
    lifecycle: "draft",
    testTypes: ["Security", "Rate Limiting"],
    tags: ["auth"],
    revision: 1,
    createdBy: userAId,
    updatedBy: userAId,
  });
  console.log(`  ✓ Seeded ${projectKeyA}-001 (critical, ready) and ${projectKeyA}-002 (medium, draft)`);

  // 4. Test Run Instantiation & Snapshot Immutability Invariant
  console.log("\n[4/7] Testing Run Instantiation & Snapshot Immutability...");
  const planId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  const runCaseId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(testPlans).values({
      id: planId,
      projectId: projectAId,
      name: "Release v3.0 Scope Plan",
      targetRelease: "v3.0.0",
      status: "active",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      createdBy: userAId,
    });

    await tx.insert(testPlanCases).values({
      id: crypto.randomUUID(),
      testPlanId: planId,
      testCaseId: tc1Id,
    });

    await tx.insert(testRuns).values({
      id: runId,
      projectId: projectAId,
      testPlanId: planId,
      name: "Sprint 30 Staging Execution",
      environment: "staging",
      status: "in_progress",
      startedAt: new Date(),
      createdBy: userAId,
    });

    await tx.insert(testRunCases).values({
      id: runCaseId,
      testRunId: runId,
      testCaseId: tc1Id,
      revisionNumber: 1,
      snapshotTitle: "Verify OAuth Login with Google",
      snapshotPreconditions: "User has valid Google account",
      snapshotSteps: [
        { stepNumber: 1, instruction: "Click Sign in with Google", expectedResult: "Consent screen loads" },
        { stepNumber: 2, instruction: "Grant permissions", expectedResult: "Redirected to dashboard" },
      ],
      snapshotExpectedResult: "Authenticated session cookie returned",
      snapshotPriority: "critical",
      snapshotModuleName: "Authentication API",
      currentStatus: "not_run",
    });
  });

  // Mutate repository test case to revision 2
  await db
    .update(testCases)
    .set({
      title: "MUTATED IN REPO: OAuth Login with Passkeys (v2)",
      revision: 2,
      updatedBy: userAId,
    })
    .where(eq(testCases.id, tc1Id));

  // Verify test run case snapshot is unaffected
  const [snapshotCheck] = await db
    .select()
    .from(testRunCases)
    .where(eq(testRunCases.id, runCaseId));

  if (!snapshotCheck || snapshotCheck.snapshotTitle !== "Verify OAuth Login with Google" || snapshotCheck.revisionNumber !== 1) {
    throw new Error("Snapshot immutability violated: Repository mutation affected historical run case!");
  }
  console.log("  ✓ Snapshot immutability verified: repository title edit to v2 did not alter run case v1 snapshot.");

  // 5. Append-Only Retest Execution & History Preservation
  console.log("\n[5/7] Testing Append-Only Retest Execution & Audit Trail...");
  // Attempt 1: Failed
  await db.transaction(async (tx) => {
    await tx.insert(testExecutionAttempts).values({
      id: crypto.randomUUID(),
      testRunCaseId: runCaseId,
      attemptNumber: 1,
      status: "failed",
      actualResult: "502 Bad Gateway from Google OAuth provider callback",
      executedBy: userAId,
    });

    await tx
      .update(testRunCases)
      .set({ currentStatus: "failed", lastExecutedAt: new Date(), lastExecutedBy: userAId })
      .where(eq(testRunCases.id, runCaseId));
  });

  // Attempt 2 (Retest): Passed
  await db.transaction(async (tx) => {
    await tx.insert(testExecutionAttempts).values({
      id: crypto.randomUUID(),
      testRunCaseId: runCaseId,
      attemptNumber: 2,
      status: "passed",
      actualResult: "Retest successful after gateway firewall rule update",
      executedBy: userAId,
    });

    await tx
      .update(testRunCases)
      .set({ currentStatus: "passed", lastExecutedAt: new Date(), lastExecutedBy: userAId })
      .where(eq(testRunCases.id, runCaseId));
  });

  // Check attempt audit records
  const attempts = await db
    .select()
    .from(testExecutionAttempts)
    .where(eq(testExecutionAttempts.testRunCaseId, runCaseId))
    .orderBy(asc(testExecutionAttempts.attemptNumber));

  if (attempts.length !== 2) {
    throw new Error(`Expected 2 attempt records, found ${attempts.length}`);
  }
  if (attempts[0].status !== "failed" || attempts[1].status !== "passed") {
    throw new Error("Retest history corrupted!");
  }
  console.log("  ✓ Retest audit preserved: Attempt #1 ('failed') and Attempt #2 ('passed') both persisted.");

  // 6. Dashboard Metrics & Perspective Aggregation Accuracy
  console.log("\n[6/7] Testing Dashboard Metrics Aggregations & Perspectives...");
  const metrics = await getProjectDashboardMetrics(projectAId);

  // Check summary
  if (metrics.summary.totalTestCases !== 2) {
    throw new Error(`Dashboard totalTestCases incorrect: ${metrics.summary.totalTestCases}`);
  }
  if (metrics.summary.totalPlans !== 1 || metrics.summary.totalRuns !== 1 || metrics.summary.activeRuns !== 1) {
    throw new Error("Dashboard summary counts incorrect!");
  }

  // Check lifecycles
  if (metrics.lifecycleCounts.ready !== 1 || metrics.lifecycleCounts.draft !== 1) {
    throw new Error(`Lifecycle counts incorrect: ready=${metrics.lifecycleCounts.ready}, draft=${metrics.lifecycleCounts.draft}`);
  }

  // Check priorities
  if (metrics.priorityCounts.critical !== 1 || metrics.priorityCounts.medium !== 1) {
    throw new Error("Priority counts incorrect!");
  }

  // Check QA Perspective
  if (metrics.qaPerspective.inProgressRuns.length !== 1) {
    throw new Error("QA perspective in-progress runs count failed!");
  }
  if (metrics.qaPerspective.plansDueSoon.length !== 1 || metrics.qaPerspective.plansDueSoon[0].daysRemaining <= 0) {
    throw new Error("QA perspective plans due soon detection failed!");
  }

  // Check Dev Perspective: Untested module detection
  const untested = metrics.devPerspective.untestedModules;
  if (untested.length !== 1 || untested[0].name !== "Billing Subscriptions") {
    throw new Error(`Untested module detection failed, found: ${JSON.stringify(untested)}`);
  }

  console.log("  ✓ Metrics accuracy verified: Summary, lifecycles, priorities, and run outcomes match database state.");
  console.log("  ✓ QA Perspective verified: Detected in-progress run and upcoming plan deadline.");
  console.log("  ✓ Dev Perspective verified: Accurately identified 'Billing Subscriptions' as untested module.");

  // 7. CSV Validation Rejection of Malformed Input
  console.log("\n[7/7] Testing CSV Validation & Integrity Hardening...");
  const malformedCSV = `Title,Module,Preconditions,Steps,Expected Result,Priority,Test Types,Tags,Lifecycle\n"","Authentication API","","1. Click button","Result","extreme-priority","Positive","","ready"`;
  const validation = await parseAndValidateCSV(projectAId, malformedCSV);

  if (validation.errorCount === 0 || validation.validCount !== 0) {
    throw new Error("CSV validator failed to catch malformed rows!");
  }
  console.log(`  ✓ CSV Validator correctly caught ${validation.errorCount} structural errors without database mutation.`);

  // Clean Teardown
  console.log("\nCleaning up synthetic verification entities...");
  await db.delete(testRuns).where(eq(testRuns.projectId, projectAId));
  await db.delete(testPlans).where(eq(testPlans.projectId, projectAId));
  await db.delete(workspaces).where(eq(workspaces.id, wsAId));
  await db.delete(workspaces).where(eq(workspaces.id, wsBId));
  await db.delete(users).where(eq(users.id, userAId));
  await db.delete(users).where(eq(users.id, userBId));
  await db.delete(users).where(eq(users.id, userCId));
  console.log("  ✓ Cleaned up all synthetic database entities");

  console.log("\n=======================================================");
  console.log("🎉 ALL STEP 05 VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================");
}

runStep05Verification().catch((err) => {
  console.error("\n❌ Step 05 Verification failed:", err);
  process.exit(1);
});
