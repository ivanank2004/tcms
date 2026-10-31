import { pgTable, text, varchar, timestamp, uniqueIndex, index, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
]);

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("workspaces_owner_id_idx").on(table.ownerId),
]);

export const workspaceMembers = pgTable("workspace_members", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 32 }).notNull().default("member"), // 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workspace_members_workspace_user_idx").on(table.workspaceId, table.userId),
  index("workspace_members_user_id_idx").on(table.userId),
]);

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  key: varchar("key", { length: 16 }).notNull(), // Unique per workspace e.g. "APP"
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // 'active' | 'archived'
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("projects_workspace_key_idx").on(table.workspaceId, table.key),
  index("projects_workspace_id_idx").on(table.workspaceId),
  index("projects_status_idx").on(table.status),
]);

export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentModuleId: text("parent_module_id"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // 'active' | 'archived'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("modules_project_name_idx").on(table.projectId, table.name),
  index("modules_project_id_idx").on(table.projectId),
  index("modules_parent_module_idx").on(table.parentModuleId),
  index("modules_status_idx").on(table.status),
]);

export const testCases = pgTable("test_cases", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  moduleId: text("module_id")
    .references(() => modules.id, { onDelete: "set null" }),
  stableId: varchar("stable_id", { length: 32 }).notNull(), // e.g. "APP-001"
  sequenceNumber: integer("sequence_number").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  preconditions: text("preconditions"),
  expectedResult: text("expected_result"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // 'critical' | 'high' | 'medium' | 'low'
  lifecycle: varchar("lifecycle", { length: 20 }).notNull().default("draft"), // 'draft' | 'ready' | 'deprecated'
  testTypes: text("test_types").array().notNull().default([]), // Multi-label taxonomy
  tags: text("tags").array().notNull().default([]),
  ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
  revision: integer("revision").notNull().default(1),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("test_cases_project_stable_id_idx").on(table.projectId, table.stableId),
  uniqueIndex("test_cases_project_sequence_idx").on(table.projectId, table.sequenceNumber),
  index("test_cases_project_id_idx").on(table.projectId),
  index("test_cases_module_id_idx").on(table.moduleId),
  index("test_cases_lifecycle_idx").on(table.lifecycle),
  index("test_cases_priority_idx").on(table.priority),
]);

