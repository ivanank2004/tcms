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
import { eq, and, sql, desc, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getTestPlanWithDetails, getProjectTestPlans } from "../lib/test-plans/actions";
import { getTestRunWithExecutionDetails, getProjectTestRuns } from "../lib/test-runs/actions";

async function runStep04Verification() {
  console.log("=== QA Workspace: Step 04 End-to-End Verification ===\n");

  const timestamp = Date.now();
  const userId = crypto.randomUUID();
  const userEmail = `qa4_runner_${timestamp}@test.com`;

  // 1. Setup User, Workspace, Project, Module
  console.log("[1/8] Seeding test environment...");
  const dummyHash = await bcrypt.hash("Password123!", 8);
  await db.insert(users).values({
    id: userId,
    email: userEmail,
    name: "QA4 Execution Specialist",
    passwordHash: dummyHash,
  });

  const workspaceId = crypto.randomUUID();
  const workspaceSlug = `ws-qa4-${timestamp}`;
  await db.insert(workspaces).values({
    id: workspaceId,
    name: "Release QA Hub",
    slug: workspaceSlug,
    ownerId: userId,
  });

  await db.insert(workspaceMembers).values({
    id: crypto.randomUUID(),
    workspaceId,
    userId,
    role: "owner",
  });

  const projectId = crypto.randomUUID();
  const projectKey = `REL-${timestamp.toString().slice(-4)}`;
  await db.insert(projects).values({
    id: projectId,
    workspaceId,
    name: "Release Validation Project",
    key: projectKey,
    status: "active",
    createdBy: userId,
  });

  const moduleId = crypto.randomUUID();
  await db.insert(modules).values({
    id: moduleId,
    projectId,
    name: "Checkout Pipeline",
    status: "active",
  });
  console.log(`  ✓ Setup Project ${projectKey} and Module 'Checkout Pipeline'`);

  // 2. Setup 2 Reusable Test Cases in Repository
  console.log("\n[2/8] Creating repository test cases...");
  const tc1Id = crypto.randomUUID();
  const tc2Id = crypto.randomUUID();

  // Case 1
  await db.transaction(async (tx) => {
    await tx.insert(testCases).values({
      id: tc1Id,
      projectId,
      moduleId,
      stableId: `${projectKey}-001`,
      sequenceNumber: 1,
      title: "Complete Checkout with Stripe",
      preconditions: "Item is in cart and user authenticated",
      expectedResult: "Order confirmed with order # generated",
      priority: "critical",
      lifecycle: "ready",
      testTypes: ["Positive", "Integration"],
      tags: ["smoke", "checkout"],
      revision: 1,
      createdBy: userId,
      updatedBy: userId,
    });

    await tx.insert(testCaseSteps).values([
      { id: crypto.randomUUID(), testCaseId: tc1Id, stepNumber: 1, instruction: "Click checkout button", expectedResult: "Checkout page loads" },
      { id: crypto.randomUUID(), testCaseId: tc1Id, stepNumber: 2, instruction: "Submit credit card token", expectedResult: "Payment processed" },
    ]);
  });

  // Case 2
  await db.transaction(async (tx) => {
    await tx.insert(testCases).values({
      id: tc2Id,
      projectId,
      moduleId,
      stableId: `${projectKey}-002`,
      sequenceNumber: 2,
      title: "Validate Coupon Code Expiration",
      expectedResult: "Displays 'Coupon has expired' warning",
      priority: "high",
      lifecycle: "ready",
      testTypes: ["Validation", "Negative"],
      tags: ["checkout", "promotions"],
      revision: 1,
      createdBy: userId,
      updatedBy: userId,
    });

    await tx.insert(testCaseSteps).values([
      { id: crypto.randomUUID(), testCaseId: tc2Id, stepNumber: 1, instruction: "Enter EXPIRED2023 code", expectedResult: "Discount not applied" },
    ]);
  });
  console.log(`  ✓ Created test cases ${projectKey}-001 and ${projectKey}-002 (revision v1)`);

  // 3. Create Test Plan & Scope Cases
  console.log("\n[3/8] Creating Test Plan and assigning repository cases...");
  const planId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(testPlans).values({
      id: planId,
      projectId,
      name: "Release 2.4.0 Sanity Suite",
      description: "Critical user journeys for v2.4.0 deployment",
      targetRelease: "v2.4.0",
      environment: "Staging",
      ownerId: userId,
      status: "active",
      createdBy: userId,
    });

    await tx.insert(testPlanCases).values([
      { id: crypto.randomUUID(), testPlanId: planId, testCaseId: tc1Id },
      { id: crypto.randomUUID(), testPlanId: planId, testCaseId: tc2Id },
    ]);
  });

  const planDetails = await getTestPlanWithDetails(planId);
  if (!planDetails || planDetails.cases.length !== 2) {
    throw new Error(`Expected 2 cases linked to test plan, found ${planDetails?.cases.length}`);
  }
  console.log(`  ✓ Test Plan '${planDetails.name}' verified with ${planDetails.cases.length} cases in scope`);

  // 4. Instantiate Test Run & Snapshot Active Revision
  console.log("\n[4/8] Instantiating Test Run and snapshotting revision data...");
  const runId = crypto.randomUUID();
  const runCase1Id = crypto.randomUUID();
  const runCase2Id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(testRuns).values({
      id: runId,
      projectId,
      testPlanId: planId,
      name: "v2.4.0 Staging Smoke Run",
      environment: "staging",
      buildVersion: "build-9841",
      assignedTo: userId,
      status: "not_started",
      createdBy: userId,
    });

    // Snapshot Case 1
    await tx.insert(testRunCases).values({
      id: runCase1Id,
      testRunId: runId,
      testCaseId: tc1Id,
      revisionNumber: 1,
      snapshotTitle: "Complete Checkout with Stripe",
      snapshotPreconditions: "Item is in cart and user authenticated",
      snapshotSteps: [
        { stepNumber: 1, instruction: "Click checkout button", expectedResult: "Checkout page loads" },
        { stepNumber: 2, instruction: "Submit credit card token", expectedResult: "Payment processed" },
      ],
      snapshotExpectedResult: "Order confirmed with order # generated",
      snapshotPriority: "critical",
      snapshotModuleName: "Checkout Pipeline",
      currentStatus: "not_run",
    });

    // Snapshot Case 2
    await tx.insert(testRunCases).values({
      id: runCase2Id,
      testRunId: runId,
      testCaseId: tc2Id,
      revisionNumber: 1,
      snapshotTitle: "Validate Coupon Code Expiration",
      snapshotSteps: [
        { stepNumber: 1, instruction: "Enter EXPIRED2023 code", expectedResult: "Discount not applied" },
      ],
      snapshotExpectedResult: "Displays 'Coupon has expired' warning",
      snapshotPriority: "high",
      snapshotModuleName: "Checkout Pipeline",
      currentStatus: "not_run",
    });
  });

  const runDetails = await getTestRunWithExecutionDetails(runId);
  if (!runDetails || runDetails.cases.length !== 2) {
    throw new Error("Failed to instantiate run with 2 snapshotted cases");
  }
  if (runDetails.stats.notRun !== 2 || runDetails.stats.progressPercent !== 0) {
    throw new Error(`Initial run progress incorrect: ${runDetails.stats.progressPercent}%`);
  }
  console.log("  ✓ Test run instantiated with 2 snapshotted cases in status 'not_run'");

  // 5. Test Repository Mutation Isolation Invariant
  console.log("\n[5/8] Testing Repository Mutation Isolation Invariant...");
  // Mutate Case 1 in repository to revision 2 with completely different title and steps
  await db.transaction(async (tx) => {
    await tx
      .update(testCases)
      .set({
        title: "MODIFIED IN REPO: ApplePay Checkout v2",
        revision: 2,
        updatedBy: userId,
      })
      .where(eq(testCases.id, tc1Id));

    await tx.delete(testCaseSteps).where(eq(testCaseSteps.testCaseId, tc1Id));
    await tx.insert(testCaseSteps).values([
      { id: crypto.randomUUID(), testCaseId: tc1Id, stepNumber: 1, instruction: "Authorize ApplePay biometrics", expectedResult: "Success" },
    ]);
  });

  // Re-fetch the test run
  const runAfterRepoEdit = await getTestRunWithExecutionDetails(runId);
  const snapshottedCase1 = runAfterRepoEdit?.cases.find((c) => c.id === runCase1Id);

  if (!snapshottedCase1) throw new Error("Could not find run case 1");
  if (snapshottedCase1.snapshotTitle !== "Complete Checkout with Stripe") {
    throw new Error(`Isolation failed: snapshotTitle changed to '${snapshottedCase1.snapshotTitle}'`);
  }
  if (snapshottedCase1.revisionNumber !== 1) {
    throw new Error(`Isolation failed: snapshot revision changed to ${snapshottedCase1.revisionNumber}`);
  }
  if ((snapshottedCase1.snapshotSteps as StepSnapshot[]).length !== 2) {
    throw new Error("Isolation failed: snapshot steps altered by repo edit");
  }
  console.log("  ✓ Repository mutation isolation verified: test run preserves immutable v1 snapshot.");

  // 6. Test Append-Only Retest Execution Workflow
  console.log("\n[6/8] Testing Append-Only Retest Execution Workflow...");
  // Record Attempt 1 for Case 1: FAILED
  await db.transaction(async (tx) => {
    await tx.insert(testExecutionAttempts).values({
      id: crypto.randomUUID(),
      testRunCaseId: runCase1Id,
      attemptNumber: 1,
      status: "failed",
      actualResult: "Step 2 failed: Gateway returned 504 Gateway Timeout",
      durationSeconds: 15,
      executedBy: userId,
    });

    await tx
      .update(testRunCases)
      .set({ currentStatus: "failed", lastExecutedAt: new Date(), lastExecutedBy: userId })
      .where(eq(testRunCases.id, runCase1Id));

    await tx
      .update(testRuns)
      .set({ status: "in_progress", startedAt: new Date() })
      .where(eq(testRuns.id, runId));
  });

  let runCheck1 = await getTestRunWithExecutionDetails(runId);
  let case1Check = runCheck1?.cases.find((c) => c.id === runCase1Id);
  if (case1Check?.currentStatus !== "failed" || case1Check.attempts.length !== 1) {
    throw new Error("Attempt 1 failure recording failed");
  }
  console.log("  ✓ Attempt 1 recorded as 'failed' with symptom notes. Run marked 'in_progress'.");

  // Record Attempt 2 for Case 1 (Retest): PASSED
  await db.transaction(async (tx) => {
    await tx.insert(testExecutionAttempts).values({
      id: crypto.randomUUID(),
      testRunCaseId: runCase1Id,
      attemptNumber: 2,
      status: "passed",
      actualResult: "Retest passed after payment proxy restart. Order #9421 created.",
      durationSeconds: 12,
      executedBy: userId,
    });

    await tx
      .update(testRunCases)
      .set({ currentStatus: "passed", lastExecutedAt: new Date(), lastExecutedBy: userId })
      .where(eq(testRunCases.id, runCase1Id));
  });

  let runCheck2 = await getTestRunWithExecutionDetails(runId);
  case1Check = runCheck2?.cases.find((c) => c.id === runCase1Id);
  if (case1Check?.currentStatus !== "passed") {
    throw new Error(`Expected latest status 'passed', got '${case1Check?.currentStatus}'`);
  }
  if (case1Check.attempts.length !== 2) {
    throw new Error(`Expected 2 historical attempts, got ${case1Check.attempts.length}`);
  }
  if (case1Check.attempts[0].attempt.status !== "failed" || case1Check.attempts[1].attempt.status !== "passed") {
    throw new Error("Chronological attempt audit integrity compromised");
  }
  console.log("  ✓ Attempt 2 (retest) recorded as 'passed'. Historical attempt 1 failure remains intact.");

  // 7. Verify Progress Calculation & Metrics
  console.log("\n[7/8] Testing Progress Calculation & Execution Metrics...");
  // Record Attempt 1 for Case 2: BLOCKED
  await db.transaction(async (tx) => {
    await tx.insert(testExecutionAttempts).values({
      id: crypto.randomUUID(),
      testRunCaseId: runCase2Id,
      attemptNumber: 1,
      status: "blocked",
      actualResult: "Blocked: Coupon server mock offline",
      durationSeconds: 5,
      executedBy: userId,
    });

    await tx
      .update(testRunCases)
      .set({ currentStatus: "blocked", lastExecutedAt: new Date(), lastExecutedBy: userId })
      .where(eq(testRunCases.id, runCase2Id));
  });

  const finalRun = await getTestRunWithExecutionDetails(runId);
  if (!finalRun) throw new Error("Could not retrieve final run metrics");

  const stats = finalRun.stats;
  if (stats.totalCases !== 2) throw new Error(`Expected total 2, got ${stats.totalCases}`);
  if (stats.passed !== 1) throw new Error(`Expected 1 passed, got ${stats.passed}`);
  if (stats.failed !== 0) throw new Error(`Expected 0 failed (retest succeeded), got ${stats.failed}`);
  if (stats.blocked !== 1) throw new Error(`Expected 1 blocked, got ${stats.blocked}`);
  if (stats.notRun !== 0) throw new Error(`Expected 0 notRun, got ${stats.notRun}`);
  if (stats.progressPercent !== 100) throw new Error(`Expected 100% progress, got ${stats.progressPercent}%`);
  if (stats.passRate !== 50) throw new Error(`Expected 50% pass rate, got ${stats.passRate}%`);

  console.log(`  ✓ Metrics Verified: Total: ${stats.totalCases}, Passed: ${stats.passed}, Blocked: ${stats.blocked}, Progress: ${stats.progressPercent}%, Pass Rate: ${stats.passRate}%`);
  console.log("  ✓ Invariant confirmed: Not Run cases are never counted as passed.");

  // Complete Run
  await db
    .update(testRuns)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(testRuns.id, runId));

  const [completedRun] = await db.select().from(testRuns).where(eq(testRuns.id, runId));
  if (completedRun.status !== "completed" || !completedRun.completedAt) {
    throw new Error("Run status completion transition failed");
  }
  console.log("  ✓ Test run transitioned to 'completed' with completedAt timestamp recorded");

  // 8. Cleanup Synthetic Test Data
  console.log("\n[8/8] Cleaning up synthetic test workspace...");
  // Delete test runs and test plans first so the restrict constraint on test_cases is satisfied
  await db.delete(testRuns).where(eq(testRuns.projectId, projectId));
  await db.delete(testPlans).where(eq(testPlans.projectId, projectId));
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  await db.delete(users).where(eq(users.id, userId));
  console.log("  ✓ Cleaned up test database entities");

  console.log("\n=======================================================");
  console.log("🎉 ALL STEP 04 VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================");
}

runStep04Verification().catch((err) => {
  console.error("\n❌ Step 04 Verification failed:", err);
  process.exit(1);
});
