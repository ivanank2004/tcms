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
  Search,
  CheckSquare,
  PlayCircle,
  FileCheck2,
  ArrowRight,
  FolderGit2,
} from "lucide-react";

const PLAN_STATUS_CONFIG: Record<
  TestPlanStatus,
  { label: string; badgeClass: string }
> = {
  draft: {
    label: "Draft",
    badgeClass: "bg-zinc-900 text-zinc-400 border-zinc-800",
  },
  active: {
    label: "Active",
    badgeClass: "bg-sky-950/40 text-sky-300 border-sky-800/50",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
  },
  archived: {
    label: "Archived",
    badgeClass: "bg-amber-950/40 text-amber-300 border-amber-800/50",
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
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Plans" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-zinc-400" />
            <span>Test Plans</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Define target release scopes, test objectives, and select test cases.
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
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search plans by name or release..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-800 transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Link
            href={`/workspaces/${workspace.slug}/projects/${project.key}/test-plans`}
            className={`px-2.5 py-1 rounded-md text-xs transition ${
              !status
                ? "bg-zinc-100 text-zinc-950 font-medium"
                : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            All Plans
          </Link>
          {(["active", "draft", "completed", "archived"] as TestPlanStatus[]).map((st) => (
            <Link
              key={st}
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-plans?status=${st}`}
              className={`px-2.5 py-1 rounded-md text-xs capitalize transition ${
                status === st
                  ? "bg-zinc-100 text-zinc-950 font-medium"
                  : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {st}
            </Link>
          ))}
        </div>
      </div>

      {/* Plans List */}
      {plansData.items.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-10 text-center bg-zinc-900/20">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 text-zinc-400 flex items-center justify-center mx-auto mb-3 border border-zinc-800">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">No test plans found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-5">
            Create a test plan to organize test cases into scoped releases and execute runs.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {plansData.items.map((plan) => {
            const statusConfig = PLAN_STATUS_CONFIG[plan.status as TestPlanStatus] || PLAN_STATUS_CONFIG.draft;

            return (
              <div
                key={plan.id}
                className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/70 rounded-xl p-4 transition flex flex-col justify-between group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md border capitalize ${statusConfig.badgeClass}`}
                        >
                          {statusConfig.label}
                        </span>
                        {plan.targetRelease && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">
                            {plan.targetRelease}
                          </span>
                        )}
                        {plan.environment && (
                          <span className="text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.2 rounded-md border border-zinc-800">
                            {plan.environment}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-zinc-100 group-hover:text-white tracking-tight">
                        {plan.name}
                      </h3>
                    </div>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2">{plan.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
                      {plan.casesCount} {plan.casesCount === 1 ? "case" : "cases"}
                    </span>
                    <span className="text-zinc-700">•</span>
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <PlayCircle className="w-3.5 h-3.5 text-zinc-400" />
                      {plan.runsCount} {plan.runsCount === 1 ? "run" : "runs"}
                    </span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-zinc-500 truncate text-[11px]">
                      Owner: {plan.ownerName || "Unassigned"}
                    </span>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Created {new Date(plan.createdAt).toLocaleDateString()}
                  </span>

                  <Link
                    href={`/workspaces/${workspace.slug}/projects/${project.key}/test-plans/${plan.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 group-hover:text-white transition"
                  >
                    <span>View Plan</span>
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
