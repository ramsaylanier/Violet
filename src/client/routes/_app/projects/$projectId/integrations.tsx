import { createFileRoute } from "@tanstack/react-router";
import { ProjectIntegrations } from "@/client/components/ProjectIntegrations";
import { useProjectContext } from "@/client/contexts/ProjectContext";

export const Route = createFileRoute(
  "/_app/projects/$projectId/integrations"
)({
  component: ProjectIntegrationsPage
});

function ProjectIntegrationsPage() {
  const { project, setProject } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProjectIntegrations
        project={project}
        onUpdate={(updatedProject) => setProject(updatedProject)}
      />
    </div>
  );
}
