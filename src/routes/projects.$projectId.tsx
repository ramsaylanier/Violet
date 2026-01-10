import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getProject } from "@/server/projects.$projectId";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatInterface } from "@/components/ChatInterface";
import type { Project } from "@/types";
import { Github, Flame, Loader2 } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { firebaseUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      if (!firebaseUser || !projectId) {
        setLoading(false);
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        const data = await getProject({
          request: new Request("http://localhost", {
            headers: {
              authorization: `Bearer ${idToken}`,
            },
          }),
          data: { projectId },
        });
        setProject(data);
      } catch (error) {
        console.error("Failed to load project:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [firebaseUser, projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-2">{project.description}</p>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
          <TabsTrigger value="firebase">Firebase</TabsTrigger>
          <TabsTrigger value="chat">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="w-5 h-5" />
                  GitHub Repository
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.githubRepo ? (
                  <div className="space-y-2">
                    <p className="font-medium">{project.githubRepo.fullName}</p>
                    <a
                      href={project.githubRepo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View on GitHub →
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No GitHub repository connected
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  Firebase Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.firebaseProjectId ? (
                  <p className="font-medium">{project.firebaseProjectId}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No Firebase project connected
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="github">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>
                Manage your GitHub repository and issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.githubRepo ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Repository</p>
                    <a
                      href={project.githubRepo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {project.githubRepo.fullName}
                    </a>
                  </div>
                  {/* Add more GitHub features here */}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Connect a GitHub repository to see details here
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="firebase">
          <Card>
            <CardHeader>
              <CardTitle>Firebase Integration</CardTitle>
              <CardDescription>
                Manage your Firebase project and services
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.firebaseProjectId ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Project ID</p>
                    <p>{project.firebaseProjectId}</p>
                  </div>
                  {/* Add more Firebase features here */}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Connect a Firebase project to see details here
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <ChatInterface projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
