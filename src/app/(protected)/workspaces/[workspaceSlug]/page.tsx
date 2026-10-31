import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug, getWorkspaceMembers } from "@/lib/workspaces/actions";
import { getWorkspaceProjects } from "@/lib/projects/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CreateProjectModal } from "@/components/create-project-modal";
import { AddMemberModal } from "@/components/add-member-modal";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  FolderKanban,
  Users,
  Shield,
  Calendar,
  Key,
  ArrowRight,
  Archive,
  Layers,
} from "lucide-react";

export default async function WorkspaceDetailsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const user = await requireAuth();

  const data = await getWorkspaceBySlug(workspaceSlug, user.id);
  if (!data) {
    notFound();
  }

  const { workspace, membership } = data;
  const projects = await getWorkspaceProjects(workspace.id);
  const members = await getWorkspaceMembers(workspace.id);

  const canCreateProject = membership.role !== "viewer";
  const canManageMembers = membership.role === "owner" || membership.role === "admin";

  const activeProjects = projects.filter((p) => p.status === "active");
  const archivedProjects = projects.filter((p) => p.status === "archived");

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs items={[{ label: workspace.name }]} />

      {/* Workspace Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">{workspace.name}</h1>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize border ${
                    membership.role === "owner"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : membership.role === "admin"
                      ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  Your Role: {membership.role}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                {workspace.description || "No description provided for this workspace."}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 font-mono">
                <span>slug: {workspace.slug}</span>
                <span>•</span>
                <span>created: {new Date(workspace.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {canCreateProject && <CreateProjectModal workspaceId={workspace.id} />}
            {canManageMembers && <AddMemberModal workspaceId={workspace.id} />}
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-200">
              Projects ({activeProjects.length} active{archivedProjects.length > 0 ? `, ${archivedProjects.length} archived` : ""})
            </h2>
          </div>
          {canCreateProject && <CreateProjectModal workspaceId={workspace.id} />}
        </div>

        {projects.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/30">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No projects created yet</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              Projects represent applications or services. Test cases are organized under projects.
            </p>
            {canCreateProject && <CreateProjectModal workspaceId={workspace.id} />}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/workspaces/${workspace.slug}/projects/${project.key}`}
                className={`bg-slate-900 border rounded-xl p-5 transition flex flex-col justify-between group shadow-sm ${
                  project.status === "archived"
                    ? "border-slate-800/60 opacity-75 hover:opacity-100"
                    : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                        {project.key}
                      </span>
                      <h3 className="font-semibold text-white text-base group-hover:text-indigo-400 transition truncate">
                        {project.name}
                      </h3>
                    </div>
                    {project.status === "archived" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-1">
                        <Archive className="w-3 h-3" />
                        Archived
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 min-h-8">
                    {project.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-400 font-medium transition">
                    <span>Explore Modules</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Members Directory Section */}
      <div className="pt-6 border-t border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-200">
              Workspace Members ({members.length})
            </h2>
          </div>
          {canManageMembers && <AddMemberModal workspaceId={workspace.id} />}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th scope="col" className="px-6 py-3">Member</th>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Role</th>
                  <th scope="col" className="px-6 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {members.map(({ member, user: mUser }) => (
                  <tr key={member.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-3.5 font-medium text-white flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                        {mUser.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{mUser.name}</span>
                      {mUser.id === user.id && (
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">You</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 font-mono text-[11px]">{mUser.email}</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize border ${
                          member.role === "owner"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            : member.role === "admin"
                            ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                            : "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
