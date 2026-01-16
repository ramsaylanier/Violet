import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/projects/$projectId/deployments")({
  component: ProjectDeploymentsPage
});

function ProjectDeploymentsPage() {
  return (
    <div className="space-y-4">
      <Outlet />
    </div>
  );
}
