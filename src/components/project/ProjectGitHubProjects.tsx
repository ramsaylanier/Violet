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
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { GitHubNotConnectedState } from "@/components/shared/GitHubNotConnectedState";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listGitHubProjectsForRepository } from "@/api/github";
import { updateProject } from "@/api/projects";
import type { Project, GitHubProject } from "@/types";
import { CreateProjectDialog } from "./github-projects/CreateProjectDialog";
import { RemoveProjectDialog } from "./github-projects/RemoveProjectDialog";
import { ProjectList } from "./github-projects/ProjectList";
import { RepositoryProjectsList } from "./github-projects/RepositoryProjectsList";

interface ProjectGitHubProjectsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectGitHubProjects({
  project,
  onUpdate
}: ProjectGitHubProjectsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [projectToRemove, setProjectToRemove] = useState<{
    projectId: string;
    name: string;
  } | null>(null);

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

  const handleLinkRepositoryProject = async (projectToLink: GitHubProject) => {
    try {
      setLoading(true);
      setError(null);

      const owner = projectToLink.owner?.login || "";
      const ownerType =
        projectToLink.owner?.type === "Organization" ? "org" : "user";
      const projectData = {
        projectId: projectToLink.id,
        name: projectToLink.title,
        owner,
        ownerType: ownerType as "user" | "org",
        url: projectToLink.url
      };

      const updatedProjects = [...projectGitHubProjects, projectData];
      const updatedProject = await updateProject(project.id, {
        githubProjects: updatedProjects
      });

      onUpdate(updatedProject);

      // Invalidate repository projects query to refetch and update the list
      queryClient.invalidateQueries({
        queryKey: ["github-repository-projects"]
      });
    } catch (err: any) {
      console.error("Failed to link repository project:", err);
      setError(err?.message || "Failed to link project");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClick = (project: { projectId: string; name: string }) => {
    setProjectToRemove(project);
    setRemoveDialogOpen(true);
    setError(null);
  };

  const handleRemoveProject = async () => {
    if (!projectToRemove) return;

    try {
      setLoading(true);
      setError(null);

      const updatedProjects = projectGitHubProjects.filter(
        (p) => p.projectId !== projectToRemove.projectId
      );
      const updatedProject = await updateProject(project.id, {
        githubProjects: updatedProjects.length > 0 ? updatedProjects : []
      });

      onUpdate(updatedProject);
      setRemoveDialogOpen(false);
      setProjectToRemove(null);
    } catch (err: any) {
      console.error("Failed to remove project:", err);
      setError(err?.message || "Failed to remove project");
      throw err;
    } finally {
      setLoading(false);
    }
  };

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
                loading={loading}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRepositoryProjects && projectRepos.length > 0 ? (
            <LoadingState message="Loading projects from repositories..." />
          ) : hasProjects ? (
            <div className="space-y-4">
              <ProjectList
                projects={projectGitHubProjects}
                onRemove={handleRemoveClick}
                loading={loading}
              />
              <RepositoryProjectsList
                projects={uniqueRepositoryProjects}
                onLink={handleLinkRepositoryProject}
                hasLinkedProjects={projectGitHubProjects.length > 0}
                loading={loading}
              />
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

      <RemoveProjectDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        projectName={projectToRemove?.name || ""}
        onConfirm={handleRemoveProject}
        error={error}
      />
    </div>
  );
}
