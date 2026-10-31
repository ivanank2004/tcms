"use client";

import { useState, useTransition } from "react";
import {
  recordExecutionAttemptAction,
  updateTestRunStatusAction,
} from "@/lib/test-runs/actions";
import {
  EXECUTION_STATUS_CONFIG,
  RUN_STATUS_CONFIG,
  type ExecutionStatus,
  type TestRunStatus,
} from "@/lib/test-runs/types";
import {
  PRIORITY_CONFIG,
  type Priority,
} from "@/lib/test-cases/taxonomy";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Play,
  Check,
  User,
  GitBranch,
  Search,
  AlertTriangle,
  History,
  Send,
} from "lucide-react";

export interface RunCaseWithAttempts {
  id: string;
  testCaseId: string;
  revisionNumber: number;
  snapshotTitle: string;
  snapshotDescription: string | null;
  snapshotPreconditions: string | null;
  snapshotSteps: any;
  snapshotExpectedResult: string | null;
  snapshotPriority: string;
  snapshotModuleName: string | null;
  currentStatus: string;
  lastExecutedAt: Date | null;
  lastExecutedBy: string | null;
  stableId: string;
  originalLifecycle: string;
  lastExecutorName: string | null;
  attempts: {
    attempt: {
      id: string;
      attemptNumber: number;
      status: string;
      actualResult: string | null;
      durationSeconds: number | null;
      executedAt: Date;
    };
    executorName: string | null;
  }[];
}

