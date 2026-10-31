import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getProjectModules } from "@/lib/modules/actions";
import { getProjectTestCases } from "@/lib/test-cases/actions";
import { getProjectTestPlans } from "@/lib/test-plans/actions";
import { getProjectTestRuns } from "@/lib/test-runs/actions";
import { getProjectDashboardMetrics } from "@/lib/dashboard/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CreateModuleModal } from "@/components/create-module-modal";
import { ProjectStatusActions } from "@/components/project-status-actions";
import { ModuleStatusActions } from "@/components/module-status-actions";
import { ProjectDashboardTabs } from "@/components/project-dashboard-tabs";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  Layers,
  FolderTree,
  AlertTriangle,
  CornerDownRight,
  CheckSquare,
  ArrowRight,
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

  const [modules, testCasesData, plansData, runsData, dashboardMetrics] = await Promise.all([
    getProjectModules(project.id),
    getProjectTestCases(project.id, { pageSize: 1 }),
    getProjectTestPlans(project.id, { pageSize: 1 }),
    getProjectTestRuns(project.id, { pageSize: 1 }),
    getProjectDashboardMetrics(project.id),
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
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: `${project.name} (${project.key})` },
        ]}
      />

      {/* Project Header Card */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-700/60">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700/60">
                  {project.key}
                </span>
                <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">{project.name}</h1>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md capitalize border border-zinc-800 bg-zinc-800/60 text-zinc-300">
                  {project.status}
                </span>
              </div>

              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                {project.description || "No description provided for this project."}
              </p>

              <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-2.5 font-mono">
                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>Prefix: {project.key}-*</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
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
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Project is Archived:</strong> This application is read-only. No new modules, test cases, or revisions can be created until restored.
          </span>
        </div>
      )}

      {/* QA Workflow Hub: Repository, Plans & Execution Runs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Test Cases Repository Card */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/70 rounded-xl p-4 transition flex flex-col justify-between group">
          <div className="space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center border border-zinc-700/60">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-zinc-100">Repository</h3>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">
                  {testCasesData.total}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Reusable test cases with step-by-step instructions and revision history.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
            {canMutateModules ? (
              <Link
                href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/new`}
                className="text-zinc-500 hover:text-zinc-300 transition text-[11px]"
              >
                + New Case
              </Link>
            ) : <span />}

            <Link
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 group-hover:text-white transition"
            >
              <span>Browse Cases</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Test Plans Card */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/70 rounded-xl p-4 transition flex flex-col justify-between group">
          <div className="space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center border border-zinc-700/60">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-zinc-100">Test Plans</h3>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">
                  {plansData.total}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Organize testing scopes, target releases, and select test cases.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-end text-xs">
            <Link
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-plans`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 group-hover:text-white transition"
            >
              <span>View Plans</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Execution Runs Card */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/70 rounded-xl p-4 transition flex flex-col justify-between group">
          <div className="space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center border border-zinc-700/60">
              <PlayCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-zinc-100">Execution Runs</h3>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">
                  {runsData.total}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Execute runs, record Pass/Fail/Blocked attempts, and track progress.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-end text-xs">
            <Link
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-runs`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 group-hover:text-white transition"
            >
              <span>View Runs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Project Dashboard (Overview, QA & Dev Perspectives) */}
      <ProjectDashboardTabs
        workspaceSlug={workspace.slug}
        projectKey={project.key}
        metrics={dashboardMetrics}
      />

      {/* Modules & Features Hierarchy Section */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-medium text-zinc-200">
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
          <div className="border border-dashed border-zinc-800 rounded-xl p-10 text-center bg-zinc-900/20">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 text-zinc-400 flex items-center justify-center mx-auto mb-3 border border-zinc-800">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No modules created yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-5">
              Modules represent features or components (e.g., Auth, Payments, Billing).
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
          <div className="space-y-2.5">
            {topLevelModules.map((topModule) => {
              const children = childModulesMap[topModule.id] || [];

              return (
                <div
                  key={topModule.id}
                  className={`bg-zinc-900/40 border rounded-xl p-3.5 transition ${
                    topModule.status === "archived"
                      ? "border-zinc-800/60 opacity-60"
                      : "border-zinc-800/80"
                  }`}
                >
                  {/* Top-Level Module Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-700/60">
                        <FolderTree className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-zinc-100 text-xs">{topModule.name}</h4>
                          {topModule.status === "archived" && (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                              Archived
                            </span>
                          )}
                        </div>
                        {topModule.description && (
                          <p className="text-[11px] text-zinc-400 mt-0.5">{topModule.description}</p>
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
                    <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 pl-5 space-y-1.5">
                      {children.map((childModule) => (
                        <div
                          key={childModule.id}
                          className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80"
                        >
                          <div className="flex items-center gap-2">
                            <CornerDownRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="text-xs font-medium text-zinc-200">
                              {childModule.name}
                            </span>
                            {childModule.status === "archived" && (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                                Archived
                              </span>
                            )}
                            {childModule.description && (
                              <span className="text-[11px] text-zinc-500 truncate max-w-xs">
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
    </div>
  );
}
