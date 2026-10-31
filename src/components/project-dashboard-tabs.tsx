"use client";

import { useState } from "react";
import type { ProjectDashboardMetrics } from "@/lib/dashboard/types";
import {
  PlayCircle,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  Calendar,
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
    <div className="space-y-5">
      {/* Navigation Tabs Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="bg-zinc-900/80 border border-zinc-800 p-0.5 rounded-lg inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "overview"
                ? "bg-zinc-800 text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qa")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "qa"
                ? "bg-zinc-800 text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>QA Perspective</span>
            {qaPerspective.inProgressRuns.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dev")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "dev"
                ? "bg-zinc-800 text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Developer Perspective</span>
            {devPerspective.recentFailures.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-300 font-mono border border-zinc-700/60 ml-0.5">
                {devPerspective.recentFailures.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline-block">
          PostgreSQL Aggregation
        </span>
      </div>

      {/* Tab 1: Project Overview */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-medium text-zinc-400">Total Repository Cases</span>
              <p className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">{summary.totalTestCases}</p>
              <span className="text-[10px] text-zinc-500">Reusable across releases</span>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-medium text-zinc-400">Active Test Plans</span>
              <p className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">{summary.totalPlans}</p>
              <span className="text-[10px] text-zinc-500">Target release scopes</span>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-medium text-zinc-400">Execution Sessions</span>
              <p className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">{summary.totalRuns}</p>
              <span className="text-[10px] text-zinc-500">
                {summary.activeRuns} currently in progress
              </span>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-medium text-zinc-400">Overall Pass Rate</span>
              <p className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
                {runOutcomes.overallPassRate}%
              </p>
              <span className="text-[10px] text-zinc-500">
                {runOutcomes.passed} of {runOutcomes.totalEvaluated} evaluated
              </span>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lifecycle & Priority Distribution */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
                Case Distributions
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-400">Readiness Lifecycle</span>
                    <span className="text-zinc-300 font-mono text-[11px]">
                      {lifecycleCounts.ready} Ready / {lifecycleCounts.draft} Draft /{" "}
                      {lifecycleCounts.deprecated} Deprecated
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden flex">
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
                          className="bg-zinc-600"
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

                <div className="pt-2 border-t border-zinc-800/80">
                  <span className="text-zinc-400 text-xs block mb-2">Priority Breakdown</span>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800 text-center">
                      <span className="text-[10px] text-zinc-400 block font-medium">Critical</span>
                      <span className="font-mono text-sm font-semibold text-zinc-100">
                        {priorityCounts.critical}
                      </span>
                    </div>
                    <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800 text-center">
                      <span className="text-[10px] text-zinc-400 block font-medium">High</span>
                      <span className="font-mono text-sm font-semibold text-zinc-100">
                        {priorityCounts.high}
                      </span>
                    </div>
                    <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800 text-center">
                      <span className="text-[10px] text-zinc-400 block font-medium">Medium</span>
                      <span className="font-mono text-sm font-semibold text-zinc-100">
                        {priorityCounts.medium}
                      </span>
                    </div>
                    <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800 text-center">
                      <span className="text-[10px] text-zinc-400 block font-medium">Low</span>
                      <span className="font-mono text-sm font-semibold text-zinc-100">
                        {priorityCounts.low}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Run Outcome Breakdown */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
                Execution Results Summary
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Passed</span>
                    </div>
                    <span className="text-lg font-semibold font-mono text-zinc-100">
                      {runOutcomes.passed}
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>Failed</span>
                    </div>
                    <span className="text-lg font-semibold font-mono text-zinc-100">
                      {runOutcomes.failed}
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Blocked</span>
                    </div>
                    <span className="text-lg font-semibold font-mono text-zinc-100">
                      {runOutcomes.blocked}
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      <span>Skipped</span>
                    </div>
                    <span className="text-lg font-semibold font-mono text-zinc-100">
                      {runOutcomes.skipped}
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800 sm:col-span-2">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>Unexecuted Remaining</span>
                    </div>
                    <span className="text-lg font-semibold font-mono text-zinc-100">
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active In-Progress Runs */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Runs In Progress ({qaPerspective.inProgressRuns.length})</span>
                </h3>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {qaPerspective.totalUnexecutedCases} remaining
                </span>
              </div>

              {qaPerspective.inProgressRuns.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg text-xs text-zinc-500">
                  No execution runs are currently in progress.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {qaPerspective.inProgressRuns.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-100">{r.name}</span>
                        <Link
                          href={`/workspaces/${workspaceSlug}/projects/${projectKey}/test-runs/${r.id}`}
                          className="text-zinc-300 hover:text-white font-medium inline-flex items-center gap-1 text-[11px] transition"
                        >
                          <span>Execute</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>
                          Progress: <strong className="text-zinc-200">{r.progressPercent}%</strong>
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {r.notRun} cases remaining
                        </span>
                      </div>

                      <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden flex">
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
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Plans Approaching Due Date ({qaPerspective.plansDueSoon.length})</span>
              </h3>

              {qaPerspective.plansDueSoon.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg text-xs text-zinc-500">
                  No active test plans with imminent deadlines.
                </div>
              ) : (
                <div className="space-y-2">
                  {qaPerspective.plansDueSoon.map((p) => {
                    const isOverdue = p.daysRemaining < 0;

                    return (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <h4 className="font-medium text-zinc-100">{p.name}</h4>
                          <span className="text-[10px] text-zinc-500">
                            {p.casesCount} cases • Target: {p.targetRelease || "N/A"}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                              isOverdue
                                ? "bg-rose-950/30 text-rose-300 border-rose-800/50"
                                : p.daysRemaining <= 3
                                ? "bg-amber-950/30 text-amber-300 border-amber-800/50"
                                : "bg-zinc-800 text-zinc-300 border-zinc-700/60"
                            }`}
                          >
                            {isOverdue ? "Overdue" : `${p.daysRemaining} days left`}
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Failure Logs */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-zinc-400" />
                <span>Active Failure Logs ({devPerspective.recentFailures.length})</span>
              </h3>

              {devPerspective.recentFailures.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg text-xs text-zinc-500">
                  No active failures reported in test runs.
                </div>
              ) : (
                <div className="space-y-2">
                  {devPerspective.recentFailures.map((rf) => (
                    <div
                      key={rf.runCaseId}
                      className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium text-rose-400">{rf.stableId}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {rf.runName}
                        </span>
                      </div>
                      <p className="font-medium text-zinc-200 truncate">{rf.title}</p>
                      {rf.actualResult && (
                        <p className="text-[11px] text-zinc-400 pl-2 border-l border-zinc-700 mt-1 italic">
                          "{rf.actualResult}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked Cases & Untested Modules */}
            <div className="space-y-4">
              {/* Blocked Cases */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Blocked Cases ({devPerspective.blockedCases.length})</span>
                </h3>

                {devPerspective.blockedCases.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No blocked cases.</p>
                ) : (
                  <div className="space-y-2">
                    {devPerspective.blockedCases.map((bc) => (
                      <div
                        key={bc.runCaseId}
                        className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-amber-400 font-medium">{bc.stableId}</span>
                          <span className="text-zinc-500">{bc.runName}</span>
                        </div>
                        <p className="text-zinc-200 text-xs mt-0.5">{bc.title}</p>
                        {bc.actualResult && (
                          <p className="text-[11px] text-zinc-400 italic mt-1">
                            Blocker: {bc.actualResult}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Untested Feature Modules */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Untested Feature Modules ({devPerspective.untestedModules.length})</span>
                </h3>

                {devPerspective.untestedModules.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    All created modules have at least one test case.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {devPerspective.untestedModules.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs flex items-center justify-between"
                      >
                        <span className="font-medium text-zinc-300">{m.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">0 cases defined</span>
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
