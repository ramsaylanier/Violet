import { Separator } from "@/components/ui/separator";
import { UnlinkedProjectCard } from "./ProjectCard";
import type { GitHubProject } from "@/types";

interface RepositoryProjectsListProps {
  projects: GitHubProject[];
  onLink: (project: GitHubProject) => void;
  hasLinkedProjects: boolean;
  loading?: boolean;
}

export function RepositoryProjectsList({
  projects,
  onLink,
  hasLinkedProjects,
  loading = false
}: RepositoryProjectsListProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <>
      {hasLinkedProjects && (
        <div className="my-4">
          <Separator />
        </div>
      )}
      <div>
        <div className="text-sm font-medium text-muted-foreground mb-4">
          Projects from Repositories
        </div>
        <div className="space-y-4">
          {projects.map((proj) => (
            <UnlinkedProjectCard
              key={proj.id}
              project={proj}
              onLink={() => onLink(proj)}
              loading={loading}
            />
          ))}
        </div>
      </div>
    </>
  );
}
