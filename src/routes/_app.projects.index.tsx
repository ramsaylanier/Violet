import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectList } from "@/components/project/ProjectList";

export const Route = createFileRoute("/_app/projects/")({
  component: Projects,
});

function Projects() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground mt-2">
          Manage your development projects
        </p>
      </div>
      <ProjectList />
    </div>
  );
}
