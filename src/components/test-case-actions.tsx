"use client";

import { useTransition } from "react";
import { duplicateTestCaseAction, deprecateTestCaseAction } from "@/lib/test-cases/actions";
import { Copy, Ban } from "lucide-react";
import { useRouter } from "next/navigation";

export function TestCaseActions({
  workspaceId,
  projectId,
  testCaseId,
  lifecycle,
  canMutate = false,
}: {
  workspaceId: string;
  projectId: string;
  testCaseId: string;
  lifecycle: string;
  canMutate?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!canMutate) return null;

  const handleDuplicate = () => {
    startTransition(async () => {
      const res = await duplicateTestCaseAction(workspaceId, projectId, testCaseId);
      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleDeprecate = () => {
    if (!confirm("Are you sure you want to deprecate this test case?")) return;
    startTransition(async () => {
      const res = await deprecateTestCaseAction(workspaceId, projectId, testCaseId);
      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleDuplicate}
        disabled={isPending}
        title="Duplicate Test Case"
        className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      {lifecycle !== "deprecated" && (
        <button
          onClick={handleDeprecate}
          disabled={isPending}
          title="Deprecate Test Case"
          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition"
        >
          <Ban className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
