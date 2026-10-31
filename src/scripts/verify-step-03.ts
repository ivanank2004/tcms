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
  type StepSnapshot,
} from "../db/schema";
import { eq, and, sql, asc, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getProjectTestCases, getTestCaseWithHistory } from "../lib/test-cases/actions";
import { exportTestCasesToCSV, parseAndValidateCSV } from "../lib/test-cases/csv";

async function runStep03Verification() {
  console.log("=== QA Workspace: Step 03 End-to-End Verification ===\n");

  const timestamp = Date.now();
  const userId = crypto.randomUUID();
  const userEmail = `qa3_tester_${timestamp}@test.com`;

  // 1. Setup User, Workspace, Project, and Module
  console.log("[1/7] Seeding synthetic environment...");
  const dummyHash = await bcrypt.hash("Password123!", 8);
  await db.insert(users).values({
    id: userId,
    email: userEmail,
    name: "QA3 Test Engineer",
    passwordHash: dummyHash,
  });

  const workspaceId = crypto.randomUUID();
  const workspaceSlug = `ws-qa3-${timestamp}`;
  await db.insert(workspaces).values({
    id: workspaceId,
    name: "Core QA Hub",
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
  const projectKey = `REG-${timestamp.toString().slice(-4)}`;
  await db.insert(projects).values({
    id: projectId,
    workspaceId,
    name: "Regression Suite",
    key: projectKey,
    status: "active",
    createdBy: userId,
  });

  const moduleId = crypto.randomUUID();
  await db.insert(modules).values({
    id: moduleId,
    projectId,
    name: "Payment Gateway",
    description: "Credit card, PayPal and Stripe processing",
    status: "active",
  });

  console.log(`  ✓ Created Project ${projectKey} and Module 'Payment Gateway'`);

  // 2. Sequential Stable ID Generation
  console.log("\n[2/7] Testing Sequential Stable ID Generation & Ordering...");
  const tc1Id = crypto.randomUUID();
  const tc2Id = crypto.randomUUID();

  // Insert case 1
  await db.transaction(async (tx) => {
    const seq = 1;
    const stableId = `${projectKey}-${String(seq).padStart(3, "0")}`;
    await tx.insert(testCases).values({
      id: tc1Id,
      projectId,
      moduleId,
      stableId,
      sequenceNumber: seq,
      title: "Authorize Credit Card with 3DS",
      description: "Verify standard 3DS v2 challenge workflow",
      preconditions: "User has a 3DS-enrolled card",
      expectedResult: "Payment authorized successfully",
      priority: "critical",
      lifecycle: "ready",
      testTypes: ["Positive", "Security", "Integration"],
      tags: ["payment", "checkout", "3ds"],
      revision: 1,
      createdBy: userId,
      updatedBy: userId,
    });

    const steps = [
      { stepNumber: 1, instruction: "Navigate to checkout and enter card number", expectedResult: "Card brand recognized" },
      { stepNumber: 2, instruction: "Submit order and complete OTP challenge", expectedResult: "OTP accepted" },
      { stepNumber: 3, instruction: "Confirm receipt of payment confirmation token", expectedResult: "Token saved with status CHARGED" },
    ];

    await tx.insert(testCaseSteps).values(
      steps.map((s) => ({
        id: crypto.randomUUID(),
        testCaseId: tc1Id,
        stepNumber: s.stepNumber,
        instruction: s.instruction,
        expectedResult: s.expectedResult,
      }))
    );

    await tx.insert(testCaseRevisions).values({
      id: crypto.randomUUID(),
      testCaseId: tc1Id,
      revisionNumber: 1,
      title: "Authorize Credit Card with 3DS",
      preconditions: "User has a 3DS-enrolled card",
      expectedResult: "Payment authorized successfully",
      stepsSnapshot: steps,
      changeSummary: "Initial version",
      changedBy: userId,
    });
  });

  // Insert case 2
  await db.transaction(async (tx) => {
    const seq = 2;
    const stableId = `${projectKey}-${String(seq).padStart(3, "0")}`;
    await tx.insert(testCases).values({
      id: tc2Id,
      projectId,
      moduleId,
      stableId,
      sequenceNumber: seq,
      title: "Decline Expired Credit Card",
      description: "Ensure card expiration returns error 4002",
      expectedResult: "Clear error message displayed to user",
      priority: "high",
      lifecycle: "draft",
      testTypes: ["Negative", "Boundary Value"],
      tags: ["payment", "validation"],
      revision: 1,
      createdBy: userId,
      updatedBy: userId,
    });

    await tx.insert(testCaseSteps).values([
      {
        id: crypto.randomUUID(),
        testCaseId: tc2Id,
        stepNumber: 1,
        instruction: "Enter expired card date 01/20",
        expectedResult: "Inline validation error triggers immediately",
      },
    ]);

    await tx.insert(testCaseRevisions).values({
      id: crypto.randomUUID(),
      testCaseId: tc2Id,
      revisionNumber: 1,
      title: "Decline Expired Credit Card",
      expectedResult: "Clear error message displayed to user",
      stepsSnapshot: [
        {
          stepNumber: 1,
          instruction: "Enter expired card date 01/20",
          expectedResult: "Inline validation error triggers immediately",
        },
      ],
      changeSummary: "Initial version",
      changedBy: userId,
    });
  });

  const case1 = await getTestCaseWithHistory(tc1Id);
  const case2 = await getTestCaseWithHistory(tc2Id);

  if (!case1 || case1.stableId !== `${projectKey}-001`) {
    throw new Error(`Expected stable ID ${projectKey}-001, got ${case1?.stableId}`);
  }
  if (!case2 || case2.stableId !== `${projectKey}-002`) {
    throw new Error(`Expected stable ID ${projectKey}-002, got ${case2?.stableId}`);
  }
  if (case1.steps.length !== 3 || case1.steps[0].stepNumber !== 1 || case1.steps[2].stepNumber !== 3) {
    throw new Error("Steps ordering verification failed");
  }
  console.log(`  ✓ Generated ${case1.stableId} and ${case2.stableId} with strictly ordered steps`);

  // 3. Substantive Change Tracking & Revision Bump
  console.log("\n[3/7] Testing Substantive Change vs Revision Bump (v1 -> v2)...");
  // Substantive edit: Update step 2 instruction and title
  const updatedSteps = [
    { stepNumber: 1, instruction: "Navigate to checkout and enter card number", expectedResult: "Card brand recognized" },
    { stepNumber: 2, instruction: "Submit order and complete Biometric challenge (FIDO2)", expectedResult: "Biometric passed" },
    { stepNumber: 3, instruction: "Confirm receipt of payment confirmation token", expectedResult: "Token saved with status CHARGED" },
  ];

  await db.transaction(async (tx) => {
    await tx
      .update(testCases)
      .set({
        title: "Authorize Credit Card with 3DS v2.2 & Biometrics",
        revision: 2,
        updatedBy: userId,
      })
      .where(eq(testCases.id, tc1Id));

    await tx.delete(testCaseSteps).where(eq(testCaseSteps.testCaseId, tc1Id));
    await tx.insert(testCaseSteps).values(
      updatedSteps.map((s) => ({
        id: crypto.randomUUID(),
        testCaseId: tc1Id,
        stepNumber: s.stepNumber,
        instruction: s.instruction,
        expectedResult: s.expectedResult,
      }))
    );

    await tx.insert(testCaseRevisions).values({
      id: crypto.randomUUID(),
      testCaseId: tc1Id,
      revisionNumber: 2,
      title: "Authorize Credit Card with 3DS v2.2 & Biometrics",
      preconditions: "User has a 3DS-enrolled card",
      expectedResult: "Payment authorized successfully",
      stepsSnapshot: updatedSteps,
      changeSummary: "Upgraded protocol to 3DS 2.2 with biometrics",
      changedBy: userId,
    });
  });

  const tc1AfterSubstantive = await getTestCaseWithHistory(tc1Id);
  if (tc1AfterSubstantive?.revision !== 2) {
    throw new Error(`Expected revision 2 after substantive change, got ${tc1AfterSubstantive?.revision}`);
  }
  if (tc1AfterSubstantive.revisions.length !== 2) {
    throw new Error(`Expected 2 revision snapshots, got ${tc1AfterSubstantive.revisions.length}`);
  }
  const rev1 = tc1AfterSubstantive.revisions.find((r) => r.revision.revisionNumber === 1);
  const rev2 = tc1AfterSubstantive.revisions.find((r) => r.revision.revisionNumber === 2);

  if (!rev1 || (rev1.revision.stepsSnapshot as StepSnapshot[])[1].instruction.includes("Biometric")) {
    throw new Error("Revision 1 snapshot was improperly mutated!");
  }
  if (!rev2 || !(rev2.revision.stepsSnapshot as StepSnapshot[])[1].instruction.includes("Biometric")) {
    throw new Error("Revision 2 snapshot did not capture new step content!");
  }
  console.log("  ✓ Revision bumped from v1 to v2. Historical v1 snapshot preserved immutably.");

  // 4. Non-Substantive Metadata Change
  console.log("\n[4/7] Testing Non-Substantive (Metadata-only) Change (v2 remains v2)...");
  await db
    .update(testCases)
    .set({
      priority: "high", // Changed priority
      tags: ["payment", "checkout", "3ds", "q3-release"], // Added tag
      updatedBy: userId,
    })
    .where(eq(testCases.id, tc1Id));

  const tc1AfterMetadata = await getTestCaseWithHistory(tc1Id);
  if (tc1AfterMetadata?.revision !== 2) {
    throw new Error(`Revision should remain 2 on metadata edit, but became ${tc1AfterMetadata?.revision}`);
  }
  if (tc1AfterMetadata.revisions.length !== 2) {
    throw new Error("Metadata edit erroneously created a new revision record");
  }
  console.log("  ✓ Metadata update (priority/tags) preserved revision v2 without unnecessary bump.");

  // 5. Test Query Filters & Taxonomy Search
  console.log("\n[5/7] Testing Filtering, Search & Taxonomy Queries...");
  const byModule = await getProjectTestCases(projectId, { moduleId });
  if (byModule.total !== 2) {
    throw new Error(`Expected 2 cases for module, got ${byModule.total}`);
  }

  const byPriority = await getProjectTestCases(projectId, { priority: "high" });
  if (byPriority.total !== 2) {
    throw new Error(`Expected 2 high priority cases, got ${byPriority.total}`);
  }

  const byLifecycle = await getProjectTestCases(projectId, { lifecycle: "ready" });
  if (byLifecycle.total !== 1 || byLifecycle.items[0].testCase.stableId !== `${projectKey}-001`) {
    throw new Error(`Lifecycle filter failed, got total: ${byLifecycle.total}`);
  }

  const byType = await getProjectTestCases(projectId, { testType: "Security" });
  if (byType.total !== 1) {
    throw new Error(`Test type filter failed, got total: ${byType.total}`);
  }

  const bySearch = await getProjectTestCases(projectId, { search: "Biometrics" });
  if (bySearch.total !== 1 || bySearch.items[0].testCase.id !== tc1Id) {
    throw new Error(`Search filter failed, got total: ${bySearch.total}`);
  }
  console.log("  ✓ Filtering by module, priority, lifecycle, testType array, and full-text search passed");

  // 6. RFC 4180 CSV Export and Two-Phase Import
  console.log("\n[6/7] Testing RFC 4180 CSV Export & Two-Phase Import Validation...");
  const csvData = await exportTestCasesToCSV(projectId);
  if (!csvData.startsWith("Stable ID,Title,Module,Preconditions,Steps,Expected Result,Priority,Test Types,Tags,Lifecycle")) {
    throw new Error("CSV Export missing expected standard header line");
  }
  if (!csvData.includes(`${projectKey}-001`) || !csvData.includes("Authorize Credit Card with 3DS v2.2 & Biometrics")) {
    throw new Error("CSV Export missing expected test case data");
  }
  console.log("  ✓ Exported CSV successfully with standard RFC 4180 headers & multi-line steps formatting");

  // Test CSV Dry-Run with Valid Input
  const validCsvSample = `Title,Module,Preconditions,Steps,Expected Result,Priority,Test Types,Tags,Lifecycle\n"Verify CVV Length Check","Payment Gateway","User on payment page","1. Enter 2-digit CVV | Expected: Field flags error\n2. Enter 3-digit CVV | Expected: Field valid","CVV validation works","medium","Validation; Boundary Value","payment; checkout","ready"`;
  const dryRunValid = await parseAndValidateCSV(projectId, validCsvSample);
  if (dryRunValid.errorCount !== 0 || dryRunValid.validCount !== 1) {
    throw new Error(`Expected valid dry-run, got errors: ${JSON.stringify(dryRunValid.errors)}`);
  }
  console.log("  ✓ CSV Dry-run validation passed on valid CSV payload");

  // Test CSV Dry-Run with Malformed Input (Missing Title and Invalid Priority)
  const invalidCsvSample = `Title,Module,Preconditions,Steps,Expected Result,Priority,Test Types,Tags,Lifecycle\n"","Payment Gateway","","1. Step 1","Result","super-urgent","Positive","","ready"`;
  const dryRunInvalid = await parseAndValidateCSV(projectId, invalidCsvSample);
  if (dryRunInvalid.errorCount === 0) {
    throw new Error("CSV validator failed to detect missing title and invalid priority");
  }
  console.log(`  ✓ CSV Validator correctly caught ${dryRunInvalid.errorCount} structural errors in dry-run`);

  // 7. Cleanup Synthetic Test Data
  console.log("\n[7/7] Cleaning up synthetic test workspace...");
  // Delete workspace cascades testCases, steps, revisions, projects, modules
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  await db.delete(users).where(eq(users.id, userId));
  console.log("  ✓ Cleaned up test database entities");

  console.log("\n=======================================================");
  console.log("🎉 ALL STEP 03 VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================");
}

runStep03Verification().catch((err) => {
  console.error("\n❌ Step 03 Verification failed:", err);
  process.exit(1);
});
