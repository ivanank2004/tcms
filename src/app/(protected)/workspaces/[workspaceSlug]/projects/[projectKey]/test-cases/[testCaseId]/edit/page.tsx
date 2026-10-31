import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getProjectModules } from "@/lib/modules/actions";
import { getTestCaseWithHistory } from "@/lib/test-cases/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TestCaseEditForm } from "./test-case-edit-form";
import { notFound, redirect } from "next/navigation";

export default async function TestCaseEditPage({
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

  if (membership.role === "viewer" || project.status === "archived") {
    redirect(`/workspaces/${workspaceSlug}/projects/${projectKey}/test-cases/${testCaseId}`);
  }

  const testCase = await getTestCaseWithHistory(testCaseId);
  if (!testCase || testCase.projectId !== project.id) notFound();

  const modules = await getProjectModules(project.id);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Cases", href: `/workspaces/${workspace.slug}/projects/${project.key}/test-cases` },
          { label: testCase.stableId, href: `/workspaces/${workspace.slug}/projects/${project.key}/test-cases/${testCase.id}` },
          { label: "Edit" },
        ]}
      />

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Edit Test Case {testCase.stableId}
        </h1>
        <p className="text-sm text-slate-400">
          Modify specification, steps, and metadata. Substantive changes will be tracked in version history.
        </p>
      </div>

      <TestCaseEditForm
        workspaceId={workspace.id}
        projectId={project.id}
        workspaceSlug={workspace.slug}
        projectKey={project.key}
        modules={modules}
        testCase={testCase}
      />
    </div>
  );
}
