import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getProjectModules } from "@/lib/modules/actions";
import { getProjectTestCases } from "@/lib/test-cases/actions";
import { getProjectTestPlans } from "@/lib/test-plans/actions";
import { getProjectTestRuns } from "@/lib/test-runs/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CreateModuleModal } from "@/components/create-module-modal";
import { ProjectStatusActions } from "@/components/project-status-actions";
import { ModuleStatusActions } from "@/components/module-status-actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  Layers,
  FolderTree,
  Archive,
  AlertTriangle,
  CornerDownRight,
  ShieldAlert,
  Info,
  CheckSquare,
  ArrowRight,
  Plus,
  FolderGit2,
  PlayCircle,
} from "lucide-react";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
}) {
  const { workspaceSlug, projectKey } = await params;
  const user = await requireAuth();

  const wsData = await getWorkspaceBySlug(workspaceSlug, user.id);
  if (!wsData) {
    notFound();
  }

  const { workspace, membership } = wsData;
  const project = await getProjectByKey(workspace.id, projectKey);
  if (!project) {
    notFound();
  }

  const [modules, testCasesData, plansData, runsData] = await Promise.all([
    getProjectModules(project.id),
    getProjectTestCases(project.id, { pageSize: 1 }),
    getProjectTestPlans(project.id, { pageSize: 1 }),
    getProjectTestRuns(project.id, { pageSize: 1 }),
  ]);

  const canManageProject = membership.role === "owner" || membership.role === "admin";
  const canMutateModules = membership.role !== "viewer" && project.status === "active";

  // Organize modules into top-level and children
  const topLevelModules = modules.filter((m) => !m.parentModuleId);
  const childModulesMap: Record<string, typeof modules> = {};
  for (const m of modules) {
    if (m.parentModuleId) {
      if (!childModulesMap[m.parentModuleId]) {
        childModulesMap[m.parentModuleId] = [];
      }
      childModulesMap[m.parentModuleId].push(m);
    }
  }

  const isArchived = project.status === "archived";

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: `${project.name} (${project.key})` },
        ]}
      />

      {/* Project Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {project.key}
                </span>
                <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize border ${
                    project.status === "active"
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {project.status}
                </span>
              </div>

              <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                {project.description || "No description provided for this project."}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-500 mt-4 font-mono">
                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>Key prefix for test cases: <strong>{project.key}-*</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ProjectStatusActions
              workspaceId={workspace.id}
              projectId={project.id}
              status={project.status}
              canManage={canManageProject}
            />
          </div>
        </div>
      </div>

      {/* Archived Warning Banner */}
      {isArchived && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Project is Archived:</strong> This application is read-only. No new modules, test cases, or revisions can be created until an Owner or Admin restores it.
          </span>
        </div>
      )}

      {/* QA Workflow Hub: Repository, Plans & Execution Runs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Test Cases Repository Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Repository</h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  {testCasesData.total}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Reusable test cases with step-by-step instructions and versioned history.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
            {canMutateModules ? (
              <Link
                href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/new`}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                + New Case
              </Link>
            ) : <span />}

            <Link
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              <span>Browse Cases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Test Plans Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Test Plans</h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium">
                  {plansData.total}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Organize testing scopes, target releases, and select repository cases.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-end">
            <Link
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-plans`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              <span>View Plans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Execution Runs Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Execution Runs</h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  {runsData.total}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Execute runs, log Pass/Fail/Blocked attempts, and track live progress.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-end">
            <Link
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-runs`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <span>View Runs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Modules & Features Hierarchy Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-200">
              Modules & Features ({modules.length})
            </h2>
          </div>

          {canMutateModules && (
            <CreateModuleModal
              workspaceId={workspace.id}
              projectId={project.id}
              availableParentModules={topLevelModules.filter((m) => m.status === "active")}
              isProjectArchived={isArchived}
            />
          )}
        </div>

        {modules.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/30">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No modules created yet</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              Modules represent features, epics, or components within this project (e.g., Auth, Payments, Reports).
            </p>
            {canMutateModules && (
              <CreateModuleModal
                workspaceId={workspace.id}
                projectId={project.id}
                availableParentModules={[]}
                isProjectArchived={isArchived}
              />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {topLevelModules.map((topModule) => {
              const children = childModulesMap[topModule.id] || [];

              return (
                <div
                  key={topModule.id}
                  className={`bg-slate-900 border rounded-xl p-4 transition ${
                    topModule.status === "archived"
                      ? "border-slate-800/60 opacity-60"
                      : "border-slate-800"
                  }`}
                >
                  {/* Top-Level Module Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                        <FolderTree className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white text-sm">{topModule.name}</h4>
                          {topModule.status === "archived" && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              Archived
                            </span>
                          )}
                        </div>
                        {topModule.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{topModule.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ModuleStatusActions
                        workspaceId={workspace.id}
                        projectId={project.id}
                        moduleId={topModule.id}
                        status={topModule.status}
                        isProjectArchived={isArchived}
                        canManage={membership.role !== "viewer"}
                      />
                    </div>
                  </div>

                  {/* Child Sub-modules */}
                  {children.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 pl-6 space-y-2">
                      {children.map((childModule) => (
                        <div
                          key={childModule.id}
                          className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-950/50 border border-slate-800/60"
                        >
                          <div className="flex items-center gap-2">
                            <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="text-xs font-medium text-slate-200">
                              {childModule.name}
                            </span>
                            {childModule.status === "archived" && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                Archived
                              </span>
                            )}
                            {childModule.description && (
                              <span className="text-[11px] text-slate-500 truncate max-w-xs">
                                — {childModule.description}
                              </span>
                            )}
                          </div>

                          <ModuleStatusActions
                            workspaceId={workspace.id}
                            projectId={project.id}
                            moduleId={childModule.id}
                            status={childModule.status}
                            isProjectArchived={isArchived}
                            canManage={membership.role !== "viewer"}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step Roadmap Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Test cases created in this project are tracked with revision history and ready to be scheduled into test plans and runs.
          </span>
        </div>
      </div>
    </div>
  );
}
