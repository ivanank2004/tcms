"use client";

import { useState } from "react";
import { History, Eye, GitCommit, ChevronRight, X } from "lucide-react";
import type { TestCaseRevision, StepSnapshot } from "@/db/schema";

export function RevisionViewerClient({
  revisions,
  currentRevisionNumber,
}: {
  revisions: Array<{ revision: TestCaseRevision; changerName: string | null }>;
  currentRevisionNumber: number;
}) {
  const [selectedRev, setSelectedRev] = useState<TestCaseRevision | null>(null);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <History className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-white">Revision History ({revisions.length})</h3>
      </div>

      <div className="space-y-3">
        {revisions.map(({ revision: rev, changerName }) => {
          const isCurrent = rev.revisionNumber === currentRevisionNumber;

          return (
            <div
              key={rev.id}
              className={`p-3 rounded-lg border text-xs transition ${
                isCurrent
                  ? "bg-indigo-950/20 border-indigo-500/40"
                  : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-white">v{rev.revisionNumber}</span>
                  {isCurrent && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-normal">
                      Current
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRev(rev)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Inspect</span>
                </button>
              </div>

              <p className="text-slate-400 text-[11px] line-clamp-1">{rev.changeSummary || "Revision updated"}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-800/50 font-mono">
                <span>By {changerName || "User"}</span>
                <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Snapshot Modal */}
      {selectedRev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-indigo-400" />
                <h4 className="font-semibold text-white text-sm">
                  Historical Snapshot: v{selectedRev.revisionNumber}
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">
                  ({new Date(selectedRev.createdAt).toLocaleString()})
                </span>
              </div>
              <button
                onClick={() => setSelectedRev(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              <div>
                <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                  Title
                </p>
                <p className="text-white font-medium text-sm bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {selectedRev.title}
                </p>
              </div>

              {selectedRev.preconditions && (
                <div>
                  <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                    Preconditions
                  </p>
                  <p className="text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    {selectedRev.preconditions}
                  </p>
                </div>
              )}

              <div>
                <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                  Steps Snapshot ({(selectedRev.stepsSnapshot as StepSnapshot[])?.length || 0})
                </p>
                <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {((selectedRev.stepsSnapshot as StepSnapshot[]) || []).map((step, idx) => (
                    <div key={idx} className="pb-2 last:pb-0 border-b last:border-0 border-slate-800/80">
                      <div className="font-semibold text-indigo-400 mb-0.5">Step {step.stepNumber}</div>
                      <p className="text-slate-200">{step.instruction}</p>
                      {step.expectedResult && (
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          ↳ Expected: {step.expectedResult}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedRev.expectedResult && (
                <div>
                  <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                    Overall Expected Result
                  </p>
                  <p className="text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    {selectedRev.expectedResult}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRev(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
