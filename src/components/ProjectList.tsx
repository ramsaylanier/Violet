import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listProjects, deleteProject } from "@/api/projects";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Github, Flame, Trash2 } from "lucide-react";
import { useState } from "react";

export function ProjectList() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeletingId(null);
    },
    onError: (error) => {
      console.error("Failed to delete project:", error);
      setDeletingId(null);
    },
  });

  const handleDelete = (projectId: string, projectName: string) => {
    setDeletingId(projectId);
    deleteMutation.mutate(projectId);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading projects...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-destructive">
          Failed to load projects. Please try again.
        </p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">
          No projects yet. Create your first project to get started.
        </p>
        <Link to="/projects/new">
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
        <Card
          key={project.id}
          className="hover:shadow-lg transition-shadow h-full flex flex-col"
        >
          <Link
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="flex-1 cursor-pointer"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{project.name}</span>
                <div className="flex gap-2">
                  {project.repositories && project.repositories.length > 0 && (
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
                {project.repositories && project.repositories.length > 0 && (
                  <div>
                    GitHub:{" "}
                    {project.repositories.length === 1
                      ? project.repositories[0].fullName
                      : `${project.repositories.length} repositories`}
                  </div>
                )}
                {project.firebaseProjectId && (
                  <div>Firebase: {project.firebaseProjectId}</div>
                )}
              </div>
            </CardContent>
          </Link>
          <div className="px-6 pb-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the project "{project.name}" and all of its data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingId === project.id}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(project.id, project.name)}
                    disabled={deletingId === project.id}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deletingId === project.id
                      ? "Deleting..."
                      : "Delete Project"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      ))}
    </div>
  );
}
