"use server";

import { z } from "zod";
import { db } from "@/db";
import { projects, type Project } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireWorkspaceMembership, requireProjectAccess } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";

const CreateProjectSchema = z.object({
  workspaceId: z.string().min(1, "Workspace is required"),
  name: z.string().trim().min(2, "Project name must be at least 2 characters"),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Project key must be at least 2 characters")
    .max(10, "Project key must be at most 10 characters")
    .regex(/^[A-Z0-9-]+$/, "Key must only contain uppercase letters, numbers, and hyphens"),
  description: z.string().trim().max(1000).optional(),
});

const UpdateProjectSchema = z.object({
  workspaceId: z.string().min(1, "Workspace is required"),
  projectId: z.string().min(1, "Project is required"),
  name: z.string().trim().min(2, "Project name must be at least 2 characters"),
  description: z.string().trim().max(1000).optional(),
});

export type ProjectActionResult = {
  error?: string;
  success?: boolean;
  project?: Project;
};

export async function createProjectAction(
  prevState: ProjectActionResult | null,
  formData: FormData
): Promise<ProjectActionResult> {
  const workspaceId = formData.get("workspaceId")?.toString() || "";
  const name = formData.get("name")?.toString() || "";
  const rawKey = formData.get("key")?.toString() || "";
  const description = formData.get("description")?.toString() || "";

  const parsed = CreateProjectSchema.safeParse({
    workspaceId,
    name,
    key: rawKey.toUpperCase(),
    description,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid project input" };
  }

  try {
    // Owner, Admin, and Member can create projects; Viewer is blocked
    const { user } = await requireWorkspaceMembership(workspaceId, ["owner", "admin", "member"]);

    // Check project key uniqueness within workspace
    const [existingKey] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.key, parsed.data.key)))
      .limit(1);

    if (existingKey) {
      return { error: `Project key "${parsed.data.key}" is already in use in this workspace. Please choose a unique key.` };
    }

    const projectId = crypto.randomUUID();

    const [newProject] = await db
      .insert(projects)
      .values({
        id: projectId,
        workspaceId,
        name: parsed.data.name,
        key: parsed.data.key,
        description: parsed.data.description || null,
        status: "active",
        createdBy: user.id,
      })
      .returning();

    revalidatePath(`/workspaces`);
    return { success: true, project: newProject };
  } catch (error: any) {
    console.error("Create project error:", error);
    return { error: error.message || "Failed to create project" };
  }
}

export async function updateProjectAction(
  prevState: ProjectActionResult | null,
  formData: FormData
): Promise<ProjectActionResult> {
  const workspaceId = formData.get("workspaceId")?.toString() || "";
  const projectId = formData.get("projectId")?.toString() || "";
  const name = formData.get("name")?.toString() || "";
  const description = formData.get("description")?.toString() || "";

  const parsed = UpdateProjectSchema.safeParse({ workspaceId, projectId, name, description });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const { project } = await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    if (project.status === "archived") {
      return { error: "Cannot edit an archived project. Restore it first." };
    }

    const [updated] = await db
      .update(projects)
      .set({
        name: parsed.data.name,
        description: parsed.data.description || null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    revalidatePath(`/workspaces`);
    return { success: true, project: updated };
  } catch (error: any) {
    return { error: error.message || "Failed to update project" };
  }
}

export async function archiveProjectAction(workspaceId: string, projectId: string) {
  try {
    await requireProjectAccess(workspaceId, projectId, ["owner", "admin"]);

    await db
      .update(projects)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to archive project" };
  }
}

export async function restoreProjectAction(workspaceId: string, projectId: string) {
  try {
    await requireProjectAccess(workspaceId, projectId, ["owner", "admin"]);

    await db
      .update(projects)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to restore project" };
  }
}

export async function getWorkspaceProjects(workspaceId: string) {
  return await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectByKey(workspaceId: string, key: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), eq(projects.key, key.toUpperCase())))
    .limit(1);

  return project || null;
}
