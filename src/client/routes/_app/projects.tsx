import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/projects")({
  component: ProjectsLayout
});

function ProjectsLayout() {
  return (
    <div className="px-4">
      <Outlet />
    </div>
  );
}
