"use client";

import { useState, useTransition } from "react";
import { createTestPlanAction } from "@/lib/test-plans/actions";
import { useRouter } from "next/navigation";
import { Plus, X, AlertTriangle, AlertCircle, Search, FolderGit2 } from "lucide-react";
import type { TestCase, Module } from "@/db/schema";

export function CreateTestPlanModal({
  workspaceId,
  projectId,
  availableCases,
  modules,
}: {
  workspaceId: string;
  projectId: string;
  availableCases: (TestCase & { moduleName?: string | null })[];
  modules: Module[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const [name, setName] = useState("");
  const [targetRelease, setTargetRelease] = useState("");
  const [environment, setEnvironment] = useState("Staging");
  const [description, setDescription] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  // Filter state for case selection inside modal
  const [caseSearch, setCaseSearch] = useState("");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState("");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("");

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
    if (selectedPriorityFilter && c.priority !== selectedPriorityFilter) {
      return false;
    }
    return true;
  });

  const toggleCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const idsToAdd = filteredCases.map((c) => c.id);
    setSelectedCaseIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const deselectAllFiltered = () => {
    const idsToRemove = new Set(filteredCases.map((c) => c.id));
    setSelectedCaseIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
  };

  const deprecatedSelectedCount = selectedCaseIds.filter((id) => {
    const found = availableCases.find((c) => c.id === id);
    return found?.lifecycle === "deprecated";
  }).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await createTestPlanAction(null, {
        workspaceId,
        projectId,
        name,
        targetRelease: targetRelease || undefined,
        environment: environment || undefined,
        description: description || undefined,
        scopeNotes: scopeNotes || undefined,
        plannedStartDate: plannedStartDate || undefined,
        dueDate: dueDate || undefined,
        status: "active",
        testCaseIds: selectedCaseIds,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setIsOpen(false);
        setName("");
        setTargetRelease("");
        setDescription("");
        setScopeNotes("");
        setSelectedCaseIds([]);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
      >
        <Plus className="w-4 h-4" />
        <span>New Test Plan</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Create Test Plan</h3>
                  <p className="text-xs text-slate-400">
                    Define objectives, target release, environment, and scope repository cases.
                  </p>
                </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="planName">
                    Plan Name *
                  </label>
                  <input
                    id="planName"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Q3 Release Smoke & Sanity"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="targetRelease">
                    Target Release / Build Version
                  </label>
                  <input
                    id="targetRelease"
                    value={targetRelease}
                    onChange={(e) => setTargetRelease(e.target.value)}
                    placeholder="e.g. v2.4.0-rc1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="environment">
                    Target Environment
                  </label>
                  <input
                    id="environment"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    placeholder="e.g. Staging, Production, UAT"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="plannedStartDate">
                    Planned Start Date
                  </label>
                  <input
                    id="plannedStartDate"
                    type="date"
                    value={plannedStartDate}
                    onChange={(e) => setPlannedStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="dueDate">
                    Due Date
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="scopeNotes">
                    Scope & Objectives
                  </label>
                  <textarea
                    id="scopeNotes"
                    rows={2}
                    value={scopeNotes}
                    onChange={(e) => setScopeNotes(e.target.value)}
                    placeholder="Scope boundaries, test coverage intent, critical areas to test..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Case Selection */}
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      Select Scope Cases ({selectedCaseIds.length} of {availableCases.length} selected)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Runs instantiated from this plan will execute these cases.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Select Filtered
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={deselectAllFiltered}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Clear Filtered
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      value={caseSearch}
                      onChange={(e) => setCaseSearch(e.target.value)}
                      placeholder="Filter cases..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedModuleFilter}
                    onChange={(e) => setSelectedModuleFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">All Modules</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedPriorityFilter}
                    onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none capitalize"
                  >
                    <option value="">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
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

                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 border border-slate-800/80 rounded-lg p-2 bg-slate-900/40">
                  {filteredCases.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No test cases match filter.
                    </div>
                  ) : (
                    filteredCases.map((tc) => {
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
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !name.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2"
                >
                  {isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Create Test Plan</span>
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
