"use client";

import { useState, useTransition } from "react";
import { syncPlanTestCasesAction } from "@/lib/test-plans/actions";
import { useRouter } from "next/navigation";
import { Edit3, X, AlertTriangle, AlertCircle, Search } from "lucide-react";
import type { TestCase, Module } from "@/db/schema";

export function AddCasesToPlanModal({
  workspaceId,
  projectId,
  planId,
  currentCaseIds,
  availableCases,
  modules,
}: {
  workspaceId: string;
  projectId: string;
  planId: string;
  currentCaseIds: string[];
  availableCases: (TestCase & { moduleName?: string | null })[];
  modules: Module[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>(currentCaseIds);
  const [caseSearch, setCaseSearch] = useState("");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState("");

  const filteredCases = availableCases.filter((c) => {
    if (caseSearch) {
      const q = caseSearch.toLowerCase();
      if (!c.stableId.toLowerCase().includes(q) && !c.title.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selectedModuleFilter && c.moduleId !== selectedModuleFilter) {
      return false;
    }
    return true;
  });

  const toggleCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const deprecatedSelectedCount = selectedCaseIds.filter((id) => {
    const found = availableCases.find((c) => c.id === id);
    return found?.lifecycle === "deprecated";
  }).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await syncPlanTestCasesAction(
        workspaceId,
        projectId,
        planId,
        selectedCaseIds
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-800 transition"
      >
        <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
        <span>Manage Scope Cases</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5 relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-4">
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm">Adjust Test Plan Scope</h3>
                <p className="text-[11px] text-zinc-500">
                  Select test cases for this plan. Ongoing runs retain their snapshots immutably.
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
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span>
                  <strong>{selectedCaseIds.length}</strong> cases selected in plan scope
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    value={caseSearch}
                    onChange={(e) => setCaseSearch(e.target.value)}
                    placeholder="Search cases..."
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <select
                  value={selectedModuleFilter}
                  onChange={(e) => setSelectedModuleFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="">All Modules</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {deprecatedSelectedCount > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {deprecatedSelectedCount} selected test {deprecatedSelectedCount === 1 ? "case is" : "cases are"} <strong>Deprecated</strong>.
                  </span>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 border border-zinc-800/80 rounded-lg p-2 bg-zinc-950/40">
                {filteredCases.map((tc) => {
                  const isChecked = selectedCaseIds.includes(tc.id);
                  const isDeprecated = tc.lifecycle === "deprecated";

                  return (
                    <label
                      key={tc.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs ${
                        isChecked
                          ? "bg-zinc-800/60 border border-zinc-700/80 text-zinc-100"
                          : "hover:bg-zinc-800/30 text-zinc-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCase(tc.id)}
                          className="rounded border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-0"
                        />
                        <span className="font-mono text-zinc-200 font-medium shrink-0">
                          {tc.stableId}
                        </span>
                        <span className="truncate">{tc.title}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[10px]">
                        {tc.moduleName && (
                          <span className="text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                            {tc.moduleName}
                          </span>
                        )}
                        {isDeprecated && (
                          <span className="text-zinc-500 px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 font-medium line-through">
                            Deprecated
                          </span>
                        )}
                        <span className="capitalize text-zinc-400">{tc.priority}</span>
                      </div>
                    </label>
                  );
                })}
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
                  disabled={isPending}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-xs font-medium rounded-lg transition flex items-center gap-2"
                >
                  {isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                  ) : (
                    <span>Save Scope</span>
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
