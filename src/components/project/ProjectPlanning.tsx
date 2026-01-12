import type { Project } from "@/types";
import { GithubProjects } from "./github-projects/GitHubProjects";

interface ProjectPlanningProps {
  project: Project;
  onUpdate?: (updatedProject: Project) => void;
}

export function ProjectPlanning({ project, onUpdate }: ProjectPlanningProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Planning</h3>
        <p className="text-sm text-muted-foreground">
          Manage GitHub Projects for planning and organization
        </p>
      </div>
      <GithubProjects project={project} onUpdate={onUpdate || (() => {})} />
    </div>
  );
}
