import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getProjectModules } from "@/lib/modules/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CreateModuleModal } from "@/components/create-module-modal";
import { ProjectStatusActions } from "@/components/project-status-actions";
import { ModuleStatusActions } from "@/components/module-status-actions";
import { notFound } from "next/navigation";
import {
  FolderKanban,
  Layers,
  FolderTree,
  Archive,
  AlertTriangle,
  CornerDownRight,
  ShieldAlert,
  Info,
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

  const modules = await getProjectModules(project.id);

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

      {/* Guidance Banner for Next Step */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Ready for Step 03: Reusable test cases will be created inside this project using key <code>{project.key}</code> and assigned to these modules.
          </span>
        </div>
      </div>
    </div>
  );
}
