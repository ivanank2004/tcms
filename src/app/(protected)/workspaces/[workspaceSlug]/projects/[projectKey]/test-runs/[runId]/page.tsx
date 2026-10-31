import { requireAuth } from "@/lib/auth/session";
import { getWorkspaceBySlug } from "@/lib/workspaces/actions";
import { getProjectByKey } from "@/lib/projects/actions";
import { getTestRunWithExecutionDetails } from "@/lib/test-runs/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RunExecutionRunner } from "@/components/run-execution-runner";
import { notFound } from "next/navigation";

export default async function TestRunExecutionPage({
  params,
}: {
  params: Promise<{
    workspaceSlug: string;
    projectKey: string;
    runId: string;
  }>;
}) {
  const { workspaceSlug, projectKey, runId } = await params;
  const user = await requireAuth();

  const wsData = await getWorkspaceBySlug(workspaceSlug, user.id);
  if (!wsData) notFound();

  const { workspace, membership } = wsData;
  const project = await getProjectByKey(workspace.id, projectKey);
  if (!project) notFound();

  const run = await getTestRunWithExecutionDetails(runId);
  if (!run || run.projectId !== project.id) notFound();

  const canMutate = membership.role !== "viewer" && project.status === "active";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: workspace.name, href: `/workspaces/${workspace.slug}` },
          { label: project.name, href: `/workspaces/${workspace.slug}/projects/${project.key}` },
          { label: "Test Runs", href: `/workspaces/${workspace.slug}/projects/${project.key}/test-runs` },
          { label: run.name },
        ]}
      />

      <RunExecutionRunner
        workspaceId={workspace.id}
        projectId={project.id}
        workspaceSlug={workspace.slug}
        projectKey={project.key}
        run={{
          ...run,
          planName: run.plan?.name,
          assigneeName: run.assignee?.name,
        }}
        canMutate={canMutate}
      />
    </div>
  );
}
