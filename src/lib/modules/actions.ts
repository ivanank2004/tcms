"use server";

import { z } from "zod";
import { db } from "@/db";
import { modules, type Module } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";

const CreateModuleSchema = z.object({
  workspaceId: z.string().min(1, "Workspace is required"),
  projectId: z.string().min(1, "Project is required"),
  name: z.string().trim().min(2, "Module name must be at least 2 characters"),
  description: z.string().trim().max(1000).optional(),
  parentModuleId: z.string().optional().or(z.literal("")),
});

const UpdateModuleSchema = z.object({
  workspaceId: z.string().min(1, "Workspace is required"),
  projectId: z.string().min(1, "Project is required"),
  moduleId: z.string().min(1, "Module is required"),
  name: z.string().trim().min(2, "Module name must be at least 2 characters"),
  description: z.string().trim().max(1000).optional(),
  parentModuleId: z.string().optional().or(z.literal("")),
});

export type ModuleActionResult = {
  error?: string;
  success?: boolean;
  module?: Module;
};

export async function createModuleAction(
  prevState: ModuleActionResult | null,
  formData: FormData
): Promise<ModuleActionResult> {
  const workspaceId = formData.get("workspaceId")?.toString() || "";
  const projectId = formData.get("projectId")?.toString() || "";
  const name = formData.get("name")?.toString() || "";
  const description = formData.get("description")?.toString() || "";
  const parentModuleId = formData.get("parentModuleId")?.toString() || "";

  const parsed = CreateModuleSchema.safeParse({
    workspaceId,
    projectId,
    name,
    description,
    parentModuleId,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid module input" };
  }

  try {
    const { project } = await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    if (project.status === "archived") {
      return { error: "Cannot add modules to an archived project. Restore the project first." };
    }

    // Verify parent module belongs to the same project if specified
    const finalParentId = parsed.data.parentModuleId || null;
    if (finalParentId) {
      const [parentModule] = await db
        .select({ id: modules.id, parentModuleId: modules.parentModuleId })
        .from(modules)
        .where(and(eq(modules.id, finalParentId), eq(modules.projectId, projectId)))
        .limit(1);

      if (!parentModule) {
        return { error: "Selected parent module does not exist in this project." };
      }

      // Restrict to single-level nesting
      if (parentModule.parentModuleId) {
        return { error: "Only 1-level sub-modules are supported to avoid deep nesting." };
      }
    }

    // Check module name uniqueness within project
    const [existing] = await db
      .select({ id: modules.id })
      .from(modules)
      .where(and(eq(modules.projectId, projectId), eq(modules.name, parsed.data.name)))
      .limit(1);

    if (existing) {
      return { error: `Module "${parsed.data.name}" already exists in this project.` };
    }

    const moduleId = crypto.randomUUID();

    const [newModule] = await db
      .insert(modules)
      .values({
        id: moduleId,
        projectId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        parentModuleId: finalParentId,
        status: "active",
      })
      .returning();

    revalidatePath(`/workspaces`);
    return { success: true, module: newModule };
  } catch (error: any) {
    return { error: error.message || "Failed to create module" };
  }
}

export async function updateModuleAction(
  prevState: ModuleActionResult | null,
  formData: FormData
): Promise<ModuleActionResult> {
  const workspaceId = formData.get("workspaceId")?.toString() || "";
  const projectId = formData.get("projectId")?.toString() || "";
  const moduleId = formData.get("moduleId")?.toString() || "";
  const name = formData.get("name")?.toString() || "";
  const description = formData.get("description")?.toString() || "";
  const parentModuleId = formData.get("parentModuleId")?.toString() || "";

  const parsed = UpdateModuleSchema.safeParse({
    workspaceId,
    projectId,
    moduleId,
    name,
    description,
    parentModuleId,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const { project } = await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    if (project.status === "archived") {
      return { error: "Cannot edit module in an archived project." };
    }

    const [currentModule] = await db
      .select()
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)))
      .limit(1);

    if (!currentModule) {
      return { error: "Module not found" };
    }

    if (currentModule.status === "archived") {
      return { error: "Cannot edit an archived module. Restore it first." };
    }

    const finalParentId = parsed.data.parentModuleId || null;
    if (finalParentId) {
      if (finalParentId === moduleId) {
        return { error: "Module cannot be its own parent." };
      }

      const [parentModule] = await db
        .select({ id: modules.id, parentModuleId: modules.parentModuleId })
        .from(modules)
        .where(and(eq(modules.id, finalParentId), eq(modules.projectId, projectId)))
        .limit(1);

      if (!parentModule) {
        return { error: "Parent module not found in this project." };
      }

      if (parentModule.parentModuleId) {
        return { error: "Only 1-level sub-modules are supported." };
      }
    }

    // Check name collision if name changed
    if (parsed.data.name !== currentModule.name) {
      const [duplicate] = await db
        .select({ id: modules.id })
        .from(modules)
        .where(and(eq(modules.projectId, projectId), eq(modules.name, parsed.data.name)))
        .limit(1);

      if (duplicate) {
        return { error: `Another module named "${parsed.data.name}" already exists in this project.` };
      }
    }

    const [updated] = await db
      .update(modules)
      .set({
        name: parsed.data.name,
        description: parsed.data.description || null,
        parentModuleId: finalParentId,
        updatedAt: new Date(),
      })
      .where(eq(modules.id, moduleId))
      .returning();

    revalidatePath(`/workspaces`);
    return { success: true, module: updated };
  } catch (error: any) {
    return { error: error.message || "Failed to update module" };
  }
}

export async function archiveModuleAction(workspaceId: string, projectId: string, moduleId: string) {
  try {
    const { project } = await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    if (project.status === "archived") {
      return { error: "Project is archived" };
    }

    await db
      .update(modules)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to archive module" };
  }
}

export async function restoreModuleAction(workspaceId: string, projectId: string, moduleId: string) {
  try {
    const { project } = await requireProjectAccess(workspaceId, projectId, ["owner", "admin", "member"]);

    if (project.status === "archived") {
      return { error: "Cannot restore module in an archived project. Restore the project first." };
    }

    await db
      .update(modules)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to restore module" };
  }
}

export async function getProjectModules(projectId: string) {
  return await db
    .select()
    .from(modules)
    .where(eq(modules.projectId, projectId))
    .orderBy(asc(modules.createdAt));
}
