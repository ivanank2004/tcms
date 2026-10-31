"use server";

import { db } from "@/db";
import {
  testCases,
  testCaseSteps,
  testCaseRevisions,
  projects,
  modules,
  type StepSnapshot,
} from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import { PRIORITIES, LIFECYCLES, type Priority, type Lifecycle } from "./taxonomy";

// Helper to escape CSV cell according to RFC 4180
function escapeCSV(val: string | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Robust CSV parser supporting quotes, commas, and multi-line fields
function parseCSVLines(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField);
        lines.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField);
        lines.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    lines.push(currentRow);
  }

  return lines.filter((row) => row.some((cell) => cell.trim().length > 0));
}

export async function exportTestCasesToCSV(projectId: string): Promise<string> {
  const cases = await db
    .select({
      testCase: testCases,
      moduleName: modules.name,
    })
    .from(testCases)
    .leftJoin(modules, eq(testCases.moduleId, modules.id))
    .where(eq(testCases.projectId, projectId))
    .orderBy(asc(testCases.sequenceNumber));

  const allSteps = await db
    .select()
    .from(testCaseSteps)
    .orderBy(asc(testCaseSteps.stepNumber));

  const stepsByCaseId = new Map<string, typeof allSteps>();
  for (const s of allSteps) {
    if (!stepsByCaseId.has(s.testCaseId)) {
      stepsByCaseId.set(s.testCaseId, []);
    }
    stepsByCaseId.get(s.testCaseId)!.push(s);
  }

  const headers = [
    "Stable ID",
    "Title",
    "Module",
    "Preconditions",
    "Steps",
    "Expected Result",
    "Priority",
    "Test Types",
    "Tags",
    "Lifecycle",
  ];

  const rows = cases.map(({ testCase: tc, moduleName }) => {
    const steps = stepsByCaseId.get(tc.id) || [];
    const formattedSteps = steps
      .map(
        (s) =>
          `${s.stepNumber}. ${s.instruction}${s.expectedResult ? ` | Expected: ${s.expectedResult}` : ""}`
      )
      .join("\n");

    return [
      escapeCSV(tc.stableId),
      escapeCSV(tc.title),
      escapeCSV(moduleName || ""),
      escapeCSV(tc.preconditions || ""),
      escapeCSV(formattedSteps),
      escapeCSV(tc.expectedResult || ""),
      escapeCSV(tc.priority),
      escapeCSV(tc.testTypes.join("; ")),
      escapeCSV(tc.tags.join("; ")),
      escapeCSV(tc.lifecycle),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

export interface CSVRowError {
  rowNumber: number;
  message: string;
}

export interface ValidatedCSVRow {
  title: string;
  moduleName?: string;
  preconditions?: string;
  steps: { instruction: string; expectedResult?: string }[];
  expectedResult?: string;
  priority: Priority;
  testTypes: string[];
  tags: string[];
  lifecycle: Lifecycle;
}

export interface CSVValidationResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  validRows: ValidatedCSVRow[];
  errors: CSVRowError[];
}

export async function parseAndValidateCSV(
  projectId: string,
  csvText: string
): Promise<CSVValidationResult> {
  const maxRows = 500;
  const rawRows = parseCSVLines(csvText);

  if (rawRows.length < 2) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 1,
      validRows: [],
      errors: [{ rowNumber: 1, message: "CSV file is empty or missing data rows." }],
    };
  }

  const headerRow = rawRows[0].map((h) => h.trim().toLowerCase());
  const titleIdx = headerRow.findIndex((h) => h === "title");
  const moduleIdx = headerRow.findIndex((h) => h === "module");
  const precondIdx = headerRow.findIndex((h) => h === "preconditions");
  const stepsIdx = headerRow.findIndex((h) => h === "steps");
  const expectedIdx = headerRow.findIndex((h) => h === "expected result" || h === "expected_result");
  const priorityIdx = headerRow.findIndex((h) => h === "priority");
  const typesIdx = headerRow.findIndex((h) => h === "test types" || h === "types");
  const tagsIdx = headerRow.findIndex((h) => h === "tags");
  const lifecycleIdx = headerRow.findIndex((h) => h === "lifecycle" || h === "status");

  if (titleIdx === -1) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 1,
      validRows: [],
      errors: [{ rowNumber: 1, message: "Required header 'Title' was not found in CSV." }],
    };
  }

  const dataRows = rawRows.slice(1, maxRows + 1);
  const errors: CSVRowError[] = [];
  const validRows: ValidatedCSVRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2; // Row number in file
    const cells = dataRows[i];

    const title = cells[titleIdx]?.trim() || "";
    if (!title || title.length < 3) {
      errors.push({ rowNumber: rowNum, message: "Title is required and must be at least 3 characters." });
      continue;
    }

    const rawPriority = priorityIdx !== -1 ? cells[priorityIdx]?.trim().toLowerCase() : "medium";
    const priority: Priority = PRIORITIES.includes(rawPriority as any) ? (rawPriority as Priority) : "medium";

    const rawLifecycle = lifecycleIdx !== -1 ? cells[lifecycleIdx]?.trim().toLowerCase() : "draft";
    const lifecycle: Lifecycle = LIFECYCLES.includes(rawLifecycle as any)
      ? (rawLifecycle as Lifecycle)
      : "draft";

    const preconditions = precondIdx !== -1 ? cells[precondIdx]?.trim() : "";
    const expectedResult = expectedIdx !== -1 ? cells[expectedIdx]?.trim() : "";

    // Parse steps
    const rawStepsStr = stepsIdx !== -1 ? cells[stepsIdx]?.trim() : "";
    const steps: { instruction: string; expectedResult?: string }[] = [];

    if (rawStepsStr) {
      const stepLines = rawStepsStr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of stepLines) {
        // Strip leading numbers like "1.", "1 -", etc.
        const cleaned = line.replace(/^\d+[\.\-\)]\s*/, "");
        if (cleaned.includes("| Expected:")) {
          const [inst, exp] = cleaned.split("| Expected:");
          steps.push({ instruction: inst.trim(), expectedResult: exp.trim() });
        } else if (cleaned.includes("|")) {
          const [inst, exp] = cleaned.split("|");
          steps.push({ instruction: inst.trim(), expectedResult: exp.trim() });
        } else {
          steps.push({ instruction: cleaned });
        }
      }
    }

    if (lifecycle === "ready") {
      if (!expectedResult) {
        errors.push({ rowNumber: rowNum, message: "Ready test cases require an Expected Result." });
        continue;
      }
      if (steps.length === 0) {
        errors.push({ rowNumber: rowNum, message: "Ready test cases require at least 1 test step." });
        continue;
      }
    }

    const testTypes =
      typesIdx !== -1 && cells[typesIdx]
        ? cells[typesIdx].split(/[;,]/).map((t) => t.trim()).filter(Boolean)
        : [];

    const tags =
      tagsIdx !== -1 && cells[tagsIdx]
        ? cells[tagsIdx].split(/[;,]/).map((t) => t.trim()).filter(Boolean)
        : [];

    validRows.push({
      title,
      moduleName: moduleIdx !== -1 ? cells[moduleIdx]?.trim() : undefined,
      preconditions: preconditions || undefined,
      expectedResult: expectedResult || undefined,
      steps,
      priority,
      testTypes,
      tags,
      lifecycle,
    });
  }

  return {
    totalRows: dataRows.length,
    validCount: validRows.length,
    errorCount: errors.length,
    validRows,
    errors,
  };
}

