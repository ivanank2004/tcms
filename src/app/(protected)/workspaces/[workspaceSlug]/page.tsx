import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug, getWorkspaceMembers } from "@/lib/workspaces/actions";
import { getWorkspaceProjects } from "@/lib/projects/actions";
import { getWorkspaceDashboardMetrics } from "@/lib/dashboard/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CreateProjectModal } from "@/components/create-project-modal";
import { AddMemberModal } from "@/components/add-member-modal";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  FolderKanban,
  Users,
  ArrowRight,
  Archive,
  CheckSquare,
  PlayCircle,
  Activity,
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
  const [projects, members, metrics] = await Promise.all([
    getWorkspaceProjects(workspace.id),
    getWorkspaceMembers(workspace.id),
    getWorkspaceDashboardMetrics(workspace.id),
  ]);

  const canCreateProject = membership.role !== "viewer";
  const canManageMembers = membership.role === "owner" || membership.role === "admin";

  const activeProjects = projects.filter((p) => p.status === "active");
  const archivedProjects = projects.filter((p) => p.status === "archived");

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs items={[{ label: workspace.name }]} />

      {/* Workspace Header */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-700/60">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">{workspace.name}</h1>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md capitalize border border-zinc-800 bg-zinc-800/60 text-zinc-300">
                  {membership.role}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                {workspace.description || "No description provided for this workspace."}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-2.5 font-mono">
                <span>slug: {workspace.slug}</span>
                <span>•</span>
                <span>created: {new Date(workspace.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Workspace Health Stats */}
              <div className="flex items-center gap-5 text-xs pt-3.5 mt-3 border-t border-zinc-800/80">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <FolderKanban className="w-3.5 h-3.5 text-zinc-400" />
                  <strong className="text-zinc-100">{metrics.activeProjects}</strong> Active Projects
                </span>
                <span className="text-zinc-700">•</span>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
                  <strong className="text-zinc-100">{metrics.totalTestCases}</strong> Test Cases
                </span>
                <span className="text-zinc-700">•</span>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <PlayCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <strong className="text-zinc-100">{metrics.totalTestRuns}</strong> Execution Sessions
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {canCreateProject && <CreateProjectModal workspaceId={workspace.id} />}
            {canManageMembers && <AddMemberModal workspaceId={workspace.id} />}
          </div>
        </div>
      </div>

      {/* Recent Workspace Execution Activity (if runs exist) */}
      {metrics.recentRuns.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-zinc-300 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-zinc-400" />
              <span>Recent Workspace Runs</span>
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">Latest activity</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {metrics.recentRuns.slice(0, 3).map((r) => (
              <Link
                key={r.id}
                href={`/workspaces/${workspace.slug}/projects/${r.projectKey}/test-runs/${r.id}`}
                className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono text-zinc-300 font-medium">{r.projectKey}</span>
                    <span className="capitalize text-zinc-500 font-mono text-[10px]">{r.environment}</span>
                  </div>
                  <h4 className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">{r.name}</h4>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Progress: {r.progressPercent}%</span>
                    <span className="text-emerald-400">{r.passedCases} passed</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      style={{ width: `${r.progressPercent}%` }}
                      className="bg-zinc-300 h-full transition-all"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-medium text-zinc-200">
              Projects ({activeProjects.length} active{archivedProjects.length > 0 ? `, ${archivedProjects.length} archived` : ""})
            </h2>
          </div>
          {canCreateProject && <CreateProjectModal workspaceId={workspace.id} />}
        </div>

        {projects.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-xl p-10 text-center bg-zinc-900/20">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 text-zinc-400 flex items-center justify-center mx-auto mb-3 border border-zinc-800">
              <FolderKanban className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No projects created yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-5">
              Projects represent applications or services. Test cases are organized under projects.
            </p>
            {canCreateProject && <CreateProjectModal workspaceId={workspace.id} />}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/workspaces/${workspace.slug}/projects/${project.key}`}
                className={`bg-zinc-900/40 border rounded-xl p-5 transition flex flex-col justify-between group ${
                  project.status === "archived"
                    ? "border-zinc-800/60 opacity-70 hover:opacity-100"
                    : "border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/70"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700/60 shrink-0">
                        {project.key}
                      </span>
                      <h3 className="font-medium text-zinc-100 text-sm group-hover:text-white transition truncate">
                        {project.name}
                      </h3>
                    </div>
                    {project.status === "archived" && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/60 shrink-0 flex items-center gap-1">
                        <Archive className="w-3 h-3" />
                        Archived
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 min-h-8">
                    {project.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-3.5 mt-3.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-200 font-medium transition">
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Members Directory Section */}
      <div className="pt-5 border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-medium text-zinc-200">
              Workspace Members ({members.length})
            </h2>
          </div>
          {canManageMembers && <AddMemberModal workspaceId={workspace.id} />}
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800/80 font-medium">
                <tr>
                  <th scope="col" className="px-5 py-2.5">Member</th>
                  <th scope="col" className="px-5 py-2.5">Email</th>
                  <th scope="col" className="px-5 py-2.5">Role</th>
                  <th scope="col" className="px-5 py-2.5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {members.map(({ member, user: mUser }) => (
                  <tr key={member.id} className="hover:bg-zinc-900/50 transition">
                    <td className="px-5 py-3 font-medium text-zinc-100 flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-medium text-[10px]">
                        {mUser.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{mUser.name}</span>
                      {mUser.id === user.id && (
                        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">You</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-zinc-400 font-mono text-[11px]">{mUser.email}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md capitalize border border-zinc-800 bg-zinc-800/60 text-zinc-300">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">
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
