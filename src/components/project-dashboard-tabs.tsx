"use client";

import { useState } from "react";
import type { ProjectDashboardMetrics } from "@/lib/dashboard/types";
import {
  CheckSquare,
  FolderGit2,
  PlayCircle,
  TrendingUp,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  AlertCircle,
  Calendar,
  Bug,
  Activity,
  Flame,
} from "lucide-react";
import Link from "next/link";

export function ProjectDashboardTabs({
  workspaceSlug,
  projectKey,
  metrics,
}: {
  workspaceSlug: string;
  projectKey: string;
  metrics: ProjectDashboardMetrics;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "qa" | "dev">("overview");

  const { summary, lifecycleCounts, priorityCounts, runOutcomes, qaPerspective, devPerspective } =
    metrics;

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Project Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qa")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "qa"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>QA Perspective</span>
            {qaPerspective.inProgressRuns.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dev")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "dev"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Bug className="w-3.5 h-3.5 text-rose-400" />
            <span>Developer Perspective</span>
            {devPerspective.recentFailures.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                {devPerspective.recentFailures.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline-block">
          Aggregated Live PostgreSQL Data
        </span>
      </div>

      {/* Tab 1: Project Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Total Repository Cases</span>
              <p className="text-2xl font-bold text-white font-mono">{summary.totalTestCases}</p>
              <span className="text-[10px] text-slate-500">Reusable across releases</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Active Test Plans</span>
              <p className="text-2xl font-bold text-sky-400 font-mono">{summary.totalPlans}</p>
              <span className="text-[10px] text-slate-500">Target release scopes</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Execution Sessions</span>
              <p className="text-2xl font-bold text-indigo-400 font-mono">{summary.totalRuns}</p>
              <span className="text-[10px] text-slate-500">
                {summary.activeRuns} currently in progress
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Aggregated Pass Rate</span>
              <p className="text-2xl font-bold text-emerald-400 font-mono">
                {runOutcomes.overallPassRate}%
              </p>
              <span className="text-[10px] text-slate-500">
                {runOutcomes.passed} of {runOutcomes.totalEvaluated} evaluated
              </span>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lifecycle & Priority Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Test Case Distributions
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Readiness Lifecycle</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {lifecycleCounts.ready} Ready / {lifecycleCounts.draft} Draft /{" "}
                      {lifecycleCounts.deprecated} Deprecated
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                    {summary.totalTestCases > 0 && (
                      <>
                        <div
                          style={{
                            width: `${(lifecycleCounts.ready / summary.totalTestCases) * 100}%`,
                          }}
                          className="bg-emerald-500"
                          title={`Ready: ${lifecycleCounts.ready}`}
                        />
                        <div
                          style={{
                            width: `${(lifecycleCounts.draft / summary.totalTestCases) * 100}%`,
                          }}
                          className="bg-slate-600"
                          title={`Draft: ${lifecycleCounts.draft}`}
                        />
                        <div
                          style={{
                            width: `${(lifecycleCounts.deprecated / summary.totalTestCases) * 100}%`,
                          }}
                          className="bg-amber-500"
                          title={`Deprecated: ${lifecycleCounts.deprecated}`}
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 text-xs block mb-2">Priority Breakdown</span>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                      <span className="text-[10px] text-rose-400 block font-semibold">Critical</span>
                      <span className="font-mono text-sm font-bold text-white">
                        {priorityCounts.critical}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                      <span className="text-[10px] text-amber-400 block font-semibold">High</span>
                      <span className="font-mono text-sm font-bold text-white">
                        {priorityCounts.high}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                      <span className="text-[10px] text-sky-400 block font-semibold">Medium</span>
                      <span className="font-mono text-sm font-bold text-white">
                        {priorityCounts.medium}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block font-semibold">Low</span>
                      <span className="font-mono text-sm font-bold text-white">
                        {priorityCounts.low}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Run Outcome Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Execution Results Summary (All Runs)
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Passed</span>
                    </div>
                    <span className="text-xl font-bold font-mono text-white">
                      {runOutcomes.passed}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-1.5 text-rose-400 text-xs font-medium mb-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Failed</span>
                    </div>
                    <span className="text-xl font-bold font-mono text-white">
                      {runOutcomes.failed}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Blocked</span>
                    </div>
                    <span className="text-xl font-bold font-mono text-white">
                      {runOutcomes.blocked}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-medium mb-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Skipped</span>
                    </div>
                    <span className="text-xl font-bold font-mono text-white">
                      {runOutcomes.skipped}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 sm:col-span-2">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Not Yet Run (Unexecuted)</span>
                    </div>
                    <span className="text-xl font-bold font-mono text-white">
                      {runOutcomes.notRun}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: QA Perspective */}
      {activeTab === "qa" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active In-Progress Runs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-sky-400" />
                  <span>Runs Awaiting Completion ({qaPerspective.inProgressRuns.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {qaPerspective.totalUnexecutedCases} unexecuted cases
                </span>
              </div>

              {qaPerspective.inProgressRuns.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
                  No execution runs are currently in progress.
                </div>
              ) : (
                <div className="space-y-3">
                  {qaPerspective.inProgressRuns.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{r.name}</span>
                        <Link
                          href={`/workspaces/${workspaceSlug}/projects/${projectKey}/test-runs/${r.id}`}
                          className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1 text-[11px]"
                        >
                          <span>Execute</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Progress: <strong className="text-white">{r.progressPercent}%</strong>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {r.notRun} cases remaining
                        </span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex">
                        <div
                          style={{ width: `${(r.passed / (r.totalCases || 1)) * 100}%` }}
                          className="bg-emerald-500"
                        />
                        <div
                          style={{ width: `${(r.failed / (r.totalCases || 1)) * 100}%` }}
                          className="bg-rose-500"
                        />
                        <div
                          style={{ width: `${(r.blocked / (r.totalCases || 1)) * 100}%` }}
                          className="bg-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Plans Approaching Deadlines */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Plans Approaching Due Date ({qaPerspective.plansDueSoon.length})</span>
              </h3>

              {qaPerspective.plansDueSoon.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
                  No active test plans with imminent deadlines.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {qaPerspective.plansDueSoon.map((p) => {
                    const isOverdue = p.daysRemaining < 0;

                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <h4 className="font-semibold text-white">{p.name}</h4>
                          <span className="text-[10px] text-slate-500">
                            {p.casesCount} cases in scope • Target: {p.targetRelease || "N/A"}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isOverdue
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                : p.daysRemaining <= 3
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-sky-500/20 text-sky-300 border-sky-500/30"
                            }`}
                          >
                            {isOverdue ? "Overdue" : `${p.daysRemaining} days remaining`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Developer Perspective */}
      {activeTab === "dev" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Failure Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>Active Failure Logs ({devPerspective.recentFailures.length})</span>
              </h3>

              {devPerspective.recentFailures.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
                  No active failures reported in test runs.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {devPerspective.recentFailures.map((rf) => (
                    <div
                      key={rf.runCaseId}
                      className="p-3 rounded-lg bg-slate-950/60 border border-rose-900/30 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-rose-300">{rf.stableId}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Run: {rf.runName}
                        </span>
                      </div>
                      <p className="font-medium text-white truncate">{rf.title}</p>
                      {rf.actualResult && (
                        <p className="text-[11px] text-slate-400 pl-2 border-l border-rose-500/50 mt-1 italic">
                          "{rf.actualResult}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked Cases & Untested Modules */}
            <div className="space-y-6">
              {/* Blocked Cases */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Blocked Execution Items ({devPerspective.blockedCases.length})</span>
                </h3>

                {devPerspective.blockedCases.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No blocked cases.</p>
                ) : (
                  <div className="space-y-2">
                    {devPerspective.blockedCases.map((bc) => (
                      <div
                        key={bc.runCaseId}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-amber-900/30 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-amber-300 font-bold">{bc.stableId}</span>
                          <span className="text-slate-500">{bc.runName}</span>
                        </div>
                        <p className="text-white text-xs mt-0.5">{bc.title}</p>
                        {bc.actualResult && (
                          <p className="text-[11px] text-slate-400 italic mt-1">
                            Blocker: {bc.actualResult}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Untested Feature Modules */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span>Untested Feature Modules ({devPerspective.untestedModules.length})</span>
                </h3>

                {devPerspective.untestedModules.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    All created modules have at least one test case.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {devPerspective.untestedModules.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-200">{m.name}</span>
                        <span className="text-[10px] text-amber-300 font-mono">0 cases defined</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
