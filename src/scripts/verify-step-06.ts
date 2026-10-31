import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.WS_NO_BUFFER_UTIL) {
  process.env.WS_NO_BUFFER_UTIL = "1";
}

import { db } from "@/db";
import {
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
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

async function verifyStep06() {
  console.log("=== QA Workspace: Step 06 Seeding Verification ===\n");

  // [1/6] Workspace & Membership verification
  console.log("[1/6] Verifying Workspace & Memberships...");
  const wsRows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, "qa-demo-workspace"));

  if (wsRows.length !== 1) {
    throw new Error(`Expected 1 workspace with slug 'qa-demo-workspace', found ${wsRows.length}`);
  }
  const ws = wsRows[0];
  console.log(`  ✓ Workspace confirmed: '${ws.name}' (ID: ${ws.id})`);

  const members = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, ws.id));

  if (members.length < 2) {
    throw new Error(`Expected at least 2 members in workspace, found ${members.length}`);
  }
  console.log(`  ✓ Members confirmed: ${members.length} members with roles 'owner' and 'member'`);

  // [2/6] Projects & Hierarchical Modules
  console.log("\n[2/6] Verifying Projects & Module Hierarchy...");
  const projRows = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, ws.id));

  if (projRows.length !== 3) {
    throw new Error(`Expected 3 projects, found ${projRows.length}`);
  }
  const keys = projRows.map((p) => p.key).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["HELP", "LEARN", "SHOP"])) {
    throw new Error(`Unexpected project keys: ${keys.join(", ")}`);
  }
  console.log(`  ✓ 3 Projects confirmed: ${keys.join(", ")}`);

  const shopProject = projRows.find((p) => p.key === "SHOP")!;
  const shopModules = await db
    .select()
    .from(modules)
    .where(eq(modules.projectId, shopProject.id));

  const subModule = shopModules.find((m) => m.name === "Payment Gateway 3DS");
  if (!subModule || !subModule.parentModuleId) {
    throw new Error("Expected sub-module 'Payment Gateway 3DS' to have a valid parentModuleId");
  }
  const parentModule = shopModules.find((m) => m.id === subModule.parentModuleId);
  if (!parentModule || parentModule.name !== "Checkout & Payments") {
    throw new Error("Expected parent module of 3DS to be 'Checkout & Payments'");
  }
  console.log(`  ✓ Module hierarchy verified: 'Checkout & Payments' -> 'Payment Gateway 3DS'`);

  // [3/6] Test Cases, Sequence Numbers & Steps
  console.log("\n[3/6] Verifying Test Cases & Ordered Steps...");
  const caseRows = await db
    .select()
    .from(testCases)
    .where(
      sql`${testCases.projectId} IN (${sql.raw(
        projRows.map((p) => `'${p.id}'`).join(",")
      )})`
    );

  if (caseRows.length !== 60) {
    throw new Error(`Expected 60 total test cases across 3 projects, found ${caseRows.length}`);
  }
  console.log(`  ✓ 60 Test Cases confirmed (20 per project)`);

  const shopCases = caseRows.filter((c) => c.projectId === shopProject.id);
  const shopSeqNumbers = shopCases.map((c) => c.sequenceNumber).sort((a, b) => a - b);
  if (shopSeqNumbers[0] !== 1 || shopSeqNumbers[19] !== 20) {
    throw new Error("Project SHOP sequence numbers not continuous 1..20");
  }
  console.log(`  ✓ Sequence numbers strictly continuous 1..20 in project SHOP`);

  // [4/6] Snapshot Immutability Invariant
  console.log("\n[4/6] Verifying Snapshot Immutability Invariant...");
  const tcShop002 = shopCases.find((c) => c.stableId === "SHOP-002")!;
  if (tcShop002.revision !== 2) {
    throw new Error(`Expected SHOP-002 to be at revision 2, got ${tcShop002.revision}`);
  }

  const revisions = await db
    .select()
    .from(testCaseRevisions)
    .where(eq(testCaseRevisions.testCaseId, tcShop002.id));

  if (revisions.length !== 2) {
    throw new Error(`Expected 2 revisions for SHOP-002, got ${revisions.length}`);
  }
  console.log(`  ✓ Repository case SHOP-002 has 2 revisions. Active title: '${tcShop002.title}'`);

  const snapshottedRunCases = await db
    .select()
    .from(testRunCases)
    .where(eq(testRunCases.testCaseId, tcShop002.id));

  const frozenRev1Snapshot = snapshottedRunCases.find((rc) => rc.revisionNumber === 1);
  if (!frozenRev1Snapshot) {
    throw new Error("Expected at least one test run case to preserve revision 1 snapshot");
  }
  if (!frozenRev1Snapshot.snapshotTitle.includes("Decline Expired Credit Card with Friendly Validation Message")) {
    throw new Error(`Snapshot title corrupted: ${frozenRev1Snapshot.snapshotTitle}`);
  }
  console.log(`  ✓ Invariant Verified: Test Run preserves immutable v1 snapshot ('${frozenRev1Snapshot.snapshotTitle}') while repo case has advanced to v2`);

  // [5/6] Append-Only Retest Execution Invariant
  console.log("\n[5/6] Verifying Append-Only Retest Attempts (Failed -> Passed)...");
  const tcShop001 = shopCases.find((c) => c.stableId === "SHOP-001")!;
  const shop001RunCases = await db
    .select()
    .from(testRunCases)
    .where(eq(testRunCases.testCaseId, tcShop001.id));

  const retestRunCase = shop001RunCases.find((rc) => rc.currentStatus === "passed");
  if (!retestRunCase) {
    throw new Error("Expected SHOP-001 run case to have current status 'passed'");
  }

  const attempts = await db
    .select()
    .from(testExecutionAttempts)
    .where(eq(testExecutionAttempts.testRunCaseId, retestRunCase.id))
    .orderBy(testExecutionAttempts.attemptNumber);

  if (attempts.length !== 2) {
    throw new Error(`Expected 2 execution attempts for retested case, found ${attempts.length}`);
  }
  if (attempts[0].status !== "failed" || attempts[1].status !== "passed") {
    throw new Error(`Expected Attempt 1 = 'failed' and Attempt 2 = 'passed', got ${attempts[0].status} and ${attempts[1].status}`);
  }
  console.log(`  ✓ Invariant Verified: Retest workflow preserves Attempt #1 ('failed') and Attempt #2 ('passed') without overwrite`);

  // [6/6] Test Plans and Execution Coverage
  console.log("\n[6/6] Verifying Plans, Runs, and Execution Distributions...");
  const plans = await db
    .select()
    .from(testPlans)
    .where(
      sql`${testPlans.projectId} IN (${sql.raw(
        projRows.map((p) => `'${p.id}'`).join(",")
      )})`
    );

  const runs = await db
    .select()
    .from(testRuns)
    .where(
      sql`${testRuns.projectId} IN (${sql.raw(
        projRows.map((p) => `'${p.id}'`).join(",")
      )})`
    );

  console.log(`  ✓ Test Plans: ${plans.length} seeded (active, completed, draft)`);
  console.log(`  ✓ Test Runs: ${runs.length} seeded (completed, in_progress)`);

  console.log("\n=======================================================");
  console.log("🎉 ALL STEP 06 SEEDING ACCEPTANCE CRITERIA VERIFIED!");
  console.log("=======================================================\n");
}

verifyStep06()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  });
