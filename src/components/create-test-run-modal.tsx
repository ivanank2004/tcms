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
        testCaseIds: [],
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
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium rounded-lg transition"
            : "inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-800 transition"
        }
      >
        <PlayCircle className="w-3.5 h-3.5 text-zinc-400" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg p-5 relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-4">
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm">Instantiate Test Run</h3>
                <p className="text-[11px] text-zinc-500">
                  Active revisions in the selected plan will be snapshotted immutably into this run.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="planSelect">
                  Source Test Plan *
                </label>
                <select
                  id="planSelect"
                  required
                  value={testPlanId}
                  onChange={(e) => setTestPlanId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 transition"
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
                <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="runName">
                  Test Run Name *
                </label>
                <input
                  id="runName"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sprint 24 Regression - Staging Run #1"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="environment">
                    Environment *
                  </label>
                  <select
                    id="environment"
                    required
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 capitalize transition"
                  >
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                    <option value="uat">UAT</option>
                    <option value="qa">QA / Dev</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="buildVersion">
                    Build Version
                  </label>
                  <input
                    id="buildVersion"
                    value={buildVersion}
                    onChange={(e) => setBuildVersion(e.target.value)}
                    placeholder="e.g. bld-20241031.1"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="notes">
                  Session Notes
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions or dataset configuration notes..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400">
                <span className="text-zinc-200 font-medium">Snapshot Invariant:</span> Locks active revisions of cases. Later edits will not affect this run.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !name.trim() || !testPlanId}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 text-xs font-medium rounded-lg transition flex items-center gap-2"
                >
                  {isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
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
