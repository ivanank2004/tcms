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
  ArrowRight,
  FolderGit2,
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
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Runs" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-zinc-400" />
            <span>Test Execution Runs</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Track execution sessions, log attempt results, and monitor progress per build.
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
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Link
            href={`/workspaces/${workspace.slug}/projects/${project.key}/test-runs`}
            className={`px-2.5 py-1 rounded-md text-xs transition ${
              !status
                ? "bg-zinc-100 text-zinc-950 font-medium"
                : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            All Runs
          </Link>
          {(["in_progress", "not_started", "completed", "aborted"] as TestRunStatus[]).map((st) => (
            <Link
              key={st}
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-runs?status=${st}`}
              className={`px-2.5 py-1 rounded-md text-xs capitalize transition ${
                status === st
                  ? "bg-zinc-100 text-zinc-950 font-medium"
                  : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {st.replace("_", " ")}
            </Link>
          ))}
        </div>
      </div>

      {/* Runs Grid / Cards */}
      {runsData.items.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-10 text-center bg-zinc-900/20">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 text-zinc-400 flex items-center justify-center mx-auto mb-3 border border-zinc-800">
            <PlayCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">No test runs found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-5">
            Instantiate a test run from an existing test plan to execute tests and record attempts.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {runsData.items.map((r) => {
            const statusConfig = RUN_STATUS_CONFIG[r.status as TestRunStatus] || RUN_STATUS_CONFIG.not_started;

            return (
              <div
                key={r.id}
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
                        <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400">
                          {r.environment}
                        </span>
                        {r.buildVersion && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-300">
                            {r.buildVersion}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-zinc-100 group-hover:text-white tracking-tight">
                        {r.name}
                      </h3>
                      {r.planName && (
                        <p className="text-xs text-zinc-400 flex items-center gap-1">
                          <FolderGit2 className="w-3 h-3 text-zinc-500" />
                          <span>Plan: {r.planName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Meter */}
                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 text-[11px]">
                        Progress: <strong className="text-zinc-200">{r.stats.progressPercent}%</strong> ({r.stats.evaluated}/{r.stats.totalCases})
                      </span>
                      <span className="text-emerald-400 text-[11px] font-medium">
                        Pass Rate: <strong>{r.stats.passRate}%</strong>
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden flex">
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
                            className="bg-zinc-400"
                          />
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 pt-0.5">
                      <span className="text-emerald-400">{r.stats.passed} Passed</span>
                      <span className="text-rose-400">{r.stats.failed} Failed</span>
                      <span className="text-amber-400">{r.stats.blocked} Blocked</span>
                      <span className="text-zinc-500">{r.stats.notRun} Not Run</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    Assignee: {r.assigneeName || "Unassigned"}
                  </span>

                  <Link
                    href={`/workspaces/${workspace.slug}/projects/${project.key}/test-runs/${r.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 group-hover:text-white transition"
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
