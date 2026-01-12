import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { GitHubNotConnectedState } from "@/components/shared/GitHubNotConnectedState";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listGitHubProjectsForRepository } from "@/api/github";
import type { Project, GitHubProject } from "@/types";
import { CreateProjectDialog } from "./CreateGithubProjectDialog";
import { GithubProjectCard } from "./GithubProjectCard";

interface GithubProjectsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function GithubProjects({ project, onUpdate }: GithubProjectsProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { user, loadingUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const projectGitHubProjects = project.githubProjects || [];
  const projectRepos = project.repositories || [];
  const isGitHubConnected = !!user?.githubToken;

  // Fetch projects for all repositories using TanStack Query
  const projectIds = new Set(projectGitHubProjects.map((p) => p.projectId));

  const {
    data: repositoryProjectsData = [],
    isLoading: loadingRepositoryProjects
  } = useQuery({
    queryKey: [
      "github-repository-projects",
      projectRepos
        .map((r) => r.fullName)
        .sort()
        .join(",")
    ],
    queryFn: async () => {
      if (!isGitHubConnected || projectRepos.length === 0) {
        return [];
      }

      const allProjects: GitHubProject[] = [];

      // Fetch projects for each repository in parallel
      const promises = projectRepos.map(async (repo) => {
        try {
          const [owner, name] = repo.fullName.split("/");
          if (!owner || !name) return [];
          const projects = await listGitHubProjectsForRepository(owner, name);
          return projects;
        } catch (err: any) {
          console.error(`Failed to load projects for ${repo.fullName}:`, err);
          return [];
        }
      });

      const results = await Promise.all(promises);
      allProjects.push(...results.flat());

      // Remove duplicates by ID, filter out already linked projects, and only include open projects
      const uniqueProjects = Array.from(
        new Map(allProjects.map((p) => [p.id, p])).values()
      ).filter((p) => !projectIds.has(p.id) && !p.closed);

      return uniqueProjects;
    },
    enabled: isGitHubConnected && projectRepos.length > 0,
    retry: 1
  });

  const uniqueRepositoryProjects = repositoryProjectsData;

  const handleCreateSuccess = (updatedProject: Project) => {
    onUpdate(updatedProject);
    queryClient.invalidateQueries({
      queryKey: ["github-repository-projects"]
    });
  };

  if (loadingUser) {
    return <LoadingState message="Loading user..." />;
  }

  if (!isGitHubConnected) {
    return (
      <GitHubNotConnectedState description="Connect your GitHub account to link GitHub Projects" />
    );
  }

  const hasProjects =
    projectGitHubProjects.length > 0 || uniqueRepositoryProjects.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                GitHub Projects
              </CardTitle>
              <CardDescription>
                Link GitHub Projects to this Violet project
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create GitHub Project
                </Button>
              </DialogTrigger>
              <CreateProjectDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                project={project}
                onSuccess={handleCreateSuccess}
                isGitHubConnected={isGitHubConnected}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRepositoryProjects && projectRepos.length > 0 ? (
            <LoadingState message="Loading projects from repositories..." />
          ) : hasProjects ? (
            <div className="space-y-4">
              {uniqueRepositoryProjects.length > 0 && (
                <>
                  {projectGitHubProjects.length > 0 && (
                    <div className="my-4">
                      <Separator />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-4">
                      Projects from Repositories
                    </div>
                    <div className="space-y-4">
                      {uniqueRepositoryProjects.map((proj) => (
                        <GithubProjectCard key={proj.id} project={proj} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <EmptyState
              icon={
                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              }
              title="No GitHub Projects linked"
              description="Link a GitHub Project to enable project management features"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
