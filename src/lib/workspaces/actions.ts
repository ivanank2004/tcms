"use server";

import { z } from "zod";
import { db } from "@/db";
import { workspaces, workspaceMembers, type Workspace } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name must be at least 2 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(500).optional(),
});

export type WorkspaceActionResult = {
  error?: string;
  success?: boolean;
  workspace?: Workspace;
};

export async function createWorkspaceAction(
  prevState: WorkspaceActionResult | null,
  formData: FormData
): Promise<WorkspaceActionResult> {
  const user = await requireAuth();

  const name = formData.get("name")?.toString() || "";
  let slug = formData.get("slug")?.toString() || "";
  const description = formData.get("description")?.toString() || "";

  if (!slug) {
    slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const parsed = CreateWorkspaceSchema.safeParse({ name, slug, description });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const finalSlug = parsed.data.slug || slug;
  const workspaceId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();

  try {
    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, finalSlug))
      .limit(1);

    if (existing.length > 0) {
      return { error: "A workspace with this identifier already exists. Please choose a different slug." };
    }

    // Atomic insert of workspace and owner membership
    await db.transaction(async (tx) => {
      await tx.insert(workspaces).values({
        id: workspaceId,
        name: parsed.data.name,
        slug: finalSlug,
        description: parsed.data.description || null,
        ownerId: user.id,
      });

      await tx.insert(workspaceMembers).values({
        id: membershipId,
        workspaceId,
        userId: user.id,
        role: "owner",
      });
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to create workspace:", error);
    return { error: "An unexpected database error occurred while creating workspace." };
  }
}

export async function getUserWorkspaces(userId: string) {
  return await db
    .select({
      workspace: workspaces,
      membership: workspaceMembers,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));
}
