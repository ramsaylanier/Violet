import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app/projects")({
  component: Projects,
});

function Projects() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return <h1>Projects</h1>;
}
