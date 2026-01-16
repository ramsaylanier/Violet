import { createFileRoute } from "@tanstack/react-router";
import { ProjectIssues } from "@/client/components/project/ProjectIssues";
import { useProjectContext } from "@/client/contexts/ProjectContext";

export const Route = createFileRoute("/_app/projects/$projectId/issues")({
  component: ProjectIssuesPage
});

function ProjectIssuesPage() {
  const { project, setProject } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProjectIssues
        project={project}
        onUpdate={(updatedProject) => setProject(updatedProject)}
      />
    </div>
  );
}
