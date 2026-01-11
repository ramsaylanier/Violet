import { LinkedProjectCard } from "./ProjectCard";

interface ProjectListProps {
  projects: Array<{
    projectId: string;
    name: string;
    owner: string;
    url?: string;
  }>;
  onRemove: (project: { projectId: string; name: string }) => void;
  loading?: boolean;
}

export function ProjectList({
  projects,
  onRemove,
  loading = false,
}: ProjectListProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <>
      {projects.map((proj) => (
        <LinkedProjectCard
          key={proj.projectId}
          project={proj}
          onRemove={() => onRemove(proj)}
          loading={loading}
        />
      ))}
    </>
  );
}
