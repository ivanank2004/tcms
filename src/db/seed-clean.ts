import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.WS_NO_BUFFER_UTIL) {
  process.env.WS_NO_BUFFER_UTIL = "1";
}

import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

async function runClean() {
  console.log("=== QA Workspace: Seed Cleanup ===");

  const targetSlug = "qa-demo-workspace";
  const matched = await db
    .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.slug, targetSlug));

  if (matched.length === 0) {
    console.log(`  ℹ No seed workspace with slug '${targetSlug}' found. Nothing to clean.`);
    return;
  }

  const ws = matched[0];
  console.log(`  Deleting seed workspace: '${ws.name}' (ID: ${ws.id})...`);

  // Deleting workspace cascades to workspaceMembers, projects, modules, testCases, steps, revisions, plans, runs, attempts
  await db.delete(workspaces).where(eq(workspaces.id, ws.id));

  console.log("  ✓ Seed workspace and all associated cascaded entities successfully deleted.");
}

runClean()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
  });
