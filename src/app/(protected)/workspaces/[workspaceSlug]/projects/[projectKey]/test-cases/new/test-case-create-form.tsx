"use client";

import { useState, useTransition } from "react";
import { createTestCaseAction, type StepInput } from "@/lib/test-cases/actions";
import { OrderedStepsEditor } from "@/components/ordered-steps-editor";
import { TEST_TYPE_TAXONOMY, PRIORITIES, LIFECYCLES, type Priority, type Lifecycle } from "@/lib/test-cases/taxonomy";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Module } from "@/db/schema";

export function TestCaseCreateForm({
  workspaceId,
  projectId,
  workspaceSlug,
  projectKey,
  modules,
}: {
  workspaceId: string;
  projectId: string;
  workspaceSlug: string;
  projectKey: string;
  modules: Module[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [lifecycle, setLifecycle] = useState<Lifecycle>("draft");
  const [preconditions, setPreconditions] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["Positive"]);
  const [tagsInput, setTagsInput] = useState("");
  const [steps, setSteps] = useState<StepInput[]>([
    { stepNumber: 1, instruction: "", expectedResult: "" },
  ]);

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
      const res = await createTestCaseAction(null, {
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
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.testCase) {
        router.push(`/workspaces/${workspaceSlug}/projects/${projectKey}/test-cases/${res.testCase.id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
      {errorMsg && (
        <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider">General Information</h3>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="title">
            Title *
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Verify user can authenticate with valid credentials"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="module">
              Module
            </label>
            <select
              id="module"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
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
            <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="priority">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 capitalize transition"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="lifecycle">
              Lifecycle Readiness
            </label>
            <select
              id="lifecycle"
              value={lifecycle}
              onChange={(e) => setLifecycle(e.target.value as Lifecycle)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 capitalize transition"
            >
              <option value="draft">Draft (Work in progress)</option>
              <option value="ready">Ready (Approved for testing)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Test Type Taxonomy (Multi-label)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TEST_TYPE_TAXONOMY.map((t) => {
              const selected = selectedTypes.includes(t);
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition ${
                    selected
                      ? "bg-zinc-800 border-zinc-600 text-zinc-100 font-medium"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. smoke, regression, auth, p1, v2.4 (comma-separated)"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
          />
        </div>
      </div>

      {/* Preconditions & Steps */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Execution Definition</h3>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="preconditions">
            Preconditions
          </label>
          <textarea
            id="preconditions"
            rows={2}
            value={preconditions}
            onChange={(e) => setPreconditions(e.target.value)}
            placeholder="e.g. User is logged in as registered buyer with items in cart"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
          />
        </div>

        {/* Dynamic Ordered Steps */}
        <OrderedStepsEditor steps={steps} onChange={setSteps} />

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="expectedResult">
            Overall Expected Result {lifecycle === "ready" && "*"}
          </label>
          <textarea
            id="expectedResult"
            rows={2}
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
            placeholder="e.g. Order is placed, confirmation email received, order appears in history"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
          />
        </div>
      </div>

      {/* Form Submit Footer */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href={`/workspaces/${workspaceSlug}/projects/${projectKey}/test-cases`}
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Repository</span>
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 text-xs font-medium rounded-lg transition flex items-center gap-2"
        >
          {isPending ? (
            <div className="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
          ) : (
            <span>Create Test Case</span>
          )}
        </button>
      </div>
    </form>
  );
}
