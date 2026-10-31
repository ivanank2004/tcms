import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getProjectModules } from "@/lib/modules/actions";
import { getProjectTestCases } from "@/lib/test-cases/actions";
import { getTestPlanWithDetails } from "@/lib/test-plans/actions";
import { type TestPlanStatus } from "@/lib/test-plans/types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AddCasesToPlanModal } from "@/components/add-cases-to-plan-modal";
import { CreateTestRunModal } from "@/components/create-test-run-modal";
import { RUN_STATUS_CONFIG, type TestRunStatus } from "@/lib/test-runs/types";
import {
  PRIORITY_CONFIG,
  LIFECYCLE_CONFIG,
  type Priority,
  type Lifecycle,
} from "@/lib/test-cases/taxonomy";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Layers,
  PlayCircle,
  CheckSquare,
  FileCheck2,
  FolderGit2,
  ArrowRight,
  GitBranch,
  Clock,
  User,
  AlertCircle,
  Tag,
} from "lucide-react";

export default async function TestPlanDetailPage({
  params,
}: {
  params: Promise<{
    workspaceSlug: string;
    projectKey: string;
    planId: string;
  }>;
}) {
  const { workspaceSlug, projectKey, planId } = await params;
  const user = await requireAuth();

  const wsData = await getWorkspaceBySlug(workspaceSlug, user.id);
  if (!wsData) notFound();

  const { workspace, membership } = wsData;
  const project = await getProjectByKey(workspace.id, projectKey);
  if (!project) notFound();

  const [plan, modules, repoCasesData] = await Promise.all([
    getTestPlanWithDetails(planId),
    getProjectModules(project.id),
    getProjectTestCases(project.id, { pageSize: 500 }),
  ]);

  if (!plan || plan.projectId !== project.id) notFound();

  const canMutate = membership.role !== "viewer" && project.status === "active";
  const currentCaseIds = plan.cases.map((c) => c.id);
  const availableRepoCases = repoCasesData.items.map((i) => ({
    ...i.testCase,
    moduleName: i.moduleName,
  }));

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Plans", href: `/workspaces/${workspace.slug}/projects/${project.key}/test-plans` },
          { label: plan.name },
        ]}
      />

      {/* Plan Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize bg-sky-500/10 text-sky-300 border-sky-500/30">
                {plan.status}
              </span>
              {plan.targetRelease && (
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Release: {plan.targetRelease}
                </span>
              )}
              {plan.environment && (
                <span className="text-xs text-slate-300 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                  Target: {plan.environment}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">{plan.name}</h1>

            {plan.description && (
              <p className="text-sm text-slate-400 max-w-3xl">{plan.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 font-mono flex-wrap">
              <span>Owner: {plan.owner?.name || "Unassigned"}</span>
              <span>•</span>
              <span>Cases In Scope: <strong>{plan.cases.length}</strong></span>
              <span>•</span>
              <span>Runs Triggered: <strong>{plan.runs.length}</strong></span>
              {plan.dueDate && (
                <>
                  <span>•</span>
                  <span>Due: {new Date(plan.dueDate).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {canMutate && (
              <>
                <AddCasesToPlanModal
                  workspaceId={workspace.id}
                  projectId={project.id}
                  planId={plan.id}
                  currentCaseIds={currentCaseIds}
                  availableCases={availableRepoCases}
                  modules={modules}
                />
                <CreateTestRunModal
                  workspaceId={workspace.id}
                  projectId={project.id}
                  plans={[plan]}
                  defaultPlanId={plan.id}
                  buttonLabel="Create Run from Plan"
                  buttonVariant="primary"
                />
              </>
            )}
          </div>
        </div>

        {plan.scopeNotes && (
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Scope & Testing Notes
            </h4>
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{plan.scopeNotes}</p>
          </div>
        )}
      </div>

      {/* Main Content: Scope Cases & Execution Runs */}
      <div className="space-y-6">
        {/* Included Test Cases Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">
                Included Test Cases ({plan.cases.length})
              </h2>
            </div>
            {canMutate && (
              <AddCasesToPlanModal
                workspaceId={workspace.id}
                projectId={project.id}
                planId={plan.id}
                currentCaseIds={currentCaseIds}
                availableCases={availableRepoCases}
                modules={modules}
              />
            )}
          </div>

          {plan.cases.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-xs text-slate-400">
              No test cases added to this plan yet. Click "Manage Scope Cases" to add test cases from your repository.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">ID</th>
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-4 py-2.5">Module</th>
                    <th className="px-4 py-2.5">Priority</th>
                    <th className="px-4 py-2.5">Lifecycle</th>
                    <th className="px-4 py-2.5">Revision</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {plan.cases.map((c) => {
                    const priority = c.priority as Priority;
                    const lifecycle = c.lifecycle as Lifecycle;

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-300">
                          {c.stableId}
                        </td>
                        <td className="px-4 py-3 font-medium text-white max-w-sm truncate">
                          {c.title}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {c.moduleName || "Unassigned"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              PRIORITY_CONFIG[priority]?.badgeClass || ""
                            }`}
                          >
                            {PRIORITY_CONFIG[priority]?.label || priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${
                              LIFECYCLE_CONFIG[lifecycle]?.badgeClass || ""
                            }`}
                          >
                            {lifecycle}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                          v{c.revision}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/${c.id}`}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                          >
                            View Case
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Test Runs From This Plan Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-white">
                Test Runs From This Plan ({plan.runs.length})
              </h2>
            </div>

            {canMutate && plan.cases.length > 0 && (
              <CreateTestRunModal
                workspaceId={workspace.id}
                projectId={project.id}
                plans={[plan]}
                defaultPlanId={plan.id}
                buttonLabel="Instantiate Run"
                buttonVariant="secondary"
              />
            )}
          </div>

          {plan.runs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg text-xs text-slate-400">
              No test runs generated for this plan yet. Once ready, instantiate a run to begin recording execution results.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plan.runs.map((r) => {
                const statusConfig = RUN_STATUS_CONFIG[r.status as TestRunStatus] || RUN_STATUS_CONFIG.not_started;

                return (
                  <Link
                    key={r.id}
                    href={`/workspaces/${workspace.slug}/projects/${project.key}/test-runs/${r.id}`}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between"
                  >
                    <div className="space-y-1 truncate pr-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusConfig.badgeClass}`}>
                          {statusConfig.label}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {r.environment}
                        </span>
                        {r.buildVersion && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {r.buildVersion}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-white truncate">{r.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        Assigned: {r.assigneeName || "Unassigned"}
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
