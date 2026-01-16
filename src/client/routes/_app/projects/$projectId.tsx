import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useLocation
} from "@tanstack/react-router";
import { useAuth } from "@/client/contexts/AuthContext";
import {
  ProjectProvider,
  useProjectContext
} from "@/client/contexts/ProjectContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Github, Flame, ArrowLeft, Globe, Rocket } from "lucide-react";
import { cn, getProjectRepositories, getProjectDomains, getProjectHosting } from "@/client/lib/utils";

export const Route = createFileRoute("/_app/projects/$projectId")({
  component: ProjectLayout
});

function ProjectLayout() {
  const { isAuthenticated } = useAuth();
  const { projectId } = Route.useParams();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ProjectProvider projectId={projectId}>
      <ProjectLayoutContent />
    </ProjectProvider>
  );
}

function ProjectLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = Route.useParams();
  const { project, loading, error } = useProjectContext();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted-foreground">
          Loading project...
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Link to="/projects">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || "Project not found"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: "/projects" })}>
              Go to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      path: `/projects/${projectId}/`,
      route: "/projects/$projectId/"
    },
    {
      id: "deployments",
      label: "Deployments",
      path: `/projects/${projectId}/deployments`,
      route: "/projects/$projectId/deployments"
    },
    {
      id: "issues",
      label: "Issues",
      path: `/projects/${projectId}/issues`,
      route: "/projects/$projectId/issues"
    },
    {
      id: "planning",
      label: "Planning",
      path: `/projects/${projectId}/planning`,
      route: "/projects/$projectId/planning"
    },
    {
      id: "domains",
      label: "Domains",
      path: `/projects/${projectId}/domains`,
      route: "/projects/$projectId/domains"
    },
    {
      id: "hosting",
      label: "Hosting",
      path: `/projects/${projectId}/hosting`,
      route: "/projects/$projectId/hosting"
    },
    {
      id: "integrations",
      label: "Integrations",
      path: `/projects/${projectId}/integrations`,
      route: "/projects/$projectId/integrations"
    },
    {
      id: "settings",
      label: "Settings",
      path: `/projects/${projectId}/settings`,
      route: "/projects/$projectId/settings"
    }
  ];

  const currentPath = location.pathname;
  // Normalize paths for comparison (remove trailing slashes)
  const normalizedCurrentPath = currentPath.replace(/\/$/, "");
  const activeTab =
    tabs.find(
      (tab) =>
        normalizedCurrentPath === tab.path ||
        normalizedCurrentPath.startsWith(tab.path + "/")
    )?.id || "overview";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/projects">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {project.deployments && project.deployments.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Rocket className="w-3 h-3" />
              Deployments ({project.deployments.length})
            </Badge>
          )}
          {(() => {
            const repos = getProjectRepositories(project);
            return repos.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Github className="w-3 h-3" />
                GitHub ({repos.length})
              </Badge>
            );
          })()}
          {project.firebaseProjectId && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="w-3 h-3" />
              Firebase
            </Badge>
          )}
          {(() => {
            const domains = getProjectDomains(project);
            return domains.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Globe className="w-3 h-3" />
                Domains ({domains.length})
              </Badge>
            );
          })()}
          {(() => {
            const hosting = getProjectHosting(project);
            return hosting.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Rocket className="w-3 h-3" />
                Hosting ({hosting.length})
              </Badge>
            );
          })()}
        </div>
      </div>

      <div className="border-b">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={tab.route}
                params={{ projectId }}
                className={cn(
                  "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
