"use client";

import { useState, useTransition } from "react";
import { updateTestCaseAction, type StepInput } from "@/lib/test-cases/actions";
import { OrderedStepsEditor } from "@/components/ordered-steps-editor";
import {
  TEST_TYPE_TAXONOMY,
  PRIORITIES,
  LIFECYCLES,
  type Priority,
  type Lifecycle,
} from "@/lib/test-cases/taxonomy";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, GitCommit } from "lucide-react";
import Link from "next/link";
import type { Module } from "@/db/schema";

export function TestCaseEditForm({
  workspaceId,
  projectId,
  workspaceSlug,
  projectKey,
  modules,
  testCase,
}: {
  workspaceId: string;
  projectId: string;
  workspaceSlug: string;
  projectKey: string;
  modules: Module[];
  testCase: {
    id: string;
    stableId: string;
    title: string;
    description: string | null;
    moduleId: string | null;
    priority: string;
    lifecycle: string;
    testTypes: string[];
    tags: string[];
    preconditions: string | null;
    expectedResult: string | null;
    revision: number;
    steps: {
      stepNumber: number;
      instruction: string;
      expectedResult: string | null;
    }[];
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState(testCase.title);
  const [moduleId, setModuleId] = useState(testCase.moduleId || "");
  const [priority, setPriority] = useState<Priority>(testCase.priority as Priority);
  const [lifecycle, setLifecycle] = useState<Lifecycle>(testCase.lifecycle as Lifecycle);
  const [preconditions, setPreconditions] = useState(testCase.preconditions || "");
  const [expectedResult, setExpectedResult] = useState(testCase.expectedResult || "");
  const [description, setDescription] = useState(testCase.description || "");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(testCase.testTypes || ["Positive"]);
  const [tagsInput, setTagsInput] = useState((testCase.tags || []).join(", "));
  const [changeSummary, setChangeSummary] = useState("");

  const [steps, setSteps] = useState<StepInput[]>(
    testCase.steps.length > 0
      ? testCase.steps.map((s) => ({
          stepNumber: s.stepNumber,
          instruction: s.instruction,
          expectedResult: s.expectedResult || "",
        }))
      : [{ stepNumber: 1, instruction: "", expectedResult: "" }]
  );

  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const tags = tagsInput
      .split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      const res = await updateTestCaseAction(null, {
        testCaseId: testCase.id,
        workspaceId,
        projectId,
        moduleId: moduleId || undefined,
        title,
        description: description || undefined,
        preconditions: preconditions || undefined,
        expectedResult: expectedResult || undefined,
        priority,
        lifecycle,
        testTypes: selectedTypes,
        tags,
        steps,
        changeSummary: changeSummary || undefined,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.testCase) {
        router.push(
          `/workspaces/${workspaceSlug}/projects/${projectKey}/test-cases/${res.testCase.id}`
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {errorMsg && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-sm text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Revision Notice */}
      <div className="p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-xl flex items-center justify-between text-xs text-indigo-300">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-indigo-400" />
          <span>
            Editing <strong className="font-mono text-white">{testCase.stableId}</strong> (Current
            revision: <strong>v{testCase.revision}</strong>)
          </span>
        </div>
        <span className="text-slate-400">
          Substantive changes will automatically increment revision number.
        </span>
      </div>

      {/* Basic Information */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">General Information</h3>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="title">
            Title *
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Verify user can check out with valid credit card"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional context or notes..."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="module">
              Module
            </label>
            <select
              id="module"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">None (Unassigned)</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="priority">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="lifecycle">
              Lifecycle Readiness
            </label>
            <select
              id="lifecycle"
              value={lifecycle}
              onChange={(e) => setLifecycle(e.target.value as Lifecycle)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize"
            >
              {LIFECYCLES.map((lc) => (
                <option key={lc} value={lc}>
                  {lc.charAt(0).toUpperCase() + lc.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Test Type Taxonomy (Multi-label)
          </label>
          <div className="flex flex-wrap gap-2">
            {TEST_TYPE_TAXONOMY.map((t) => {
              const selected = selectedTypes.includes(t);
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition ${
                    selected
                      ? "bg-indigo-600/30 border-indigo-500 text-indigo-300 font-medium"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. smoke, regression, checkout, v1.2 (comma-separated)"
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Preconditions & Steps */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Execution Definition</h3>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="preconditions">
            Preconditions
          </label>
          <textarea
            id="preconditions"
            rows={2}
            value={preconditions}
            onChange={(e) => setPreconditions(e.target.value)}
            placeholder="e.g. User is logged in as registered buyer with items in cart"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Dynamic Ordered Steps */}
        <OrderedStepsEditor steps={steps} onChange={setSteps} />

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="expectedResult">
            Overall Expected Result {lifecycle === "ready" && "*"}
          </label>
          <textarea
            id="expectedResult"
            rows={2}
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
            placeholder="e.g. Order is placed, confirmation email received, order appears in history"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="changeSummary">
            Revision Change Summary (Optional)
          </label>
          <input
            id="changeSummary"
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            placeholder="e.g. Updated step 2 to reflect new OAuth consent screen"
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Form Submit Footer */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href={`/workspaces/${workspaceSlug}/projects/${projectKey}/test-cases/${testCase.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel & Return</span>
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2"
        >
          {isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </div>
    </form>
  );
}
