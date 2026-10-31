import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getProjectModules } from "@/lib/modules/actions";
import { getProjectTestCases } from "@/lib/test-cases/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CSVImportModal } from "@/components/csv-import-modal";
import { CSVExportButton } from "@/components/csv-export-button";
import { TestCaseActions } from "@/components/test-case-actions";
import {
  PRIORITY_CONFIG,
  LIFECYCLE_CONFIG,
  TEST_TYPE_TAXONOMY,
  PRIORITIES,
  LIFECYCLES,
  type Priority,
  type Lifecycle,
} from "@/lib/test-cases/taxonomy";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Layers,
  ArrowRight,
  GitBranch,
} from "lucide-react";

export default async function TestCasesRepositoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
  searchParams: Promise<{
    search?: string;
    moduleId?: string;
    lifecycle?: string;
    priority?: string;
    testType?: string;
    page?: string;
  }>;
}) {
  const { workspaceSlug, projectKey } = await params;
  const sParams = await searchParams;
  const user = await requireAuth();

  const wsData = await getWorkspaceBySlug(workspaceSlug, user.id);
  if (!wsData) notFound();

  const { workspace, membership } = wsData;
  const project = await getProjectByKey(workspace.id, projectKey);
  if (!project) notFound();

  const modules = await getProjectModules(project.id);

  const currentPage = Number(sParams.page) || 1;
  const result = await getProjectTestCases(project.id, {
    search: sParams.search,
    moduleId: sParams.moduleId,
    lifecycle: sParams.lifecycle as Lifecycle,
    priority: sParams.priority as Priority,
    testType: sParams.testType,
    page: currentPage,
    pageSize: 30,
  });

  const canMutate = membership.role !== "viewer" && project.status === "active";

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Cases" },
        ]}
      />

      {/* Repository Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Test Cases</h1>
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {project.key}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reusable test repository for {project.name} • {result.total} total scenario(s)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <CSVExportButton projectId={project.id} projectKey={project.key} />
          {canMutate && (
            <CSVImportModal
              workspaceId={workspace.id}
              projectId={project.id}
              isProjectArchived={project.status === "archived"}
            />
          )}
          {canMutate && (
            <Link
              href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/new`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Test Case</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
          <input
            name="search"
            defaultValue={sParams.search || ""}
            placeholder="Search by ID, title, or objective..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Module Filter */}
        <select
          name="moduleId"
          defaultValue={sParams.moduleId || ""}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Modules</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Lifecycle Filter */}
        <select
          name="lifecycle"
          defaultValue={sParams.lifecycle || ""}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Lifecycles</option>
          {LIFECYCLES.map((l) => (
            <option key={l} value={l} className="capitalize">
              {LIFECYCLE_CONFIG[l].label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <div className="flex gap-2">
          <select
            name="priority"
            defaultValue={sParams.priority || ""}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p} className="capitalize">
                {PRIORITY_CONFIG[p].label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Test Cases Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {result.items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No test cases found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              {sParams.search || sParams.moduleId || sParams.lifecycle
                ? "No test cases matched your filter criteria."
                : "Create your first reusable test case or import via CSV."}
            </p>
            {canMutate && (
              <Link
                href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/new`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Test Case</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">Title</th>
                  <th scope="col" className="px-4 py-3">Module</th>
                  <th scope="col" className="px-4 py-3">Priority</th>
                  <th scope="col" className="px-4 py-3">Types</th>
                  <th scope="col" className="px-4 py-3">Lifecycle</th>
                  <th scope="col" className="px-4 py-3">Rev</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {result.items.map(({ testCase: tc, moduleName }) => {
                  const priority = tc.priority as Priority;
                  const lifecycle = tc.lifecycle as Lifecycle;

                  return (
                    <tr key={tc.id} className="hover:bg-slate-800/30 transition group">
                      <td className="px-4 py-3 font-mono font-semibold text-indigo-400 shrink-0">
                        <Link
                          href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/${tc.id}`}
                          className="hover:underline"
                        >
                          {tc.stableId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-white max-w-md">
                        <Link
                          href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/${tc.id}`}
                          className="hover:text-indigo-300 transition line-clamp-1"
                        >
                          {tc.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[140px]">
                        {moduleName || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            PRIORITY_CONFIG[priority]?.badgeClass || ""
                          }`}
                        >
                          {PRIORITY_CONFIG[priority]?.label || priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex items-center gap-1 flex-wrap">
                          {tc.testTypes.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {t}
                            </span>
                          ))}
                          {tc.testTypes.length > 2 && (
                            <span className="text-[9px] text-slate-500 font-mono">
                              +{tc.testTypes.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${
                            LIFECYCLE_CONFIG[lifecycle]?.badgeClass || ""
                          }`}
                        >
                          {LIFECYCLE_CONFIG[lifecycle]?.label || lifecycle}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-slate-600" />
                          v{tc.revision}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TestCaseActions
                          workspaceId={workspace.id}
                          projectId={project.id}
                          testCaseId={tc.id}
                          lifecycle={tc.lifecycle}
                          canMutate={canMutate}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            Page {result.page} of {result.totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`?page=${result.page - 1}`}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Previous
              </Link>
            )}
            {result.page < result.totalPages && (
              <Link
                href={`?page=${result.page + 1}`}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
