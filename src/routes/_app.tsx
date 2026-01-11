import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  component: Index,
  beforeLoad: ({ context }) => {
    console.log({ context });
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
});

function Index() {
  return (
    <div className="space-y-8">
      <Outlet />
    </div>
  );
}
