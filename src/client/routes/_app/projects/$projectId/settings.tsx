import { createFileRoute } from "@tanstack/react-router";
import { ProjectSettings } from "@/client/components/ProjectSettings";
import { useProjectContext } from "@/client/contexts/ProjectContext";

export const Route = createFileRoute("/_app/projects/$projectId/settings")({
  component: ProjectSettingsPage
});

function ProjectSettingsPage() {
  const { project, setProject } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProjectSettings
        project={project}
        onUpdate={(updatedProject) => setProject(updatedProject)}
      />
    </div>
  );
}
