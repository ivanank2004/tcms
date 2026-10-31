import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getProjectModules } from "@/lib/modules/actions";
import { getProjectTestCases } from "@/lib/test-cases/actions";
import { getProjectTestPlans } from "@/lib/test-plans/actions";
import { type TestPlanStatus } from "@/lib/test-plans/types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CreateTestPlanModal } from "@/components/create-test-plan-modal";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  CheckSquare,
  Clock,
  PlayCircle,
  FileCheck2,
  Tag,
  ArrowRight,
  FolderGit2,
} from "lucide-react";

const PLAN_STATUS_CONFIG: Record<
  TestPlanStatus,
  { label: string; badgeClass: string }
> = {
  draft: {
    label: "Draft",
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
  },
  active: {
    label: "Active",
    badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  archived: {
    label: "Archived",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
};

export default async function TestPlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { workspaceSlug, projectKey } = await params;
  const sParams = await searchParams;
  const user = await requireAuth();

  const wsData = await getWorkspaceBySlug(workspaceSlug, user.id);
  if (!wsData) notFound();

  const { workspace, membership } = wsData;
  const project = await getProjectByKey(workspace.id, projectKey);
  if (!project) notFound();

  const page = parseInt(sParams.page || "1", 10);
  const status = sParams.status as TestPlanStatus | undefined;
  const search = sParams.search || "";

  const [plansData, modules, repoCasesData] = await Promise.all([
    getProjectTestPlans(project.id, {
      search: search || undefined,
      status: status || undefined,
      page,
      pageSize: 20,
    }),
    getProjectModules(project.id),
    getProjectTestCases(project.id, { pageSize: 500 }),
  ]);

  const canMutate = membership.role !== "viewer" && project.status === "active";

  const availableCases = repoCasesData.items.map((i) => ({
    ...i.testCase,
    moduleName: i.moduleName,
  }));

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Plans" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-indigo-400" />
            <span>Test Plans</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Define target release scopes, testing objectives, and select reusable test cases for execution.
          </p>
        </div>

        {canMutate && (
          <CreateTestPlanModal
            workspaceId={workspace.id}
            projectId={project.id}
            availableCases={availableCases}
            modules={modules}
          />
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search plans by name or release tag..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Link
            href={`/workspaces/${workspace.slug}/projects/${project.key}/test-plans`}
            className={`px-3 py-1 rounded-lg text-xs transition ${
              !status
                ? "bg-indigo-600 text-white font-medium"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            All Plans
          </Link>
          {(["active", "draft", "completed", "archived"] as TestPlanStatus[]).map((st) => (
            <Link
              key={st}
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-plans?status=${st}`}
              className={`px-3 py-1 rounded-lg text-xs capitalize transition ${
                status === st
                  ? "bg-indigo-600 text-white font-medium"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {st}
            </Link>
          ))}
        </div>
      </div>

      {/* Plans List */}
      {plansData.items.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/30">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No test plans found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Create a test plan to organize your test cases into scoped releases and trigger execution runs.
          </p>
          {canMutate && (
            <CreateTestPlanModal
              workspaceId={workspace.id}
              projectId={project.id}
              availableCases={availableCases}
              modules={modules}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plansData.items.map((plan) => {
            const statusConfig = PLAN_STATUS_CONFIG[plan.status as TestPlanStatus] || PLAN_STATUS_CONFIG.draft;

            return (
              <div
                key={plan.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusConfig.badgeClass}`}
                        >
                          {statusConfig.label}
                        </span>
                        {plan.targetRelease && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {plan.targetRelease}
                          </span>
                        )}
                        {plan.environment && (
                          <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {plan.environment}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-white tracking-tight">
                        {plan.name}
                      </h3>
                    </div>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{plan.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    <span className="flex items-center gap-1.5 font-medium text-slate-300">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                      {plan.casesCount} {plan.casesCount === 1 ? "case" : "cases"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5 font-medium text-slate-300">
                      <PlayCircle className="w-3.5 h-3.5 text-sky-400" />
                      {plan.runsCount} {plan.runsCount === 1 ? "run" : "runs"}
                    </span>
                    <span>•</span>
                    <span className="text-slate-500 truncate">
                      Owner: {plan.ownerName || "Unassigned"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Created {new Date(plan.createdAt).toLocaleDateString()}
                  </span>

                  <Link
                    href={`/workspaces/${workspace.slug}/projects/${project.key}/test-plans/${plan.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    <span>View Plan Scope</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
