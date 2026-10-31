"use client";

import { useState } from "react";
import { History, Eye, GitCommit, X } from "lucide-react";
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
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
        <History className="w-3.5 h-3.5 text-zinc-400" />
        <h3 className="text-xs font-medium text-zinc-200">Revision History ({revisions.length})</h3>
      </div>

      <div className="space-y-2">
        {revisions.map(({ revision: rev, changerName }) => {
          const isCurrent = rev.revisionNumber === currentRevisionNumber;

          return (
            <div
              key={rev.id}
              className={`p-2.5 rounded-lg border text-xs transition ${
                isCurrent
                  ? "bg-zinc-800/40 border-zinc-700/80"
                  : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <GitCommit className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-100 font-mono">v{rev.revisionNumber}</span>
                  {isCurrent && (
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-1.5 py-0.2 rounded-md">
                      Current
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRev(rev)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 font-medium inline-flex items-center gap-1 transition"
                >
                  <Eye className="w-3 h-3" />
                  <span>Inspect</span>
                </button>
              </div>

              <p className="text-zinc-400 text-[11px] line-clamp-1">{rev.changeSummary || "Revision updated"}</p>
              <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2 pt-1 border-t border-zinc-800/60 font-mono">
                <span>By {changerName || "User"}</span>
                <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Snapshot Modal */}
      {selectedRev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl p-5 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-zinc-400" />
                <h4 className="font-semibold text-zinc-100 text-sm">
                  Historical Snapshot: v{selectedRev.revisionNumber}
                </h4>
                <span className="text-[10px] text-zinc-500 font-mono">
                  ({new Date(selectedRev.createdAt).toLocaleString()})
                </span>
              </div>
              <button
                onClick={() => setSelectedRev(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs">
              <div>
                <p className="font-medium text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                  Title
                </p>
                <p className="text-zinc-100 font-medium text-xs bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  {selectedRev.title}
                </p>
              </div>

              {selectedRev.preconditions && (
                <div>
                  <p className="font-medium text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                    Preconditions
                  </p>
                  <p className="text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                    {selectedRev.preconditions}
                  </p>
                </div>
              )}

              <div>
                <p className="font-medium text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                  Steps Snapshot ({(selectedRev.stepsSnapshot as StepSnapshot[])?.length || 0})
                </p>
                <div className="space-y-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  {((selectedRev.stepsSnapshot as StepSnapshot[]) || []).map((step, idx) => (
                    <div key={idx} className="pb-2 last:pb-0 border-b last:border-0 border-zinc-800/80">
                      <div className="font-mono font-medium text-zinc-300 text-xs mb-0.5">Step {step.stepNumber}</div>
                      <p className="text-zinc-200">{step.instruction}</p>
                      {step.expectedResult && (
                        <p className="text-zinc-400 text-[11px] mt-0.5">
                          ↳ Expected: {step.expectedResult}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedRev.expectedResult && (
                <div>
                  <p className="font-medium text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                    Overall Expected Result
                  </p>
                  <p className="text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                    {selectedRev.expectedResult}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRev(null)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition"
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
