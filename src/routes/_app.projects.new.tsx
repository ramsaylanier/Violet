import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { createProject, updateProject } from "@/api/projects";
import { createGitHubRepository } from "@/api/github";

export const Route = createFileRoute("/_app/projects/new")({
  component: NewProject
});

function NewProject() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [projectName, setProjectName] = useState("");
  const [createGithubRepo, setCreateGithubRepo] = useState(false);
  const [error, setError] = useState("");

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (project) => {
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      return project;
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, updates }: { projectId: string; updates: any }) =>
      updateProject(projectId, updates),
    onSuccess: () => {
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });

  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      let githubRepo = null;

      // If checkbox is selected, create GitHub repository first
      if (createGithubRepo) {
        try {
          githubRepo = await createGitHubRepository({
            name: projectName,
            description: `Repository for ${projectName}`,
            private: false
          });
        } catch (githubError: any) {
          console.error("Failed to create GitHub repository:", githubError);
          setError(
            `Failed to create GitHub repository: ${githubError?.message || "Unknown error"}`
          );
          return;
        }
      }

      // Create the project using mutation
      const project = await createProjectMutation.mutateAsync({
        name: projectName
      });

      // If GitHub repo was created, update the project with repo information
      if (githubRepo) {
        const [owner, repoName] = githubRepo.full_name.split("/");
        await updateProjectMutation.mutateAsync({
          projectId: project.id,
          updates: {
            repositories: [
              {
                owner,
                name: repoName,
                fullName: githubRepo.full_name,
                url: githubRepo.html_url
              }
            ]
          }
        });
      }

      // Navigate to the newly created project
      navigate({
        to: "/projects/$projectId",
        params: { projectId: project.id }
      });
    } catch (err: any) {
      console.error("Failed to create project:", err);
      setError(err?.message || "Failed to create project. Please try again.");
    }
  };

  const loading =
    createProjectMutation.isPending || updateProjectMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground mt-2">
          Create a new project to get started
        </p>
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>New Project</CardTitle>
          <CardDescription>Enter the project details below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                disabled={loading}
                placeholder="My Awesome Project"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createGithubRepo"
                checked={createGithubRepo}
                onCheckedChange={(checked) =>
                  setCreateGithubRepo(checked === true)
                }
                disabled={loading}
              />
              <Label
                htmlFor="createGithubRepo"
                className="text-sm font-normal cursor-pointer"
              >
                Create a new GitHub repository
              </Label>
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/projects" })}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
