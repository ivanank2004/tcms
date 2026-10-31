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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium rounded-lg transition"
      >
        <Plus className="w-3.5 h-3.5" />
        New Project
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-5 relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm">Create Project</h3>
                  <p className="text-[11px] text-zinc-500">Add an application or product to this workspace</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {state?.error && (
              <div className="mb-4 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                <span>{state.error}</span>
              </div>
            )}

            <form action={formAction} className="space-y-3.5">
              <input type="hidden" name="workspaceId" value={workspaceId} />

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="project-name">
                  Project Name *
                </label>
                <input
                  id="project-name"
                  name="name"
                  type="text"
                  required
                  onChange={handleNameChange}
                  placeholder="e.g. Core API Gateway, Auth Microservice, Billing Engine"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="project-key">
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
                    className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition uppercase"
                  />
                  <Key className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                  Prefix for test cases (e.g. {projectKey || "APP"}-001).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="project-desc">
                  Description (Optional)
                </label>
                <textarea
                  id="project-desc"
                  name="description"
                  rows={2}
                  placeholder="Summary of this application or component"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 mt-5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 text-xs font-medium rounded-lg transition flex items-center gap-2"
                >
                  {isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
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
