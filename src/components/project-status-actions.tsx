"use client";

import { useTransition } from "react";
import { archiveProjectAction, restoreProjectAction } from "@/lib/projects/actions";
import { Archive, RotateCcw } from "lucide-react";

export function ProjectStatusActions({
  workspaceId,
  projectId,
  status,
  canManage = false,
}: {
  workspaceId: string;
  projectId: string;
  status: "active" | "archived" | string;
  canManage?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (!canManage) return null;

  const handleToggle = () => {
    if (status === "active") {
      if (
        !confirm(
          "Are you sure you want to archive this project? Archived projects cannot receive new content unless restored."
        )
      ) {
        return;
      }
      startTransition(async () => {
        await archiveProjectAction(workspaceId, projectId);
      });
    } else {
      startTransition(async () => {
        await restoreProjectAction(workspaceId, projectId);
      });
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
    >
      {isPending ? (
        <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      ) : status === "active" ? (
        <>
          <Archive className="w-3.5 h-3.5" />
          <span>Archive</span>
        </>
      ) : (
        <>
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restore</span>
        </>
      )}
    </button>
  );
}
