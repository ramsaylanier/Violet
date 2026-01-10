import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import globalCss from "@/app/globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Violet" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: globalCss,
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <>
      <HeadContent />
      <div className="min-h-screen bg-background">
        <nav className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold">
              Violet
            </Link>
            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <>
                  <Link
                    to="/projects"
                    className="text-sm font-medium hover:underline"
                  >
                    Projects
                  </Link>
                  <Link
                    to="/settings"
                    className="text-sm font-medium hover:underline"
                  >
                    Settings
                  </Link>
                  {user?.email && (
                    <span className="text-sm text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                  <Button variant="outline" size="sm" onClick={logout}>
                    Sign Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
      {process.env.NODE_ENV === "development" && <TanStackRouterDevtools />}
    </>
  );
}
