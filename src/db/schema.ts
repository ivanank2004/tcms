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
