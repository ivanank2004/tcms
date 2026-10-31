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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
      >
        <Edit3 className="w-3.5 h-3.5" />
        <span>Manage Scope Cases</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-semibold text-white text-sm">Adjust Test Plan Scope</h3>
                <p className="text-xs text-slate-400">
                  Select test cases for this plan. Modifying plan scope does not modify previously completed or ongoing test runs.
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
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  <strong>{selectedCaseIds.length}</strong> cases currently selected in plan scope
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    value={caseSearch}
                    onChange={(e) => setCaseSearch(e.target.value)}
                    placeholder="Search cases..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <select
                  value={selectedModuleFilter}
                  onChange={(e) => setSelectedModuleFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
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
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {deprecatedSelectedCount} selected test {deprecatedSelectedCount === 1 ? "case is" : "cases are"} <strong>Deprecated</strong>.
                  </span>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-lg p-2 bg-slate-950/40">
                {filteredCases.map((tc) => {
                  const isChecked = selectedCaseIds.includes(tc.id);
                  const isDeprecated = tc.lifecycle === "deprecated";

                  return (
                    <label
                      key={tc.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs ${
                        isChecked
                          ? "bg-indigo-950/40 border border-indigo-800/60 text-slate-100"
                          : "hover:bg-slate-800/50 text-slate-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCase(tc.id)}
                          className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                        />
                        <span className="font-mono text-indigo-300 font-semibold shrink-0">
                          {tc.stableId}
                        </span>
                        <span className="truncate">{tc.title}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[10px]">
                        {tc.moduleName && (
                          <span className="text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {tc.moduleName}
                          </span>
                        )}
                        {isDeprecated && (
                          <span className="text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-medium">
                            Deprecated
                          </span>
                        )}
                        <span className="capitalize text-slate-400">{tc.priority}</span>
                      </div>
                    </label>
                  );
                })}
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
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2"
                >
                  {isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
