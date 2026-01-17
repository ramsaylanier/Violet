import { createFileRoute } from "@tanstack/react-router";
import { ProjectDeployments } from "@/client/components/project/deployments/ProjectDeployments";
import { useProjectContext } from "@/client/contexts/ProjectContext";

export const Route = createFileRoute("/_app/projects/$projectId/deployments/")({
  component: ProjectDeploymentsPage
});

function ProjectDeploymentsPage() {
  const { project, setProject } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProjectDeployments
        project={project}
        onUpdate={(updatedProject) => setProject(updatedProject)}
      />
    </div>
  );
}
