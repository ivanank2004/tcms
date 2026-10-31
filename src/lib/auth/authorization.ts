import { db } from "@/db";
import { workspaceMembers, projects, type WorkspaceMember, type Project } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "./session";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export async function getWorkspaceMembership(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember | null> {
  const result = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function requireWorkspaceMembership(
  workspaceId: string,
  allowedRoles?: WorkspaceRole[]
): Promise<{ user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; membership: WorkspaceMember }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Sign-in required");
  }

  const membership = await getWorkspaceMembership(workspaceId, user.id);
  if (!membership) {
    throw new Error("Forbidden: You are not a member of this workspace");
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = membership.role as WorkspaceRole;
    if (!allowedRoles.includes(userRole)) {
      throw new Error(`Forbidden: Role '${membership.role}' does not have required permissions`);
    }
  }

  return { user, membership };
}

export async function requireProjectAccess(
  workspaceId: string,
  projectId: string,
  allowedRoles?: WorkspaceRole[]
): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  membership: WorkspaceMember;
  project: Project;
}> {
  const { user, membership } = await requireWorkspaceMembership(workspaceId, allowedRoles);

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);

  if (!project) {
    throw new Error("Project not found in this workspace");
  }

  return { user, membership, project };
}
