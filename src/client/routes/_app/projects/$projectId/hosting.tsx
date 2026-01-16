import { createFileRoute } from "@tanstack/react-router";
import { ProjectHosting } from "@/client/components/ProjectHosting";
import { useProjectContext } from "@/client/contexts/ProjectContext";

export const Route = createFileRoute("/_app/projects/$projectId/hosting")({
  component: ProjectHostingPage
});

function ProjectHostingPage() {
  const { project, setProject } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProjectHosting
        project={project}
        onUpdate={(updatedProject) => setProject(updatedProject)}
      />
    </div>
  );
}
