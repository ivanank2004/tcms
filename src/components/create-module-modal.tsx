"use client";

import { useActionState, useState, useEffect } from "react";
import { createModuleAction, type ModuleActionResult } from "@/lib/modules/actions";
import { Plus, X, AlertCircle, FolderTree } from "lucide-react";
import type { Module } from "@/db/schema";

export function CreateModuleModal({
  workspaceId,
  projectId,
  availableParentModules = [],
  isProjectArchived = false,
}: {
  workspaceId: string;
  projectId: string;
  availableParentModules?: Module[];
  isProjectArchived?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ModuleActionResult | null, FormData>(
    createModuleAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state?.success]);

  if (isProjectArchived) {
    return (
      <button
        disabled
        title="Project is archived. Restore project to add modules."
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-medium rounded-lg cursor-not-allowed"
      >
        <Plus className="w-3.5 h-3.5" />
        New Module (Archived)
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium rounded-lg transition"
      >
        <Plus className="w-3.5 h-3.5" />
        New Module
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-5 relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm">Create Module</h3>
                  <p className="text-[11px] text-zinc-500">Organize test cases under features or subsystems</p>
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
              <input type="hidden" name="projectId" value={projectId} />

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="module-name">
                  Module Name *
                </label>
                <input
                  id="module-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Authentication, User Management, API Gateway, Reporting"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="parent-module">
                  Parent Module (Optional)
                </label>
                <select
                  id="parent-module"
                  name="parentModuleId"
                  defaultValue=""
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                >
                  <option value="">None (Top-level Module)</option>
                  {availableParentModules.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Nest this feature one level beneath an existing top-level module.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1" htmlFor="module-desc">
                  Description (Optional)
                </label>
                <textarea
                  id="module-desc"
                  name="description"
                  rows={2}
                  placeholder="Scope or acceptance criteria for this module"
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
                    "Create Module"
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
