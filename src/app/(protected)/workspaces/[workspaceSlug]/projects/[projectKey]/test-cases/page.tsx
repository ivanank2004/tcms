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
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Cases" },
        ]}
      />

      {/* Repository Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Test Cases</h1>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              {project.key}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Repository for {project.name} • {result.total} scenario(s)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Test Case</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            name="search"
            defaultValue={sParams.search || ""}
            placeholder="Search by ID, title, or objective..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Module Filter */}
        <select
          name="moduleId"
          defaultValue={sParams.moduleId || ""}
          className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
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
          className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
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
            className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
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
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 rounded-lg transition"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Test Cases Table */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
        {result.items.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 text-zinc-400 flex items-center justify-center mx-auto mb-3 border border-zinc-800">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No test cases found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
              {sParams.search || sParams.moduleId || sParams.lifecycle
                ? "No test cases matched your filter criteria."
                : "Create your first reusable test case or import via CSV."}
            </p>
            {canMutate && (
              <Link
                href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/new`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Test Case</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/70 text-zinc-400 border-b border-zinc-800/80 font-medium">
                <tr>
                  <th scope="col" className="px-4 py-2.5">ID</th>
                  <th scope="col" className="px-4 py-2.5">Title</th>
                  <th scope="col" className="px-4 py-2.5">Module</th>
                  <th scope="col" className="px-4 py-2.5">Priority</th>
                  <th scope="col" className="px-4 py-2.5">Types</th>
                  <th scope="col" className="px-4 py-2.5">Lifecycle</th>
                  <th scope="col" className="px-4 py-2.5">Rev</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {result.items.map(({ testCase: tc, moduleName }) => {
                  const priority = tc.priority as Priority;
                  const lifecycle = tc.lifecycle as Lifecycle;

                  return (
                    <tr key={tc.id} className="hover:bg-zinc-900/50 transition group">
                      <td className="px-4 py-2.5 font-mono font-medium text-zinc-200 shrink-0">
                        <Link
                          href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/${tc.id}`}
                          className="hover:underline"
                        >
                          {tc.stableId}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-zinc-200 max-w-md">
                        <Link
                          href={`/workspaces/${workspace.slug}/projects/${project.key}/test-cases/${tc.id}`}
                          className="hover:text-white transition line-clamp-1"
                        >
                          {tc.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-400 truncate max-w-[140px]">
                        {moduleName || <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                            PRIORITY_CONFIG[priority]?.badgeClass || ""
                          }`}
                        >
                          {PRIORITY_CONFIG[priority]?.label || priority}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <div className="flex items-center gap-1 flex-wrap">
                          {tc.testTypes.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[9px] px-1.5 py-0.2 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800"
                            >
                              {t}
                            </span>
                          ))}
                          {tc.testTypes.length > 2 && (
                            <span className="text-[9px] text-zinc-500 font-mono">
                              +{tc.testTypes.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md border capitalize ${
                            LIFECYCLE_CONFIG[lifecycle]?.badgeClass || ""
                          }`}
                        >
                          {LIFECYCLE_CONFIG[lifecycle]?.label || lifecycle}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-zinc-600" />
                          v{tc.revision}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
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
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
          <span>
            Page {result.page} of {result.totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`?page=${result.page - 1}`}
                className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition"
              >
                Previous
              </Link>
            )}
            {result.page < result.totalPages && (
              <Link
                href={`?page=${result.page + 1}`}
                className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition"
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
