import { useEffect, useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch
} from "@tanstack/react-router";
import { useAuth } from "@/client/contexts/AuthContext";
import { getProject } from "@/client/api/projects";
import type { Project } from "@/shared/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/client/components/ui/tabs";
import { Github, Flame, ArrowLeft, Globe, Rocket } from "lucide-react";
import { ProjectOverview } from "@/client/components/ProjectOverview";
import { ProjectSettings } from "@/client/components/ProjectSettings";
import { ProjectRepositories } from "@/client/components/ProjectRepositories";
import { ProjectIntegrations } from "@/client/components/ProjectIntegrations";
import { ProjectIssues } from "@/client/components/ProjectIssues";
import { ProjectPlanning } from "@/client/components/ProjectPlanning";
import { ProjectDomains } from "@/client/components/ProjectDomains";
import { ProjectHosting } from "@/client/components/ProjectHosting";

export const Route = createFileRoute("/_app/projects/$projectId")({
  component: ProjectView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined
    };
  }
});

function ProjectView() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const search = useSearch({ from: "/_app/projects/$projectId" });
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validTabs = [
    "overview",
    "repositories",
    "issues",
    "planning",
    "domains",
    "hosting",
    "integrations",
    "settings"
  ];
  const currentTab =
    search.tab && validTabs.includes(search.tab) ? search.tab : "overview";

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const loadProject = async () => {
      try {
        const data = await getProject(projectId);
        setProject(data);
      } catch (err: any) {
        console.error("Failed to load project:", err);
        setError(err?.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

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
          {project.repositories && project.repositories.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Github className="w-3 h-3" />
              GitHub ({project.repositories.length})
            </Badge>
          )}
          {project.firebaseProjectId && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="w-3 h-3" />
              Firebase
            </Badge>
          )}
          {project.domains && project.domains.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Globe className="w-3 h-3" />
              Domains ({project.domains.length})
            </Badge>
          )}
          {project.hosting && project.hosting.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Rocket className="w-3 h-3" />
              Hosting ({project.hosting.length})
            </Badge>
          )}
        </div>
      </div>

      <Tabs
        value={currentTab}
        onValueChange={(value) => {
          navigate({
            to: "/projects/$projectId",
            params: { projectId },
            search: { tab: value },
            replace: true
          });
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="hosting">Hosting</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ProjectOverview project={project} />
        </TabsContent>

        <TabsContent value="repositories" className="space-y-4">
          <ProjectRepositories
            project={project}
            onUpdate={(updatedProject) => setProject(updatedProject)}
          />
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <ProjectIssues
            project={project}
            onUpdate={(updatedProject) => setProject(updatedProject)}
          />
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <ProjectPlanning
            project={project}
            onUpdate={(updatedProject) => setProject(updatedProject)}
          />
        </TabsContent>

        <TabsContent value="domains" className="space-y-4">
          <ProjectDomains
            project={project}
            onUpdate={(updatedProject) => setProject(updatedProject)}
          />
        </TabsContent>

        <TabsContent value="hosting" className="space-y-4">
          <ProjectHosting
            project={project}
            onUpdate={(updatedProject) => setProject(updatedProject)}
          />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <ProjectIntegrations
            project={project}
            onUpdate={(updatedProject) => setProject(updatedProject)}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <ProjectSettings project={project} onUpdate={setProject} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
