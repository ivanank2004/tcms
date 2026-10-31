"use client";

import { useActionState, useState, useEffect } from "react";
import { createProjectAction, type ProjectActionResult } from "@/lib/projects/actions";
import { Plus, X, FolderPlus, AlertCircle, Key } from "lucide-react";

export function CreateProjectModal({ workspaceId }: { workspaceId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectKey, setProjectKey] = useState("");
  const [state, formAction, isPending] = useActionState<ProjectActionResult | null, FormData>(
    createProjectAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
      setProjectKey("");
    }
  }, [state?.success]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!projectKey) {
      // Auto-suggest 3-4 letter uppercase key from name
      const words = e.target.value.trim().split(/\s+/);
      let suggested = "";
      if (words.length > 1) {
        suggested = words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
      } else if (words[0]?.length >= 3) {
        suggested = words[0].slice(0, 4).toUpperCase();
      }
      setProjectKey(suggested.replace(/[^A-Z0-9-]/g, ""));
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-sm transition"
      >
        <Plus className="w-4 h-4" />
        New Project
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Create Project</h3>
                  <p className="text-xs text-slate-400">Add an application or product to this workspace</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {state?.error && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-sm text-red-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <span>{state.error}</span>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="project-name">
                  Project Name *
                </label>
                <input
                  id="project-name"
                  name="name"
                  type="text"
                  required
                  onChange={handleNameChange}
                  placeholder="e.g. Mobile Banking App, Checkout API"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="project-key">
                  Project Key (Stable Prefix) *
                </label>
                <div className="relative">
                  <input
                    id="project-key"
                    name="key"
                    type="text"
                    required
                    maxLength={10}
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                    placeholder="e.g. APP, API, CORE"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition uppercase"
                  />
                  <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Unique, uppercase prefix used to format test case IDs (e.g. <code>{projectKey || "APP"}-001</code>). Immutable once created.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="project-desc">
                  Description (Optional)
                </label>
                <textarea
                  id="project-desc"
                  name="description"
                  rows={2}
                  placeholder="Summary of this application or component"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-sm transition flex items-center gap-2"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Create Project"
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
