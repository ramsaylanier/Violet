import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listProjects } from "@/api/projects";
import { useAuth } from "@/contexts/AuthContext";
import type { Project } from "@/types";
import { Plus, Github, Flame } from "lucide-react";

export function ProjectList() {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const data = await listProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading projects...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">
          No projects yet. Create your first project to get started.
        </p>
        <Link to="/">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Project with AI
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          to="/projects/$projectId"
          params={{ projectId: project.id }}
        >
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{project.name}</span>
                <div className="flex gap-2">
                  {project.githubRepo && (
                    <Github className="w-4 h-4 text-muted-foreground" />
                  )}
                  {project.firebaseProjectId && (
                    <Flame className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CardTitle>
              {project.description && (
                <CardDescription>{project.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-1">
                {project.githubRepo && (
                  <div>GitHub: {project.githubRepo.fullName}</div>
                )}
                {project.firebaseProjectId && (
                  <div>Firebase: {project.firebaseProjectId}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
