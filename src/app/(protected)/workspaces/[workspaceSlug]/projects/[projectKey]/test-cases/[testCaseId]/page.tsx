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
  CheckSquare,
  Edit,
  FolderTree,
  GitBranch,
  Calendar,
  User,
  Tag,
  FileText,
  AlertCircle,
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {testCase.stableId}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
                  LIFECYCLE_CONFIG[lifecycle]?.badgeClass || ""
                }`}
              >
                {LIFECYCLE_CONFIG[lifecycle]?.label || lifecycle}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  PRIORITY_CONFIG[priority]?.badgeClass || ""
                }`}
              >
                {PRIORITY_CONFIG[priority]?.label || priority}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                <GitBranch className="w-3 h-3 text-indigo-400" />
                Revision v{testCase.revision}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">{testCase.title}</h1>

            {testCase.description && (
              <p className="text-sm text-slate-400 max-w-3xl">{testCase.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 font-mono flex-wrap">
              <span>Module: {testCase.module?.name || "Unassigned"}</span>
              <span>•</span>
              <span>Author: {testCase.creator?.name || "User"}</span>
              <span>•</span>
              <span>Created: {new Date(testCase.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {canMutate && (
              <Link
                href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/${testCase.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-sm transition"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Specification */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preconditions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Preconditions
            </h3>
            <p className="text-sm text-slate-200">
              {testCase.preconditions || <span className="text-slate-600 italic">None specified</span>}
            </p>
          </div>

          {/* Ordered Test Steps */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ordered Test Steps ({testCase.steps.length})
            </h3>

            {testCase.steps.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No structured steps provided.</p>
            ) : (
              <div className="space-y-3">
                {testCase.steps.map((step) => (
                  <div
                    key={step.id}
                    className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        Step {step.stepNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-100 font-medium">{step.instruction}</p>
                    {step.expectedResult && (
                      <div className="text-xs text-emerald-400/90 bg-emerald-950/20 px-2.5 py-1.5 rounded border border-emerald-900/40 mt-1">
                        <span className="font-semibold text-emerald-300">Expected: </span>
                        <span>{step.expectedResult}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overall Expected Result */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Overall Expected Result
            </h3>
            <p className="text-sm text-slate-200">
              {testCase.expectedResult || <span className="text-slate-600 italic">None specified</span>}
            </p>
          </div>

          {/* Test Types & Tags */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Test Type Taxonomy
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {testCase.testTypes.length === 0 ? (
                  <span className="text-xs text-slate-600 italic">No types assigned</span>
                ) : (
                  testCase.testTypes.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                    >
                      {t}
                    </span>
                  ))
                )}
              </div>
            </div>

            {testCase.tags.length > 0 && (
              <div className="pt-3 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {testCase.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3 text-slate-500" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Immutable Revision History */}
        <div className="space-y-6">
          <RevisionViewerClient
            revisions={testCase.revisions}
            currentRevisionNumber={testCase.revision}
          />
        </div>
      </div>
    </div>
  );
}
