import { requireAuth } from "@/lib/auth/session";
import { getUserWorkspaces } from "@/lib/workspaces/actions";
import { CreateWorkspaceModal } from "@/components/create-workspace-modal";
import { Building2, Calendar, Shield, ArrowRight, Layers, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireAuth();
  const userWorkspaces = await getUserWorkspaces(user.id);

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your workspaces, projects, and test repositories from a single hub.
          </p>
        </div>
        <div>
          <CreateWorkspaceModal />
        </div>
      </div>

      {/* Database Connection Proof Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-xs">
            <span className="text-slate-300 font-medium">Neon PostgreSQL Connected</span>
            <span className="text-slate-500 ml-2">Branch: production • Drizzle ORM Serverless</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          User ID: <code className="text-slate-400 font-mono text-[11px]">{user.id.slice(0, 8)}...</code>
        </div>
      </div>

      {/* Workspaces Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            Your Workspaces ({userWorkspaces.length})
          </h2>
        </div>

        {userWorkspaces.length === 0 ? (
          /* Empty State */
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/30">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No workspaces yet</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              Get started by creating your first workspace. Workspaces group your applications, test cases, and runs.
            </p>
            <CreateWorkspaceModal />
          </div>
        ) : (
          /* Workspace Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {userWorkspaces.map(({ workspace, membership }) => (
              <Link
                key={workspace.id}
                href={`/workspaces/${workspace.slug}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition flex flex-col justify-between group shadow-sm hover:bg-slate-900/90"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-white text-base group-hover:text-indigo-400 transition truncate">
                      {workspace.name}
                    </h3>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize border ${
                        membership.role === "owner"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : membership.role === "admin"
                          ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {membership.role}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 min-h-8">
                    {workspace.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-slate-400">slug:</span>
                    <span>{workspace.slug}</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-400 font-medium transition">
                    <span>Manage</span>
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