export function RunExecutionRunner({
  workspaceId,
  projectId,
  workspaceSlug,
  projectKey,
  run,
  canMutate,
}: {
  workspaceId: string;
  projectId: string;
  workspaceSlug: string;
  projectKey: string;
  run: {
    id: string;
    name: string;
    environment: string;
    buildVersion: string | null;
    status: string;
    notes: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    planName?: string | null;
    assigneeName?: string | null;
    cases: RunCaseWithAttempts[];
    stats: {
      totalCases: number;
      passed: number;
      failed: number;
      blocked: number;
      skipped: number;
      notRun: number;
      evaluated: number;
      progressPercent: number;
      passRate: number;
    };
  };
  canMutate: boolean;
}) {
  const router = useRouter();
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    run.cases[0]?.id || ""
  );
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Logger Form state
  const [attemptStatus, setAttemptStatus] = useState<"passed" | "failed" | "blocked" | "skipped">("passed");
  const [actualResult, setActualResult] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedCase = run.cases.find((c) => c.id === selectedCaseId) || run.cases[0];

  const filteredCases = run.cases.filter((c) => {
    if (filterStatus !== "all" && c.currentStatus !== filterStatus) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.stableId.toLowerCase().includes(q) && !c.snapshotTitle.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleRecordAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const dur = durationSeconds ? parseInt(durationSeconds, 10) : undefined;

    startTransition(async () => {
      const res = await recordExecutionAttemptAction(null, {
        workspaceId,
        projectId,
        testRunId: run.id,
        testRunCaseId: selectedCase.id,
        status: attemptStatus,
        actualResult: actualResult || undefined,
        durationSeconds: isNaN(dur as number) ? undefined : dur,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setActualResult("");
        setDurationSeconds("");
        setSuccessMsg(`Attempt recorded as ${attemptStatus.toUpperCase()}!`);
        setTimeout(() => setSuccessMsg(null), 3000);
        router.refresh();
      }
    });
  };

  const handleUpdateRunStatus = (newStatus: TestRunStatus) => {
    if (!confirm(`Are you sure you want to mark this test run as ${newStatus.toUpperCase()}?`)) {
      return;
    }

    startTransition(async () => {
      const res = await updateTestRunStatusAction(
        workspaceId,
        projectId,
        run.id,
        newStatus
      );

      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const isCompleted = run.status === "completed" || run.status === "aborted";
  const runStatusConfig = RUN_STATUS_CONFIG[run.status as TestRunStatus] || RUN_STATUS_CONFIG.not_started;

  return (
    <div className="space-y-5">
      {/* Top Session Progress Bar Card */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border capitalize ${runStatusConfig.badgeClass}`}>
                {runStatusConfig.label}
              </span>
              <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400">
                Env: {run.environment}
              </span>
              {run.buildVersion && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-300">
                  Build: {run.buildVersion}
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">{run.name}</h1>
            {run.notes && <p className="text-xs text-zinc-400">{run.notes}</p>}
          </div>

          {canMutate && !isCompleted && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleUpdateRunStatus("completed")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium rounded-lg transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Complete Run</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdateRunStatus("aborted")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 text-xs font-medium rounded-lg border border-zinc-800 transition"
              >
                <span>Abort</span>
              </button>
            </div>
          )}
        </div>

        {/* Progress Breakdown */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-zinc-300">
                Progress: <strong className="text-zinc-100 font-mono">{run.stats.progressPercent}%</strong>
              </span>
              <span className="text-zinc-700">•</span>
              <span className="text-zinc-400">
                Evaluated: <strong>{run.stats.evaluated}</strong>/{run.stats.totalCases} cases
              </span>
              <span className="text-zinc-700">•</span>
              <span className="text-emerald-400 font-medium">
                Pass Rate: <strong>{run.stats.passRate}%</strong>
              </span>
            </div>

            <div className="flex items-center gap-2.5 font-mono text-[11px] hidden sm:flex">
              <span className="text-emerald-400">{run.stats.passed} Passed</span>
              <span className="text-rose-400">{run.stats.failed} Failed</span>
              <span className="text-amber-400">{run.stats.blocked} Blocked</span>
              <span className="text-zinc-400">{run.stats.skipped} Skipped</span>
              <span className="text-zinc-500">{run.stats.notRun} Not Run</span>
            </div>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden flex">
            {run.stats.totalCases > 0 && (
              <>
                <div
                  style={{ width: `${(run.stats.passed / run.stats.totalCases) * 100}%` }}
                  className="bg-emerald-500 transition-all duration-300"
                  title={`Passed: ${run.stats.passed}`}
                />
                <div
                  style={{ width: `${(run.stats.failed / run.stats.totalCases) * 100}%` }}
                  className="bg-rose-500 transition-all duration-300"
                  title={`Failed: ${run.stats.failed}`}
                />
                <div
                  style={{ width: `${(run.stats.blocked / run.stats.totalCases) * 100}%` }}
                  className="bg-amber-500 transition-all duration-300"
                  title={`Blocked: ${run.stats.blocked}`}
                />
                <div
                  style={{ width: `${(run.stats.skipped / run.stats.totalCases) * 100}%` }}
                  className="bg-zinc-400 transition-all duration-300"
                  title={`Skipped: ${run.stats.skipped}`}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Execution Runner (Split View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Pane: Test Cases Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5 flex flex-col h-[700px]">
          {/* Quick Filter Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
              {["all", "not_run", "failed", "passed", "blocked", "skipped"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-2 py-0.5 rounded capitalize shrink-0 transition ${
                    filterStatus === st
                      ? "bg-zinc-100 text-zinc-950 font-medium"
                      : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Cases List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredCases.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500">
                No cases matching filter.
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = c.id === selectedCase?.id;
                const statusCfg =
                  EXECUTION_STATUS_CONFIG[c.currentStatus as ExecutionStatus] ||
                  EXECUTION_STATUS_CONFIG.not_run;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCaseId(c.id);
                      setActualResult("");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? "bg-zinc-800/60 border-zinc-700 text-white shadow-xs"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/30"
                    }`}
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-medium text-zinc-200">
                          {c.stableId}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          v{c.revisionNumber}
                        </span>
                      </div>
                      <p className="text-xs truncate text-zinc-300">{c.snapshotTitle}</p>
                      {c.snapshotModuleName && (
                        <span className="text-[10px] text-zinc-500">
                          {c.snapshotModuleName}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 pt-0.5">
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.2 rounded-md border ${statusCfg.badgeClass}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Center / Right Pane: Case Specification & Execution Logger (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedCase ? (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-10 text-center text-xs text-zinc-500">
              Select a case from the sidebar to inspect execution steps and log results.
            </div>
          ) : (
            <>
              {/* Selected Case Header Card */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                        {selectedCase.stableId}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800 flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-zinc-500" />
                        v{selectedCase.revisionNumber}
                      </span>
                      {selectedCase.snapshotModuleName && (
                        <span className="text-xs text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                          {selectedCase.snapshotModuleName}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                          PRIORITY_CONFIG[selectedCase.snapshotPriority as Priority]?.badgeClass || ""
                        }`}
                      >
                        {selectedCase.snapshotPriority}
                      </span>
                    </div>

                    <h2 className="text-base font-semibold text-zinc-100 mt-1.5">
                      {selectedCase.snapshotTitle}
                    </h2>

                    {selectedCase.snapshotDescription && (
                      <p className="text-xs text-zinc-400 mt-0.5">{selectedCase.snapshotDescription}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-md border ${
                        EXECUTION_STATUS_CONFIG[selectedCase.currentStatus as ExecutionStatus]?.badgeClass || ""
                      }`}
                    >
                      {EXECUTION_STATUS_CONFIG[selectedCase.currentStatus as ExecutionStatus]?.label ||
                        selectedCase.currentStatus}
                    </span>
                  </div>
                </div>

                {/* Preconditions */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
                  <span className="font-medium text-zinc-500 uppercase tracking-wider block text-[10px] mb-0.5">
                    Preconditions
                  </span>
                  <p className="text-zinc-300">
                    {selectedCase.snapshotPreconditions || <span className="italic text-zinc-600">None specified</span>}
                  </p>
                </div>

                {/* Ordered Steps Snapshot */}
                <div className="space-y-1.5">
                  <span className="font-medium text-zinc-500 uppercase tracking-wider block text-[10px]">
                    Execution Steps (Snapshotted)
                  </span>

                  {Array.isArray(selectedCase.snapshotSteps) && selectedCase.snapshotSteps.length > 0 ? (
                    <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/60">
                      {selectedCase.snapshotSteps.map((s: any, idx: number) => (
                        <div key={idx} className="p-2.5 text-xs flex items-start gap-2.5">
                          <span className="font-mono text-zinc-400 font-medium shrink-0">
                            #{s.stepNumber || idx + 1}
                          </span>
                          <div className="space-y-0.5 flex-1">
                            <p className="text-zinc-200">{s.instruction}</p>
                            {s.expectedResult && (
                              <p className="text-zinc-400 text-[11px]">
                                <span className="text-zinc-500">Expected:</span> {s.expectedResult}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 text-xs text-zinc-500 italic border border-zinc-800 rounded-lg">
                      No discrete steps captured in this revision.
                    </div>
                  )}
                </div>

                {/* Overall Expected Result */}
                {selectedCase.snapshotExpectedResult && (
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
                    <span className="font-medium text-zinc-500 uppercase tracking-wider block text-[10px] mb-0.5">
                      Expected Result
                    </span>
                    <p className="text-zinc-300">{selectedCase.snapshotExpectedResult}</p>
                  </div>
                )}
              </div>

              {/* Execution Logger Card */}
              {canMutate && !isCompleted && (
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Play className="w-3 h-3 text-zinc-400" />
                      <span>Log Execution Attempt</span>
                    </h3>
                    <span className="text-[11px] text-zinc-500">
                      Appends a new attempt to audit history
                    </span>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleRecordAttempt} className="space-y-3">
                    {/* Status selection buttons */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Outcome Status *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(["passed", "failed", "blocked", "skipped"] as const).map((st) => {
                          const isSelected = attemptStatus === st;
                          const cfg = EXECUTION_STATUS_CONFIG[st];

                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setAttemptStatus(st)}
                              className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition flex items-center justify-center gap-1.5 ${
                                isSelected
                                  ? `${cfg.badgeClass} ring-1 ring-zinc-500`
                                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                              }`}
                            >
                              {st === "passed" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              {st === "failed" && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                              {st === "blocked" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                              {st === "skipped" && <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />}
                              <span className="capitalize">{st}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1" htmlFor="actualResult">
                          Execution Notes / Actual Result
                        </label>
                        <textarea
                          id="actualResult"
                          rows={2}
                          value={actualResult}
                          onChange={(e) => setActualResult(e.target.value)}
                          placeholder="e.g. Returned 200 OK with expected order confirmation. Or: Failed at step 2 with error 500."
                          className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1" htmlFor="durationSeconds">
                          Duration (sec)
                        </label>
                        <input
                          id="durationSeconds"
                          type="number"
                          min="0"
                          value={durationSeconds}
                          onChange={(e) => setDurationSeconds(e.target.value)}
                          placeholder="e.g. 45"
                          className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
                      >
                        {isPending ? (
                          <div className="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>Log Attempt</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Attempt History Section */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Attempt History ({selectedCase.attempts.length})</span>
                  </h3>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Append-only audit trail
                  </span>
                </div>

                {selectedCase.attempts.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-2">
                    No attempts recorded yet for this test case.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedCase.attempts.map((att) => {
                      const st = att.attempt.status as ExecutionStatus;
                      const cfg = EXECUTION_STATUS_CONFIG[st] || EXECUTION_STATUS_CONFIG.not_run;

                      return (
                        <div
                          key={att.attempt.id}
                          className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-zinc-200">
                                Attempt #{att.attempt.attemptNumber}
                              </span>
                              <span
                                className={`text-[9px] font-medium px-1.5 py-0.2 rounded-md border ${cfg.badgeClass}`}
                              >
                                {cfg.label}
                              </span>
                              {att.attempt.durationSeconds && (
                                <span className="text-zinc-500 text-[10px] font-mono">
                                  ({att.attempt.durationSeconds}s)
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(att.attempt.executedAt).toLocaleString()}
                            </span>
                          </div>

                          {att.attempt.actualResult && (
                            <p className="text-zinc-300 text-xs pl-2 border-l border-zinc-700">
                              {att.attempt.actualResult}
                            </p>
                          )}

                          <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 pt-0.5">
                            <User className="w-3 h-3 text-zinc-600" />
                            <span>By: {att.executorName || "QA Engineer"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
