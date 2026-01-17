import { createFileRoute } from "@tanstack/react-router";
import { ProjectDomains } from "@/client/components/project/domains/ProjectDomains";
import { useProjectContext } from "@/client/contexts/ProjectContext";

export const Route = createFileRoute("/_app/projects/$projectId/domains")({
  component: ProjectDomainsPage
});

function ProjectDomainsPage() {
  const { project, setProject } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProjectDomains
        project={project}
        onUpdate={(updatedProject) => setProject(updatedProject)}
      />
    </div>
  );
}
