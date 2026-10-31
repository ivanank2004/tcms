import { requireAuth } from "@/lib/auth/session";
import { getUserWorkspaces } from "@/lib/workspaces/actions";
import { CreateWorkspaceModal } from "@/components/create-workspace-modal";
import { Building2, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireAuth();
  const userWorkspaces = await getUserWorkspaces(user.id);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Workspaces
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage your organizations, projects, test cases, and execution runs.
          </p>
        </div>
        <div>
          <CreateWorkspaceModal />
        </div>
      </div>

      {/* Database Connection Proof Banner */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <span className="text-zinc-300 font-medium">Neon PostgreSQL Connected</span>
            <span className="text-zinc-500 ml-2 hidden sm:inline">Branch: production • WebSocket Pool</span>
          </div>
        </div>
        <div className="text-zinc-500 font-mono text-[11px]">
          ID: {user.id.slice(0, 8)}...
        </div>
      </div>

      {/* Workspaces Section */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-zinc-400" />
            Your Workspaces ({userWorkspaces.length})
          </h2>
        </div>

        {userWorkspaces.length === 0 ? (
          /* Empty State */
          <div className="border border-dashed border-zinc-800 rounded-xl p-10 text-center bg-zinc-900/20">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 text-zinc-400 flex items-center justify-center mx-auto mb-3 border border-zinc-800">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No workspaces yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-5">
              Create your first workspace to organize applications, test cases, and runs.
            </p>
            <CreateWorkspaceModal />
          </div>
        ) : (
          /* Workspace Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userWorkspaces.map(({ workspace, membership }) => (
              <Link
                key={workspace.id}
                href={`/workspaces/${workspace.slug}`}
                className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/70 rounded-xl p-5 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <h3 className="font-medium text-zinc-100 text-sm group-hover:text-white transition truncate">
                      {workspace.name}
                    </h3>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md capitalize border border-zinc-800 bg-zinc-800/60 text-zinc-300">
                      {membership.role}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 min-h-8">
                    {workspace.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-3.5 mt-3.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
                    <span>slug:</span>
                    <span className="text-zinc-400">{workspace.slug}</span>
                  </div>

                  <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-200 font-medium transition text-xs">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
