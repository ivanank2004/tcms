import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getProjectTestPlans } from "@/lib/test-plans/actions";
import { getProjectTestRuns } from "@/lib/test-runs/actions";
import { RUN_STATUS_CONFIG, type TestRunStatus } from "@/lib/test-runs/types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CreateTestRunModal } from "@/components/create-test-run-modal";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  PlayCircle,
  Search,
  Check,
  CheckCircle2,
  Clock,
  ArrowRight,
  FolderGit2,
  Layers,
} from "lucide-react";

export default async function TestRunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
  searchParams: Promise<{
    status?: string;
    environment?: string;
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
  const status = sParams.status as TestRunStatus | undefined;
  const environment = sParams.environment || "";

  const [runsData, plansData] = await Promise.all([
    getProjectTestRuns(project.id, {
      status: status || undefined,
      environment: environment || undefined,
      page,
      pageSize: 20,
    }),
    getProjectTestPlans(project.id, { pageSize: 100 }),
  ]);

  const canMutate = membership.role !== "viewer" && project.status === "active";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Runs" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <PlayCircle className="w-6 h-6 text-sky-400" />
            <span>Test Execution Runs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track test execution sessions, log attempt results, and monitor execution progress per build and environment.
          </p>
        </div>

        {canMutate && (
          <CreateTestRunModal
            workspaceId={workspace.id}
            projectId={project.id}
            plans={plansData.items}
          />
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Link
            href={`/workspaces/${workspace.slug}/projects/${project.key}/test-runs`}
            className={`px-3 py-1 rounded-lg text-xs transition ${
              !status
                ? "bg-indigo-600 text-white font-medium"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            All Runs
          </Link>
          {(["in_progress", "not_started", "completed", "aborted"] as TestRunStatus[]).map((st) => (
            <Link
              key={st}
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-runs?status=${st}`}
              className={`px-3 py-1 rounded-lg text-xs capitalize transition ${
                status === st
                  ? "bg-indigo-600 text-white font-medium"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {st.replace("_", " ")}
            </Link>
          ))}
        </div>
      </div>

      {/* Runs Grid / Cards */}
      {runsData.items.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/30">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
            <PlayCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No test runs found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Instantiate a test run from an existing test plan to execute tests and log pass/fail attempts.
          </p>
          {canMutate && (
            <CreateTestRunModal
              workspaceId={workspace.id}
              projectId={project.id}
              plans={plansData.items}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {runsData.items.map((r) => {
            const statusConfig = RUN_STATUS_CONFIG[r.status as TestRunStatus] || RUN_STATUS_CONFIG.not_started;

            return (
              <div
                key={r.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusConfig.badgeClass}`}
                        >
                          {statusConfig.label}
                        </span>
                        <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {r.environment}
                        </span>
                        {r.buildVersion && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                            {r.buildVersion}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-white tracking-tight">
                        {r.name}
                      </h3>
                      {r.planName && (
                        <p className="text-xs text-indigo-300 flex items-center gap-1">
                          <FolderGit2 className="w-3 h-3" />
                          <span>Plan: {r.planName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Meter */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Progress: <strong className="text-white">{r.stats.progressPercent}%</strong> ({r.stats.evaluated}/{r.stats.totalCases})
                      </span>
                      <span className="text-emerald-400 text-[11px] font-medium">
                        Pass Rate: <strong>{r.stats.passRate}%</strong>
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                      {r.stats.totalCases > 0 && (
                        <>
                          <div
                            style={{ width: `${(r.stats.passed / r.stats.totalCases) * 100}%` }}
                            className="bg-emerald-500"
                          />
                          <div
                            style={{ width: `${(r.stats.failed / r.stats.totalCases) * 100}%` }}
                            className="bg-rose-500"
                          />
                          <div
                            style={{ width: `${(r.stats.blocked / r.stats.totalCases) * 100}%` }}
                            className="bg-amber-500"
                          />
                          <div
                            style={{ width: `${(r.stats.skipped / r.stats.totalCases) * 100}%` }}
                            className="bg-indigo-500"
                          />
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-0.5">
                      <span className="text-emerald-400 font-semibold">{r.stats.passed} Passed</span>
                      <span className="text-rose-400 font-semibold">{r.stats.failed} Failed</span>
                      <span className="text-amber-400 font-semibold">{r.stats.blocked} Blocked</span>
                      <span className="text-slate-500">{r.stats.notRun} Not Run</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Assignee: {r.assigneeName || "Unassigned"}
                  </span>

                  <Link
                    href={`/workspaces/${workspace.slug}/projects/${project.key}/test-runs/${r.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
                  >
                    <span>Execute & Log</span>
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
