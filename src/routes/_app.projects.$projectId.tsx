import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { getProject } from "@/api/projects";
import type { Project } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Github, Flame, ArrowLeft, ExternalLink, Calendar } from "lucide-react";

export const Route = createFileRoute("/_app/projects/$projectId")({
  component: ProjectView,
});

function ProjectView() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const loadProject = async () => {
      try {
        const data = await getProject(projectId);
        console.log("🔥 data", data);
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
          {project.githubRepo && (
            <Badge variant="secondary" className="gap-1">
              <Github className="w-3 h-3" />
              GitHub
            </Badge>
          )}
          {project.firebaseProjectId && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="w-3 h-3" />
              Firebase
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Project ID
                  </div>
                  <div className="text-sm font-mono mt-1">{project.id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Created
                  </div>
                  <div className="text-sm mt-1">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </div>
                  <div className="text-sm mt-1">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {project.githubRepo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="w-5 h-5" />
                    GitHub Repository
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Repository
                    </div>
                    <div className="text-sm mt-1">
                      {project.githubRepo.fullName}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Owner
                    </div>
                    <div className="text-sm mt-1">
                      {project.githubRepo.owner}
                    </div>
                  </div>
                  <div>
                    <a
                      href={project.githubRepo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      View on GitHub
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {project.firebaseProjectId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="w-5 h-5" />
                    Firebase Project
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Project ID
                    </div>
                    <div className="text-sm font-mono mt-1">
                      {project.firebaseProjectId}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>
                Manage your project settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Auto Sync</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {project.settings.autoSync ? "Enabled" : "Disabled"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Notifications</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {project.settings.notifications ? "Enabled" : "Disabled"}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
