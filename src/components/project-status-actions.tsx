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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
        status === "active"
          ? "border-amber-800/80 bg-amber-950/30 text-amber-300 hover:bg-amber-900/50"
          : "border-emerald-800/80 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50"
      }`}
    >
      {isPending ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : status === "active" ? (
        <>
          <Archive className="w-3.5 h-3.5" />
          <span>Archive Project</span>
        </>
      ) : (
        <>
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restore Project</span>
        </>
      )}
    </button>
  );
}
