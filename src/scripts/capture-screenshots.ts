import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.WS_NO_BUFFER_UTIL) {
  process.env.WS_NO_BUFFER_UTIL = "1";
}

import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import { db } from "@/db";
import { users, sessions, workspaces, projects, testCases, testPlans, testRuns } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function run() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Get primary user (tcms@example.com)
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, "tcms@example.com"))
    .limit(1);

  if (!user || user.length === 0) {
    throw new Error("User tcms@example.com not found!");
  }

  const userId = user[0].id;

  // 2. Create a fresh session
  const sessionId = "screenshot-session-" + Date.now();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  console.log("✓ Created screenshot session:", sessionId);

  // 3. Find IDs for specific key entities
  const ws = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, "qa-demo-workspace"))
    .limit(1);

  const shopProject = await db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, ws[0].id), eq(projects.key, "SHOP")))
    .limit(1);

  const shop002Case = await db
    .select()
    .from(testCases)
    .where(and(eq(testCases.projectId, shopProject[0].id), eq(testCases.stableId, "SHOP-002")))
    .limit(1);

  const sanityPlan = await db
    .select()
    .from(testPlans)
    .where(and(eq(testPlans.projectId, shopProject[0].id), eq(testPlans.name, "Release 2.4.0 Sanity Suite")))
    .limit(1);

  const regressionRun = await db
    .select()
    .from(testRuns)
    .where(and(eq(testRuns.projectId, shopProject[0].id), eq(testRuns.name, "Sprint 48 Regression Run")))
    .limit(1);

  const pciRun = await db
    .select()
    .from(testRuns)
    .where(and(eq(testRuns.projectId, shopProject[0].id), eq(testRuns.name, "PCI-DSS Compliance Run")))
    .limit(1);

  // 4. Launch Puppeteer
  const chromePath = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  console.log("✓ Using browser:", chromePath);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1440,920",
    ],
    defaultViewport: {
      width: 1440,
      height: 920,
      deviceScaleFactor: 2,
    },
  });

  const page = await browser.newPage();

  // Helper to set cookie
  const setAuthCookie = async () => {
    await page.setCookie({
      name: "qa_session",
      value: sessionId,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
    });
  };

  const clearAuthCookie = async () => {
    await page.deleteCookie({ name: "qa_session", domain: "localhost", path: "/" });
  };

  const capture = async (name: string, url: string, authenticated: boolean = true) => {
    console.log(`Capturing [${name}] -> ${url}...`);
    if (authenticated) {
      await setAuthCookie();
    } else {
      await clearAuthCookie();
    }

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    // Small delay for any animations or client components
    await new Promise((r) => setTimeout(r, 1000));

    const outputPath = path.join(screenshotsDir, `${name}.png`);
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(`  ✓ Saved: ${outputPath}`);
  };

  try {
    // 1. Login Page
    await capture("01-login-portal", "http://localhost:3000/login", false);

    // 2. Executive Dashboard Overview
    await capture("02-dashboard-overview", "http://localhost:3000/dashboard", true);

    // 3. Workspace Detail (QA Demo Workspace with projects & members)
    await capture("03-workspace-projects", "http://localhost:3000/workspaces/qa-demo-workspace", true);

    // 4. Project Repository (SHOP) with Module Hierarchy & Case List
    await capture("04-project-repository", "http://localhost:3000/workspaces/qa-demo-workspace/projects/SHOP", true);

    // 5. Test Case Detail with Revision History (SHOP-002)
    if (shop002Case[0]) {
      await capture(
        "05-test-case-revisions",
        `http://localhost:3000/workspaces/qa-demo-workspace/projects/SHOP/test-cases/${shop002Case[0].id}`,
        true
      );
    }

    // 6. Test Plans Dashboard
    await capture("06-test-plans-dashboard", "http://localhost:3000/workspaces/qa-demo-workspace/projects/SHOP/test-plans", true);

    // 7. Test Plan Detail
    if (sanityPlan[0]) {
      await capture(
        "07-test-plan-detail",
        `http://localhost:3000/workspaces/qa-demo-workspace/projects/SHOP/test-plans/${sanityPlan[0].id}`,
        true
      );
    }

    // 8. Test Runs List
    await capture("08-test-runs-list", "http://localhost:3000/workspaces/qa-demo-workspace/projects/SHOP/test-runs", true);

    // 9. Test Run Execution Runner with Retest History & Execution Attempts
    if (regressionRun[0]) {
      await capture(
        "09-test-execution-runner",
        `http://localhost:3000/workspaces/qa-demo-workspace/projects/SHOP/test-runs/${regressionRun[0].id}`,
        true
      );
    }

    // 10. Completed 100% Passed Run
    if (pciRun[0]) {
      await capture(
        "10-completed-pci-run",
        `http://localhost:3000/workspaces/qa-demo-workspace/projects/SHOP/test-runs/${pciRun[0].id}`,
        true
      );
    }

    console.log("\n🎉 All 10 screenshots captured successfully!");
  } finally {
    await browser.close();
    // Clean up temporary session
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Screenshot capture failed:", err);
    process.exit(1);
  });
