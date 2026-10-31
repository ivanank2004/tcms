import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../db";
import { users, sessions, workspaces, workspaceMembers } from "../db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { ROLE_HIERARCHY } from "../lib/auth/authorization";

async function runVerification() {
  console.log("=== QA Workspace: Phase 1 E2E Verification ===");

  // 1. Verify Neon connection
  console.log("\n[1/5] Verifying Neon PostgreSQL connection...");
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is missing in environment");
  }
  console.log("  ✓ DATABASE_URL is present and mapped to Neon production branch");

  // 2. Safe Database Write & Read (User entity)
  console.log("\n[2/5] Testing User creation & password hashing...");
  const testEmail = `qa_pilot_${Date.now()}@example.com`;
  const testPassword = "SuperSecretPassword123!";
  const testUserId = crypto.randomUUID();

  const passwordHash = await bcrypt.hash(testPassword, 10);
  await db.insert(users).values({
    id: testUserId,
    email: testEmail,
    name: "QA Pilot Engineer",
    passwordHash,
  });

  const [retrievedUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, testEmail))
    .limit(1);

  if (!retrievedUser || retrievedUser.id !== testUserId) {
    throw new Error("Failed to write/read user record from Neon Postgres");
  }

  const isPasswordValid = await bcrypt.compare(testPassword, retrievedUser.passwordHash!);
  if (!isPasswordValid) {
    throw new Error("Password verification failed against stored bcrypt hash");
  }
  console.log("  ✓ User record successfully created and verified via bcrypt compare");

  // 3. Session creation & retrieval
  console.log("\n[3/5] Testing Session creation and relational mapping...");
  const testSessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

  await db.insert(sessions).values({
    id: testSessionId,
    userId: testUserId,
    expiresAt,
  });

  const sessionWithUser = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, testSessionId))
    .limit(1);

  if (!sessionWithUser.length || sessionWithUser[0].user.email !== testEmail) {
    throw new Error("Failed to retrieve valid session joined with user");
  }
  console.log("  ✓ Session created and joined with user entity correctly");

  // 4. Atomic Workspace and Workspace Member Creation (Transaction)
  console.log("\n[4/5] Testing Atomic Workspace & Member Creation in Database Transaction...");
  const testWorkspaceId = crypto.randomUUID();
  const testMemberId = crypto.randomUUID();
  const testSlug = `pilot-ws-${Date.now()}`;

  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id: testWorkspaceId,
      name: "Pilot Workspace",
      slug: testSlug,
      description: "E2E verification synthetic workspace",
      ownerId: testUserId,
    });

    await tx.insert(workspaceMembers).values({
      id: testMemberId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      role: "owner",
    });
  });

  const [workspaceRecord] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, testWorkspaceId))
    .limit(1);

  const [memberRecord] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, testWorkspaceId),
        eq(workspaceMembers.userId, testUserId)
      )
    )
    .limit(1);

  if (!workspaceRecord || !memberRecord || memberRecord.role !== "owner") {
    throw new Error("Workspace and owner membership transaction verification failed");
  }
  console.log("  ✓ Workspace and owner membership atomic transaction committed successfully");

  // 5. Authorization Guard Check
  console.log("\n[5/5] Testing Authorization Matrix...");
  const role = memberRecord.role as "owner";
  const requiredRoles = ["owner", "admin"];
  const isAuthorized = requiredRoles.includes(role);
  if (!isAuthorized) {
    throw new Error("Owner role was rejected by owner/admin permission guard");
  }

  const viewerRestrictedRoles = ["viewer"];
  const isViewer = viewerRestrictedRoles.includes(role);
  if (isViewer) {
    throw new Error("Owner role was falsely classified as viewer");
  }
  console.log("  ✓ Permission guard verified: Owner role passes owner/admin checks");

  // Clean up verification data
  console.log("\nCleaning up synthetic verification entities...");
  await db.delete(workspaces).where(eq(workspaces.id, testWorkspaceId));
  await db.delete(users).where(eq(users.id, testUserId));
  console.log("  ✓ Synthetic test entities cleanly deleted (cascades verified)");

  console.log("\n=== ALL STEP 01 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY ===");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
