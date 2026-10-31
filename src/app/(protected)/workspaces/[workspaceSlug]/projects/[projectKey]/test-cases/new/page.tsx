import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getProjectModules } from "@/lib/modules/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TestCaseCreateForm } from "./test-case-create-form";
import { notFound, redirect } from "next/navigation";

export default async function NewTestCasePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
}) {
  const { workspaceSlug, projectKey } = await params;
  const user = await requireAuth();

  const wsData = await getWorkspaceBySlug(workspaceSlug, user.id);
  if (!wsData) notFound();

  const { workspace, membership } = wsData;
  const project = await getProjectByKey(workspace.id, projectKey);
  if (!project) notFound();

  if (membership.role === "viewer" || project.status === "archived") {
    redirect(`/workspaces/${workspace.slug}/projects/${project.key}/test-cases`);
  }

  const modules = await getProjectModules(project.id);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Cases", href: `/workspaces/${workspace.slug}/projects/${project.key}/test-cases` },
          { label: "New Test Case" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Create Test Case</h1>
        <p className="text-xs text-slate-400 mt-1">
          Define reusable test scenario for project <strong>{project.name}</strong>. A stable ID will be automatically assigned.
        </p>
      </div>

      <TestCaseCreateForm
        workspaceId={workspace.id}
        projectId={project.id}
        workspaceSlug={workspace.slug}
        projectKey={project.key}
        modules={modules}
      />
    </div>
  );
}
