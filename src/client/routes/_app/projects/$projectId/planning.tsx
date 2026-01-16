import { createFileRoute } from "@tanstack/react-router";
import { ProjectPlanning } from "@/client/components/ProjectPlanning";
import { useProjectContext } from "@/client/contexts/ProjectContext";

export const Route = createFileRoute("/_app/projects/$projectId/planning")({
  component: ProjectPlanningPage
});

function ProjectPlanningPage() {
  const { project, setProject } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProjectPlanning
        project={project}
        onUpdate={(updatedProject) => setProject(updatedProject)}
      />
    </div>
  );
}
