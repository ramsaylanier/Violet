import type { Project } from "@/types";
import { ProjectGitHubProjects } from "./ProjectGitHubProjects";

interface ProjectPlanningProps {
  project: Project;
  onUpdate?: (updatedProject: Project) => void;
}

export function ProjectPlanning({
  project,
  onUpdate
}: ProjectPlanningProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Planning</h3>
        <p className="text-sm text-muted-foreground">
          Manage GitHub Projects for planning and organization
        </p>
      </div>
      <ProjectGitHubProjects
        project={project}
        onUpdate={onUpdate || (() => {})}
      />
    </div>
  );
}
