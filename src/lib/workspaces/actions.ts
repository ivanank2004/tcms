"use server";

import { z } from "zod";
import { db } from "@/db";
import { workspaces, workspaceMembers, users, type Workspace, type WorkspaceMember } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { requireWorkspaceMembership, type WorkspaceRole } from "@/lib/auth/authorization";
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

export async function getWorkspaceBySlug(slug: string, userId: string) {
  const [result] = await db
    .select({
      workspace: workspaces,
      membership: workspaceMembers,
    })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, userId)
      )
    )
    .where(eq(workspaces.slug, slug))
    .limit(1);

  return result || null;
}

export async function getWorkspaceMembers(workspaceId: string) {
  return await db
    .select({
      member: workspaceMembers,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
}

const AddMemberSchema = z.object({
  workspaceId: z.string().min(1, "Workspace is required"),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  role: z.enum(["admin", "member", "viewer"]),
});

export async function addWorkspaceMemberAction(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const workspaceId = formData.get("workspaceId")?.toString() || "";
  const email = formData.get("email")?.toString() || "";
  const role = formData.get("role")?.toString() || "member";

  const parsed = AddMemberSchema.safeParse({ workspaceId, email, role });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    // Only Owner or Admin can add members
    const { membership } = await requireWorkspaceMembership(workspaceId, ["owner", "admin"]);

    const [targetUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (!targetUser) {
      return { error: `No registered account found with email "${parsed.data.email}". User must sign up first.` };
    }

    const [existingMember] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUser.id)
        )
      )
      .limit(1);

    if (existingMember) {
      return { error: "This user is already a member of this workspace." };
    }

    await db.insert(workspaceMembers).values({
      id: crypto.randomUUID(),
      workspaceId,
      userId: targetUser.id,
      role: parsed.data.role,
    });

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to add workspace member." };
  }
}

export async function updateMemberRoleAction(
  workspaceId: string,
  memberId: string,
  newRole: WorkspaceRole
) {
  try {
    const { membership } = await requireWorkspaceMembership(workspaceId, ["owner", "admin"]);

    const [targetMember] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspaceId)))
      .limit(1);

    if (!targetMember) {
      return { error: "Member not found" };
    }

    if (targetMember.role === "owner") {
      return { error: "Owner role cannot be changed via role update" };
    }

    if (membership.role === "admin" && (targetMember.role === "admin" || newRole === "admin")) {
      return { error: "Only the workspace owner can manage admin roles" };
    }

    await db
      .update(workspaceMembers)
      .set({ role: newRole })
      .where(eq(workspaceMembers.id, memberId));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update member role." };
  }
}

export async function removeWorkspaceMemberAction(workspaceId: string, memberId: string) {
  try {
    const { membership } = await requireWorkspaceMembership(workspaceId, ["owner", "admin"]);

    const [targetMember] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspaceId)))
      .limit(1);

    if (!targetMember) {
      return { error: "Member not found" };
    }

    if (targetMember.role === "owner") {
      return { error: "Cannot remove the workspace owner" };
    }

    if (membership.role === "admin" && targetMember.role === "admin") {
      return { error: "Only the workspace owner can remove an admin" };
    }

    await db.delete(workspaceMembers).where(eq(workspaceMembers.id, memberId));

    revalidatePath(`/workspaces`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to remove workspace member." };
  }
}
