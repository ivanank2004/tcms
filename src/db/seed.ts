import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.WS_NO_BUFFER_UTIL) {
  process.env.WS_NO_BUFFER_UTIL = "1";
}

import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  workspaces,
  workspaceMembers,
  users,
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
import { eq } from "drizzle-orm";
import { SEED_PROJECTS, type SeedStep } from "./seed-data";

const SEED_NAMESPACE = "4f8a8462-87db-4e12-b529-65089e82c589";

export function seedId(entityType: string, key: string): string {
  const hash = createHash("sha256")
    .update(`${SEED_NAMESPACE}:${entityType}:${key}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function runSeed() {
  console.log("=== QA Workspace: Database Seeder ===");

  // 1. Safety Guard for Production Database
  const isProdBranch = process.env.NEON_BRANCH === "production";
  const allowProd =
    process.argv.includes("--allow-production") ||
    process.env.ALLOW_PRODUCTION_SEED === "true";

  if (isProdBranch && !allowProd) {
    console.error("\n❌ SAFETY GUARD TRIGGERED:");
    console.error("  Target Neon branch is 'production'.");
    console.error("  To seed safely, run with: npm run db:seed -- --allow-production");
    console.error("  Or set ALLOW_PRODUCTION_SEED=true\n");
    process.exit(1);
  }

  console.log(`  Target Branch: ${process.env.NEON_BRANCH || "local/default"}`);
  console.log(`  Seed Workspace Slug: 'qa-demo-workspace'\n`);

  // 2. Identify or Seed Demo Users
  console.log("[1/7] Resolving or initializing workspace owners & collaborators...");
  const existingUsers = await db.select().from(users).limit(5);

  let primaryUser = existingUsers.find((u) => u.email === "tcms@example.com");
  if (!primaryUser && existingUsers.length > 0) {
    primaryUser = existingUsers[0];
  }

  if (!primaryUser) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("Password123!", salt);
    const newUserId = seedId("user", "admin-default");
    await db
      .insert(users)
      .values({
        id: newUserId,
        email: "tcms@example.com",
        name: "QA Admin User",
        passwordHash,
      })
      .onConflictDoNothing();
    primaryUser = {
      id: newUserId,
      email: "tcms@example.com",
      name: "QA Admin User",
      passwordHash,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Create additional synthetic QA Collaborator user
  const collabUserId = seedId("user", "alex-qa");
  const collabSalt = await bcrypt.genSalt(10);
  const collabPasswordHash = await bcrypt.hash("Password123!", collabSalt);
  await db
    .insert(users)
    .values({
      id: collabUserId,
      email: "alex.qa@synthetic-testing.internal",
      name: "Alex QA Specialist",
      passwordHash: collabPasswordHash,
    })
    .onConflictDoNothing();

  console.log(`  ✓ Primary Owner: ${primaryUser.name} (${primaryUser.email})`);
  console.log(`  ✓ Collaborator: Alex QA Specialist (alex.qa@synthetic-testing.internal)`);

  // 3. Upsert Main Demo Workspace
  console.log("\n[2/7] Seeding 'QA Demo Workspace'...");
  const workspaceId = seedId("workspace", "qa-demo-workspace");
  await db
    .insert(workspaces)
    .values({
      id: workspaceId,
      name: "QA Demo Workspace",
      slug: "qa-demo-workspace",
      description: "Synthetic workspace for testing QA Workspace features.",
      ownerId: primaryUser.id,
    })
    .onConflictDoUpdate({
      target: workspaces.id,
      set: {
        name: "QA Demo Workspace",
        description: "Synthetic workspace for testing QA Workspace features.",
        updatedAt: new Date(),
      },
    });

  // Memberships
  await db
    .insert(workspaceMembers)
    .values({
      id: seedId("member", `${workspaceId}:${primaryUser.id}`),
      workspaceId,
      userId: primaryUser.id,
      role: "owner",
    })
    .onConflictDoNothing();

  await db
    .insert(workspaceMembers)
    .values({
      id: seedId("member", `${workspaceId}:${collabUserId}`),
      workspaceId,
      userId: collabUserId,
      role: "member",
    })
    .onConflictDoNothing();

  console.log("  ✓ Workspace and member roles established.");

  // 4. Seed Projects & Module Hierarchies
  console.log("\n[3/7] Seeding 3 Projects and hierarchical modules...");
  let totalProjects = 0;
  let totalModules = 0;

  for (const p of SEED_PROJECTS) {
    const projectId = seedId("project", p.key);
    await db
      .insert(projects)
      .values({
        id: projectId,
        workspaceId,
        name: p.name,
        key: p.key,
        description: p.description,
        status: "active",
        createdBy: primaryUser.id,
      })
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          name: p.name,
          description: p.description,
          updatedAt: new Date(),
        },
      });
    totalProjects++;

    // Insert Top-Level Modules first
    const topLevelModules = p.modules.filter((m) => !m.parentName);
    for (const m of topLevelModules) {
      const moduleId = seedId("module", `${p.key}:${m.name}`);
      await db
        .insert(modules)
        .values({
          id: moduleId,
          projectId,
          name: m.name,
          description: m.description,
          status: "active",
        })
        .onConflictDoUpdate({
          target: modules.id,
          set: {
            description: m.description,
            updatedAt: new Date(),
          },
        });
      totalModules++;
    }

    // Insert Sub-Modules
    const subModules = p.modules.filter((m) => m.parentName);
    for (const m of subModules) {
      const parentId = seedId("module", `${p.key}:${m.parentName}`);
      const moduleId = seedId("module", `${p.key}:${m.name}`);
      await db
        .insert(modules)
        .values({
          id: moduleId,
          projectId,
          name: m.name,
          description: m.description,
          parentModuleId: parentId,
          status: "active",
        })
        .onConflictDoUpdate({
          target: modules.id,
          set: {
            description: m.description,
            parentModuleId: parentId,
            updatedAt: new Date(),
          },
        });
      totalModules++;
    }
  }
  console.log(`  ✓ Seeded ${totalProjects} Projects and ${totalModules} Modules.`);

  // 5. Seed Test Cases, Ordered Steps & Revision History
  console.log("\n[4/7] Seeding 60 Test Cases, Ordered Steps & Revisions...");
  let totalCases = 0;
  let totalSteps = 0;
  let totalRevisions = 0;

  for (const p of SEED_PROJECTS) {
    const projectId = seedId("project", p.key);

    for (const tc of p.testCases) {
      const testCaseId = seedId("test_case", tc.key);
      const moduleId = seedId("module", `${p.key}:${tc.moduleName}`);
      const hasRev2 = Boolean(tc.rev2);

      const activeTitle = hasRev2 ? tc.rev2!.title : tc.title;
      const activeDescription = (hasRev2 && tc.rev2!.description) || tc.description;
      const activePreconditions = (hasRev2 && tc.rev2!.preconditions) || tc.preconditions;
      const activeExpectedResult = (hasRev2 && tc.rev2!.expectedResult) || tc.expectedResult;
      const activeRevisionNumber = hasRev2 ? 2 : 1;

      await db
        .insert(testCases)
        .values({
          id: testCaseId,
          projectId,
          moduleId,
          stableId: tc.key,
          sequenceNumber: tc.sequenceNumber,
          title: activeTitle,
          description: activeDescription,
          preconditions: activePreconditions,
          expectedResult: activeExpectedResult,
          priority: tc.priority,
          lifecycle: tc.lifecycle,
          testTypes: tc.testTypes,
          tags: tc.tags,
          ownerId: primaryUser.id,
          revision: activeRevisionNumber,
          createdBy: primaryUser.id,
          updatedBy: primaryUser.id,
        })
        .onConflictDoUpdate({
          target: testCases.id,
          set: {
            title: activeTitle,
            description: activeDescription,
            preconditions: activePreconditions,
            expectedResult: activeExpectedResult,
            priority: tc.priority,
            lifecycle: tc.lifecycle,
            testTypes: tc.testTypes,
            tags: tc.tags,
            revision: activeRevisionNumber,
            updatedAt: new Date(),
          },
        });
      totalCases++;

      // Ordered Steps (use rev2 steps if active)
      const activeSteps: SeedStep[] = hasRev2 ? tc.rev2!.steps : tc.steps;
      for (const step of activeSteps) {
        const stepId = seedId("step", `${tc.key}:${step.stepNumber}`);
        await db
          .insert(testCaseSteps)
          .values({
            id: stepId,
            testCaseId,
            stepNumber: step.stepNumber,
            instruction: step.instruction,
            expectedResult: step.expectedResult || null,
          })
          .onConflictDoUpdate({
            target: testCaseSteps.id,
            set: {
              instruction: step.instruction,
              expectedResult: step.expectedResult || null,
            },
          });
        totalSteps++;
      }

      // If test case has revision history, record revision records
      if (hasRev2) {
        // Revision 1
        const rev1Id = seedId("revision", `${tc.key}:1`);
        await db
          .insert(testCaseRevisions)
          .values({
            id: rev1Id,
            testCaseId,
            revisionNumber: 1,
            title: tc.title,
            description: tc.description,
            preconditions: tc.preconditions,
            expectedResult: tc.expectedResult,
            stepsSnapshot: tc.steps,
            changeSummary: "Initial version",
            changedBy: primaryUser.id,
          })
          .onConflictDoNothing();
        totalRevisions++;

        // Revision 2
        const rev2Id = seedId("revision", `${tc.key}:2`);
        await db
          .insert(testCaseRevisions)
          .values({
            id: rev2Id,
            testCaseId,
            revisionNumber: 2,
            title: tc.rev2!.title,
            description: activeDescription,
            preconditions: activePreconditions,
            expectedResult: activeExpectedResult,
            stepsSnapshot: tc.rev2!.steps,
            changeSummary: tc.rev2!.changeSummary,
            changedBy: primaryUser.id,
          })
          .onConflictDoNothing();
        totalRevisions++;
      }
    }
  }
  console.log(`  ✓ Seeded ${totalCases} Test Cases with ${totalSteps} Steps and ${totalRevisions} Revisions.`);

  // 6. Seed Test Plans & Inclusions
  console.log("\n[5/7] Seeding Test Plans...");
  let totalPlans = 0;
  let totalPlanCases = 0;

  for (const p of SEED_PROJECTS) {
    const projectId = seedId("project", p.key);

    for (const plan of p.plans) {
      const planId = seedId("plan", `${p.key}:${plan.name}`);
      const ownerId = plan.owner === "collaborator" ? collabUserId : primaryUser.id;
      const plannedStartDate = plan.plannedStartDate ? new Date(plan.plannedStartDate) : null;
      const dueDate = plan.dueDate ? new Date(plan.dueDate) : null;

      await db
        .insert(testPlans)
        .values({
          id: planId,
          projectId,
          name: plan.name,
          description: plan.description,
          scopeNotes: plan.scopeNotes,
          targetRelease: plan.targetRelease,
          environment: plan.environment,
          plannedStartDate,
          dueDate,
          status: plan.status,
          ownerId,
          createdBy: primaryUser.id,
        })
        .onConflictDoUpdate({
          target: testPlans.id,
          set: {
            description: plan.description,
            scopeNotes: plan.scopeNotes,
            targetRelease: plan.targetRelease,
            environment: plan.environment,
            plannedStartDate,
            dueDate,
            ownerId,
            status: plan.status,
            updatedAt: new Date(),
          },
        });
      totalPlans++;

      for (const caseKey of plan.caseKeys) {
        const testCaseId = seedId("test_case", caseKey);
        const planCaseId = seedId("plan_case", `${planId}:${caseKey}`);
        await db
          .insert(testPlanCases)
          .values({
            id: planCaseId,
            testPlanId: planId,
            testCaseId,
          })
          .onConflictDoNothing();
        totalPlanCases++;
      }
    }
  }
  console.log(`  ✓ Seeded ${totalPlans} Test Plans with ${totalPlanCases} scoped cases.`);

  // 7. Seed Test Runs, Snapshots & Retest Execution Attempts
  console.log("\n[6/7] Seeding Test Runs, Immutable Snapshots & Retest Attempts...");
  let totalRuns = 0;
  let totalRunCases = 0;
  let totalAttempts = 0;

  for (const p of SEED_PROJECTS) {
    const projectId = seedId("project", p.key);

    for (const run of p.runs) {
      const runId = seedId("run", `${p.key}:${run.name}`);
      const planId = run.planName
        ? seedId("plan", `${p.key}:${run.planName}`)
        : null;

      const runAssigneeId = run.assignedTo === "collaborator" ? collabUserId : primaryUser.id;
      const startedAt =
        run.status === "not_started"
          ? null
          : run.startedAtOffsetHours
          ? new Date(Date.now() - run.startedAtOffsetHours * 3600000)
          : new Date(Date.now() - 3600000 * 24);

      const completedAt =
        run.status === "completed"
          ? run.completedAtOffsetHours
            ? new Date(Date.now() - run.completedAtOffsetHours * 3600000)
            : new Date()
          : null;

      await db
        .insert(testRuns)
        .values({
          id: runId,
          projectId,
          testPlanId: planId,
          name: run.name,
          environment: run.environment,
          buildVersion: run.buildVersion,
          status: run.status,
          notes: run.notes,
          assignedTo: runAssigneeId,
          startedAt,
          completedAt,
          createdBy: primaryUser.id,
        })
        .onConflictDoUpdate({
          target: testRuns.id,
          set: {
            environment: run.environment,
            status: run.status,
            notes: run.notes,
            buildVersion: run.buildVersion,
            assignedTo: runAssigneeId,
            startedAt,
            completedAt,
            updatedAt: new Date(),
          },
        });
      totalRuns++;

      for (const rc of run.cases) {
        const testCaseId = seedId("test_case", rc.caseKey);
        const runCaseId = seedId("run_case", `${runId}:${rc.caseKey}`);

        // Find raw definition to build immutable snapshot
        const rawCase = p.testCases.find((c) => c.key === rc.caseKey);
        if (!rawCase) continue;

        // Demonstrate snapshot immutability:
        // If rc.useRev1SnapshotEvenIfCaseHasRev2 is true, freeze revision 1!
        const isRev1Freeze = rc.useRev1SnapshotEvenIfCaseHasRev2 && rawCase.rev2;
        const snapTitle = isRev1Freeze ? rawCase.title : rawCase.rev2 ? rawCase.rev2.title : rawCase.title;
        const snapPreconditions = isRev1Freeze
          ? rawCase.preconditions
          : rawCase.rev2?.preconditions || rawCase.preconditions;
        const snapSteps = isRev1Freeze ? rawCase.steps : rawCase.rev2?.steps || rawCase.steps;
        const snapExpected = isRev1Freeze
          ? rawCase.expectedResult
          : rawCase.rev2?.expectedResult || rawCase.expectedResult;
        const snapRevNumber = isRev1Freeze ? 1 : rawCase.rev2 ? 2 : 1;

        const caseExecutorId =
          rc.status !== "not_run" ? runAssigneeId : null;

        await db
          .insert(testRunCases)
          .values({
            id: runCaseId,
            testRunId: runId,
            testCaseId,
            revisionNumber: snapRevNumber,
            snapshotTitle: snapTitle,
            snapshotDescription: rawCase.description,
            snapshotPreconditions: snapPreconditions,
            snapshotSteps: snapSteps,
            snapshotExpectedResult: snapExpected,
            snapshotPriority: rawCase.priority,
            snapshotModuleName: rawCase.moduleName,
            currentStatus: rc.status,
            lastExecutedAt: rc.status !== "not_run" ? new Date() : null,
            lastExecutedBy: caseExecutorId,
          })
          .onConflictDoUpdate({
            target: testRunCases.id,
            set: {
              currentStatus: rc.status,
              snapshotTitle: snapTitle,
              snapshotSteps: snapSteps,
              lastExecutedAt: rc.status !== "not_run" ? new Date() : null,
              lastExecutedBy: caseExecutorId,
            },
          });
        totalRunCases++;

        // Insert attempts (e.g. Failed -> Passed retest audit trail)
        if (rc.attempts && rc.attempts.length > 0) {
          for (const att of rc.attempts) {
            const attemptId = seedId("attempt", `${runCaseId}:${att.attemptNumber}`);
            const attemptExecutorId =
              att.executedBy === "collaborator" ? collabUserId : primaryUser.id;

            await db
              .insert(testExecutionAttempts)
              .values({
                id: attemptId,
                testRunCaseId: runCaseId,
                attemptNumber: att.attemptNumber,
                status: att.status,
                actualResult: att.actualResult,
                durationSeconds: att.durationSeconds,
                executedBy: attemptExecutorId,
                executedAt: new Date(Date.now() - (rc.attempts.length - att.attemptNumber) * 3600000),
              })
              .onConflictDoUpdate({
                target: testExecutionAttempts.id,
                set: {
                  status: att.status,
                  actualResult: att.actualResult,
                  durationSeconds: att.durationSeconds,
                  executedBy: attemptExecutorId,
                },
              });
            totalAttempts++;
          }
        }
      }
    }
  }
  console.log(`  ✓ Seeded ${totalRuns} Test Runs, ${totalRunCases} Snapshots, and ${totalAttempts} Execution Attempts.`);

  // 8. Generate and display Summary Table
  console.log("\n[7/7] Generating Verification Summary Table...");

  interface RunSummaryRow {
    Project: string;
    "Test Plan": string;
    "Plan Cases": number;
    "Test Run": string;
    Environment: string;
    "Run Status": string;
    Passed: number;
    Failed: number;
    Blocked: number;
    Skipped: number;
    "Not Run": number;
  }

  const summaryRows: RunSummaryRow[] = [];

  const seededProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  for (const proj of seededProjects) {
    const projRuns = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.projectId, proj.id));

    for (const run of projRuns) {
      let planName = "-";
      let planCasesCount = 0;

      if (run.testPlanId) {
        const plan = await db
          .select()
          .from(testPlans)
          .where(eq(testPlans.id, run.testPlanId))
          .limit(1);

        if (plan[0]) {
          planName = plan[0].name;
          const pc = await db
            .select()
            .from(testPlanCases)
            .where(eq(testPlanCases.testPlanId, run.testPlanId));
          planCasesCount = pc.length;
        }
      }

      const runCasesList = await db
        .select()
        .from(testRunCases)
        .where(eq(testRunCases.testRunId, run.id));

      const passed = runCasesList.filter((c) => c.currentStatus === "passed").length;
      const failed = runCasesList.filter((c) => c.currentStatus === "failed").length;
      const blocked = runCasesList.filter((c) => c.currentStatus === "blocked").length;
      const skipped = runCasesList.filter((c) => c.currentStatus === "skipped").length;
      const notRun = runCasesList.filter((c) => c.currentStatus === "not_run").length;

      summaryRows.push({
        Project: `${proj.name} (${proj.key})`,
        "Test Plan": planName,
        "Plan Cases": planCasesCount,
        "Test Run": run.name,
        Environment: run.environment,
        "Run Status": run.status,
        Passed: passed,
        Failed: failed,
        Blocked: blocked,
        Skipped: skipped,
        "Not Run": notRun,
      });
    }
  }

  console.log("\n=========================================================================================================================");
  console.log("📊 TEST EXECUTION SUMMARY TABLE");
  console.log("=========================================================================================================================");
  console.table(summaryRows);

  console.log("\n=======================================================");
  console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("=======================================================");
  console.log(`  • Workspaces:         1 ('qa-demo-workspace')`);
  console.log(`  • Projects:           ${totalProjects} ('SHOP', 'LEARN', 'HELP')`);
  console.log(`  • Modules:            ${totalModules} (with sub-module hierarchies)`);
  console.log(`  • Test Cases:         ${totalCases} (titles, steps, types, tags)`);
  console.log(`  • Revisions Seeded:   ${totalRevisions} (immutable history v1 -> v2)`);
  console.log(`  • Test Plans:         ${totalPlans}`);
  console.log(`  • Test Runs:          ${totalRuns} (completed, in-progress, not_started)`);
  console.log(`  • Snapshotted Cases:  ${totalRunCases} (frozen v1 snapshots)`);
  console.log(`  • Execution Attempts: ${totalAttempts} (append-only retest trails)`);
  console.log("=======================================================\n");
}

runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Seeder execution failed:", err);
    process.exit(1);
  });