export async function commitCSVImportAction(
  workspaceId: string,
  projectId: string,
  rows: ValidatedCSVRow[]
) {
  if (!rows.length) return { error: "No valid rows to import." };

  try {
    const { user, project } = await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    if (project.status === "archived") {
      return { error: "Cannot import test cases into an archived project." };
    }

    // Cache existing modules to resolve moduleName to moduleId
    const existingModules = await db
      .select({ id: modules.id, name: modules.name })
      .from(modules)
      .where(eq(modules.projectId, projectId));

    const moduleMap = new Map(existingModules.map((m) => [m.name.toLowerCase(), m.id]));

    await db.transaction(async (tx) => {
      // Get current max sequence
      const [seqResult] = await tx
        .select({
          maxSeq: sql<number>`COALESCE(MAX(${testCases.sequenceNumber}), 0)`,
        })
        .from(testCases)
        .where(eq(testCases.projectId, projectId));

      let currentSeq = Number(seqResult?.maxSeq || 0);

      for (const row of rows) {
        currentSeq++;
        const testCaseId = crypto.randomUUID();
        const stableId = `${project.key}-${String(currentSeq).padStart(3, "0")}`;

        let targetModuleId: string | null = null;
        if (row.moduleName && moduleMap.has(row.moduleName.toLowerCase())) {
          targetModuleId = moduleMap.get(row.moduleName.toLowerCase())!;
        }

        await tx.insert(testCases).values({
          id: testCaseId,
          projectId,
          moduleId: targetModuleId,
          stableId,
          sequenceNumber: currentSeq,
          title: row.title,
          preconditions: row.preconditions || null,
          expectedResult: row.expectedResult || null,
          priority: row.priority,
          lifecycle: row.lifecycle,
          testTypes: row.testTypes,
          tags: row.tags,
          revision: 1,
          createdBy: user.id,
          updatedBy: user.id,
        });

        if (row.steps.length > 0) {
          await tx.insert(testCaseSteps).values(
            row.steps.map((s, idx) => ({
              id: crypto.randomUUID(),
              testCaseId,
              stepNumber: idx + 1,
              instruction: s.instruction,
              expectedResult: s.expectedResult || null,
            }))
          );
        }

        const stepsSnapshot: StepSnapshot[] = row.steps.map((s, idx) => ({
          stepNumber: idx + 1,
          instruction: s.instruction,
          expectedResult: s.expectedResult || null,
        }));

        await tx.insert(testCaseRevisions).values({
          id: crypto.randomUUID(),
          testCaseId,
          revisionNumber: 1,
          title: row.title,
          preconditions: row.preconditions || null,
          expectedResult: row.expectedResult || null,
          stepsSnapshot,
          changeSummary: "Imported via CSV",
          changedBy: user.id,
        });
      }
    });

    revalidatePath(`/workspaces`);
    return { success: true, count: rows.length };
  } catch (error: any) {
    return { error: error.message || "Failed to commit CSV import" };
  }
}
