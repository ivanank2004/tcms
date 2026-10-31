"use client";

import { useTransition } from "react";
import { archiveModuleAction, restoreModuleAction } from "@/lib/modules/actions";
import { Archive, RotateCcw } from "lucide-react";

export function ModuleStatusActions({
  workspaceId,
  projectId,
  moduleId,
  status,
  isProjectArchived = false,
  canManage = false,
}: {
  workspaceId: string;
  projectId: string;
  moduleId: string;
  status: "active" | "archived" | string;
  isProjectArchived?: boolean;
  canManage?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (!canManage || isProjectArchived) return null;

  const handleToggle = () => {
    if (status === "active") {
      startTransition(async () => {
        await archiveModuleAction(workspaceId, projectId, moduleId);
      });
    } else {
      startTransition(async () => {
        await restoreModuleAction(workspaceId, projectId, moduleId);
      });
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={status === "active" ? "Archive Module" : "Restore Module"}
      className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
    >
      {isPending ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : status === "active" ? (
        <Archive className="w-3.5 h-3.5" />
      ) : (
        <RotateCcw className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
