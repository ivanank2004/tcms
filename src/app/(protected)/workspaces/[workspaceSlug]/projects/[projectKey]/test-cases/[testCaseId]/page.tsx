import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getTestCaseWithHistory } from "@/lib/test-cases/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TestCaseActions } from "@/components/test-case-actions";
import { RevisionViewerClient } from "./revision-viewer-client";
import {
  PRIORITY_CONFIG,
  LIFECYCLE_CONFIG,
  type Priority,
  type Lifecycle,
} from "@/lib/test-cases/taxonomy";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Edit,
  GitBranch,
  Tag,
} from "lucide-react";

export default async function TestCaseDetailPage({
  params,
}: {
  params: Promise<{
    workspaceSlug: string;
    projectKey: string;
    testCaseId: string;
  }>;
}) {
  const { workspaceSlug, projectKey, testCaseId } = await params;
  const user = await requireAuth();

  const wsData = await getWorkspaceBySlug(workspaceSlug, user.id);
  if (!wsData) notFound();

  const { workspace, membership } = wsData;
  const project = await getProjectByKey(workspace.id, projectKey);
  if (!project) notFound();

  const testCase = await getTestCaseWithHistory(testCaseId);
  if (!testCase || testCase.projectId !== project.id) notFound();

  const canMutate = membership.role !== "viewer" && project.status === "active";
  const priority = testCase.priority as Priority;
  const lifecycle = testCase.lifecycle as Lifecycle;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Cases", href: `/workspaces/${workspace.slug}/projects/${project.key}/test-cases` },
          { label: testCase.stableId },
        ]}
      />

      {/* Detail Header */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                {testCase.stableId}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md border capitalize ${
                  LIFECYCLE_CONFIG[lifecycle]?.badgeClass || ""
                }`}
              >
                {LIFECYCLE_CONFIG[lifecycle]?.label || lifecycle}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                  PRIORITY_CONFIG[priority]?.badgeClass || ""
                }`}
              >
                {PRIORITY_CONFIG[priority]?.label || priority}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                <GitBranch className="w-3 h-3 text-zinc-500" />
                v{testCase.revision}
              </span>
            </div>

            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">{testCase.title}</h1>

            {testCase.description && (
              <p className="text-xs text-zinc-400 max-w-3xl">{testCase.description}</p>
            )}

            <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1 font-mono flex-wrap">
              <span>Module: {testCase.module?.name || "Unassigned"}</span>
              <span>•</span>
              <span>Author: {testCase.creator?.name || "User"}</span>
              <span>•</span>
              <span>Created: {new Date(testCase.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {canMutate && (
              <Link
                href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/${testCase.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium rounded-lg transition"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Case</span>
              </Link>
            )}
            <TestCaseActions
              workspaceId={workspace.id}
              projectId={project.id}
              testCaseId={testCase.id}
              lifecycle={testCase.lifecycle}
              canMutate={canMutate}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Specification vs Revision History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Specification */}
        <div className="lg:col-span-2 space-y-5">
          {/* Preconditions */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-1.5">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Preconditions
            </h3>
            <p className="text-xs text-zinc-200">
              {testCase.preconditions || <span className="text-zinc-600 italic">None specified</span>}
            </p>
          </div>

          {/* Ordered Test Steps */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Ordered Test Steps ({testCase.steps.length})
            </h3>

            {testCase.steps.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No structured steps provided.</p>
            ) : (
              <div className="space-y-2">
                {testCase.steps.map((step) => (
                  <div
                    key={step.id}
                    className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-medium text-zinc-300">
                        Step {step.stepNumber}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200">{step.instruction}</p>
                    {step.expectedResult && (
                      <div className="text-xs text-zinc-300 bg-zinc-900/60 px-2.5 py-1 rounded border border-zinc-800 mt-1">
                        <span className="text-zinc-500 text-[11px]">Expected: </span>
                        <span>{step.expectedResult}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overall Expected Result */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-1.5">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Overall Expected Result
            </h3>
            <p className="text-xs text-zinc-200">
              {testCase.expectedResult || <span className="text-zinc-600 italic">None specified</span>}
            </p>
          </div>

          {/* Test Types & Tags */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
            <div>
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Test Type Taxonomy
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {testCase.testTypes.length === 0 ? (
                  <span className="text-xs text-zinc-600 italic">No types assigned</span>
                ) : (
                  testCase.testTypes.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                    >
                      {t}
                    </span>
                  ))
                )}
              </div>
            </div>

            {testCase.tags.length > 0 && (
              <div className="pt-2.5 border-t border-zinc-800/80">
                <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {testCase.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3 text-zinc-500" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Immutable Revision History */}
        <div className="space-y-5">
          <RevisionViewerClient
            revisions={testCase.revisions}
            currentRevisionNumber={testCase.revision}
          />
        </div>
      </div>
    </div>
  );
}
