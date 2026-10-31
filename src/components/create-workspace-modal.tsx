"use client";

import { useActionState, useState, useEffect } from "react";
import { createWorkspaceAction, type WorkspaceActionResult } from "@/lib/workspaces/actions";
import { Plus, X, Building2, AlertCircle } from "lucide-react";

export function CreateWorkspaceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<WorkspaceActionResult | null, FormData>(
    createWorkspaceAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state?.success]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-sm transition"
      >
        <Plus className="w-4 h-4" />
        New Workspace
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Create Workspace</h3>
                  <p className="text-xs text-slate-400">Isolated workspace for your projects and tests</p>
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
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="ws-name">
                  Workspace Name *
                </label>
                <input
                  id="ws-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Core Engineering, Acme Corp"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="ws-slug">
                  Slug / Identifier (Optional)
                </label>
                <input
                  id="ws-slug"
                  name="slug"
                  type="text"
                  placeholder="e.g. acme-corp (auto-generated if empty)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="ws-desc">
                  Description (Optional)
                </label>
                <textarea
                  id="ws-desc"
                  name="description"
                  rows={2}
                  placeholder="Brief description of this workspace"
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
                    "Create Workspace"
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