export const testCaseSteps = pgTable("test_case_steps", {
  id: text("id").primaryKey(),
  testCaseId: text("test_case_id")
    .notNull()
    .references(() => testCases.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  instruction: text("instruction").notNull(),
  expectedResult: text("expected_result"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("test_case_steps_case_order_idx").on(table.testCaseId, table.stepNumber),
  index("test_case_steps_case_id_idx").on(table.testCaseId),
]);

export interface StepSnapshot {
  stepNumber: number;
  instruction: string;
  expectedResult?: string | null;
}

export const testCaseRevisions = pgTable("test_case_revisions", {
  id: text("id").primaryKey(),
  testCaseId: text("test_case_id")
    .notNull()
    .references(() => testCases.id, { onDelete: "cascade" }),
  revisionNumber: integer("revision_number").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  preconditions: text("preconditions"),
  expectedResult: text("expected_result"),
  stepsSnapshot: jsonb("steps_snapshot").notNull(), // StepSnapshot[]
  changeSummary: text("change_summary"),
  changedBy: text("changed_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("test_case_revisions_case_rev_idx").on(table.testCaseId, table.revisionNumber),
  index("test_case_revisions_case_id_idx").on(table.testCaseId),
]);

export const testPlans = pgTable("test_plans", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  scopeNotes: text("scope_notes"),
  targetRelease: varchar("target_release", { length: 100 }),
  environment: varchar("environment", { length: 50 }),
  plannedStartDate: timestamp("planned_start_date", { withTimezone: true }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // 'draft' | 'active' | 'completed' | 'archived'
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("test_plans_project_id_idx").on(table.projectId),
  index("test_plans_status_idx").on(table.status),
]);

export const testPlanCases = pgTable("test_plan_cases", {
  id: text("id").primaryKey(),
  testPlanId: text("test_plan_id")
    .notNull()
    .references(() => testPlans.id, { onDelete: "cascade" }),
  testCaseId: text("test_case_id")
    .notNull()
    .references(() => testCases.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("test_plan_cases_plan_case_idx").on(table.testPlanId, table.testCaseId),
  index("test_plan_cases_plan_id_idx").on(table.testPlanId),
  index("test_plan_cases_case_id_idx").on(table.testCaseId),
]);

export const testRuns = pgTable("test_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  testPlanId: text("test_plan_id").references(() => testPlans.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  environment: varchar("environment", { length: 50 }).notNull().default("staging"),
  buildVersion: varchar("build_version", { length: 100 }),
  assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("not_started"), // 'not_started' | 'in_progress' | 'completed' | 'aborted'
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("test_runs_project_id_idx").on(table.projectId),
  index("test_runs_plan_id_idx").on(table.testPlanId),
  index("test_runs_status_idx").on(table.status),
]);

export const testRunCases = pgTable("test_run_cases", {
  id: text("id").primaryKey(),
  testRunId: text("test_run_id")
    .notNull()
    .references(() => testRuns.id, { onDelete: "cascade" }),
  testCaseId: text("test_case_id")
    .notNull()
    .references(() => testCases.id, { onDelete: "restrict" }),
  revisionNumber: integer("revision_number").notNull(),
  snapshotTitle: varchar("snapshot_title", { length: 500 }).notNull(),
  snapshotDescription: text("snapshot_description"),
  snapshotPreconditions: text("snapshot_preconditions"),
  snapshotSteps: jsonb("snapshot_steps").notNull(), // StepSnapshot[]
  snapshotExpectedResult: text("snapshot_expected_result"),
  snapshotPriority: varchar("snapshot_priority", { length: 20 }).notNull(),
  snapshotModuleName: varchar("snapshot_module_name", { length: 255 }),
  currentStatus: varchar("current_status", { length: 20 }).notNull().default("not_run"), // 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped'
  lastExecutedAt: timestamp("last_executed_at", { withTimezone: true }),
  lastExecutedBy: text("last_executed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("test_run_cases_run_case_idx").on(table.testRunId, table.testCaseId),
  index("test_run_cases_run_id_idx").on(table.testRunId),
  index("test_run_cases_case_id_idx").on(table.testCaseId),
  index("test_run_cases_status_idx").on(table.currentStatus),
]);

export const testExecutionAttempts = pgTable("test_execution_attempts", {
  id: text("id").primaryKey(),
  testRunCaseId: text("test_run_case_id")
    .notNull()
    .references(() => testRunCases.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // 'passed' | 'failed' | 'blocked' | 'skipped'
  actualResult: text("actual_result"),
  durationSeconds: integer("duration_seconds"),
  executedBy: text("executed_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("test_execution_attempts_case_attempt_idx").on(table.testRunCaseId, table.attemptNumber),
  index("test_execution_attempts_case_id_idx").on(table.testRunCaseId),
  index("test_execution_attempts_status_idx").on(table.status),
]);

// Relational mappings
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers),
  ownedWorkspaces: many(workspaces),
  sessions: many(sessions),
  createdProjects: many(projects),
  createdTestCases: many(testCases, { relationName: "testCaseCreator" }),
  ownedTestCases: many(testCases, { relationName: "testCaseOwner" }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  projects: many(projects),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  modules: many(modules),
  testCases: many(testCases),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  project: one(projects, {
    fields: [modules.projectId],
    references: [projects.id],
  }),
  parent: one(modules, {
    fields: [modules.parentModuleId],
    references: [modules.id],
    relationName: "subModules",
  }),
  children: many(modules, {
    relationName: "subModules",
  }),
  testCases: many(testCases),
}));

export const testCasesRelations = relations(testCases, ({ one, many }) => ({
  project: one(projects, {
    fields: [testCases.projectId],
    references: [projects.id],
  }),
  module: one(modules, {
    fields: [testCases.moduleId],
    references: [modules.id],
  }),
  creator: one(users, {
    fields: [testCases.createdBy],
    references: [users.id],
    relationName: "testCaseCreator",
  }),
  owner: one(users, {
    fields: [testCases.ownerId],
    references: [users.id],
    relationName: "testCaseOwner",
  }),
  steps: many(testCaseSteps),
  revisions: many(testCaseRevisions),
}));

export const testCaseStepsRelations = relations(testCaseSteps, ({ one }) => ({
  testCase: one(testCases, {
    fields: [testCaseSteps.testCaseId],
    references: [testCases.id],
  }),
}));

export const testCaseRevisionsRelations = relations(testCaseRevisions, ({ one }) => ({
  testCase: one(testCases, {
    fields: [testCaseRevisions.testCaseId],
    references: [testCases.id],
  }),
  changer: one(users, {
    fields: [testCaseRevisions.changedBy],
    references: [users.id],
  }),
}));

export const testPlansRelations = relations(testPlans, ({ one, many }) => ({
  project: one(projects, {
    fields: [testPlans.projectId],
    references: [projects.id],
  }),
  owner: one(users, {
    fields: [testPlans.ownerId],
    references: [users.id],
    relationName: "testPlanOwner",
  }),
  creator: one(users, {
    fields: [testPlans.createdBy],
    references: [users.id],
    relationName: "testPlanCreator",
  }),
  planCases: many(testPlanCases),
  runs: many(testRuns),
}));

export const testPlanCasesRelations = relations(testPlanCases, ({ one }) => ({
  plan: one(testPlans, {
    fields: [testPlanCases.testPlanId],
    references: [testPlans.id],
  }),
  testCase: one(testCases, {
    fields: [testPlanCases.testCaseId],
    references: [testCases.id],
  }),
}));

export const testRunsRelations = relations(testRuns, ({ one, many }) => ({
  project: one(projects, {
    fields: [testRuns.projectId],
    references: [projects.id],
  }),
  testPlan: one(testPlans, {
    fields: [testRuns.testPlanId],
    references: [testPlans.id],
  }),
  assignee: one(users, {
    fields: [testRuns.assignedTo],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [testRuns.createdBy],
    references: [users.id],
  }),
  runCases: many(testRunCases),
}));

export const testRunCasesRelations = relations(testRunCases, ({ one, many }) => ({
  run: one(testRuns, {
    fields: [testRunCases.testRunId],
    references: [testRuns.id],
  }),
  testCase: one(testCases, {
    fields: [testRunCases.testCaseId],
    references: [testCases.id],
  }),
  executor: one(users, {
    fields: [testRunCases.lastExecutedBy],
    references: [users.id],
  }),
  attempts: many(testExecutionAttempts),
}));

export const testExecutionAttemptsRelations = relations(testExecutionAttempts, ({ one }) => ({
  runCase: one(testRunCases, {
    fields: [testExecutionAttempts.testRunCaseId],
    references: [testRunCases.id],
  }),
  executor: one(users, {
    fields: [testExecutionAttempts.executedBy],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;
export type TestCaseStep = typeof testCaseSteps.$inferSelect;
export type NewTestCaseStep = typeof testCaseSteps.$inferInsert;
export type TestCaseRevision = typeof testCaseRevisions.$inferSelect;
export type NewTestCaseRevision = typeof testCaseRevisions.$inferInsert;
export type TestPlan = typeof testPlans.$inferSelect;
export type NewTestPlan = typeof testPlans.$inferInsert;
export type TestPlanCase = typeof testPlanCases.$inferSelect;
export type NewTestPlanCase = typeof testPlanCases.$inferInsert;
export type TestRun = typeof testRuns.$inferSelect;
export type NewTestRun = typeof testRuns.$inferInsert;
export type TestRunCase = typeof testRunCases.$inferSelect;
export type NewTestRunCase = typeof testRunCases.$inferInsert;
export type TestExecutionAttempt = typeof testExecutionAttempts.$inferSelect;
export type NewTestExecutionAttempt = typeof testExecutionAttempts.$inferInsert;
