import { createFileRoute } from "@tanstack/react-router";
import { ProjectOverview } from "@/client/components/project/ProjectOverview";
import { useProjectContext } from "@/client/contexts/ProjectContext";

export const Route = createFileRoute("/_app/projects/$projectId/")({
  component: ProjectOverviewPage
});

function ProjectOverviewPage() {
  const { project } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProjectOverview project={project} />
    </div>
  );
}
