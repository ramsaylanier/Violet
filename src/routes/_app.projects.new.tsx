import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app/projects/new")({
  component: NewProject,
});

function NewProject() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground mt-2">
          Create a new project to get started
        </p>
      </div>
      <div className="p-6 border rounded-lg">
        <p className="text-muted-foreground">
          Project creation form will be implemented here.
        </p>
      </div>
    </div>
  );
}
