"use client";

import { useState, useTransition } from "react";
import { createTestRunAction } from "@/lib/test-runs/actions";
import { useRouter } from "next/navigation";
import { PlayCircle, X, AlertCircle } from "lucide-react";
import type { TestPlan } from "@/db/schema";

export function CreateTestRunModal({
  workspaceId,
  projectId,
  plans,
  defaultPlanId,
  buttonLabel = "New Test Run",
  buttonVariant = "primary",
}: {
  workspaceId: string;
  projectId: string;
  plans: TestPlan[];
  defaultPlanId?: string;
  buttonLabel?: string;
  buttonVariant?: "primary" | "secondary";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const [testPlanId, setTestPlanId] = useState(defaultPlanId || (plans[0]?.id || ""));
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("staging");
  const [buildVersion, setBuildVersion] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await createTestRunAction(null, {
        workspaceId,
        projectId,
        testPlanId: testPlanId || undefined,
        name,
        environment,
        buildVersion: buildVersion || undefined,
        notes: notes || undefined,
        testCaseIds: [], // If testPlanId is provided, server action snapshots all cases in plan!
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setIsOpen(false);
        setName("");
        setBuildVersion("");
        setNotes("");
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          buttonVariant === "primary"
            ? "inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            : "inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
        }
      >
        <PlayCircle className="w-4 h-4 text-sky-400" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-semibold text-white text-sm">Instantiate Test Run</h3>
                <p className="text-xs text-slate-400">
                  The current revision of all test cases in the selected plan will be snapshotted immutably into this run.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-start gap-2 mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="planSelect">
                  Source Test Plan *
                </label>
                <select
                  id="planSelect"
                  required
                  value={testPlanId}
                  onChange={(e) => setTestPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {plans.length === 0 ? (
                    <option value="">No test plans available</option>
                  ) : (
                    plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.targetRelease ? `(${p.targetRelease})` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="runName">
                  Test Run Name *
                </label>
                <input
                  id="runName"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sprint 24 Regression - Staging Run #1"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="environment">
                    Environment *
                  </label>
                  <select
                    id="environment"
                    required
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize"
                  >
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                    <option value="uat">UAT</option>
                    <option value="qa">QA / Dev</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="buildVersion">
                    Build Version
                  </label>
                  <input
                    id="buildVersion"
                    value={buildVersion}
                    onChange={(e) => setBuildVersion(e.target.value)}
                    placeholder="e.g. bld-20241031.1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="notes">
                  Session Notes
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions, test dataset details, or configuration notes..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300">
                <strong>Snapshot Invariant:</strong> Creating this run locks in the current revision of all test cases in the plan. Later changes to the repository will not alter this execution session.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !name.trim() || !testPlanId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2"
                >
                  {isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Instantiate Run</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
