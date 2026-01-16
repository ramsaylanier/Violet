import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Dialog, DialogTrigger } from "@/client/components/ui/dialog";
import { Separator } from "@/client/components/ui/separator";
import { LoadingState } from "@/client/components/shared/LoadingState";
import { EmptyState } from "@/client/components/shared/EmptyState";
import { GitHubNotConnectedState } from "@/client/components/shared/GitHubNotConnectedState";
import { useGetGithubProjects } from "@/client/hooks/useGetGithubProjects";
import type { Project } from "@/shared/types";
import { getProjectRepositories } from "@/client/lib/utils";
import { CreateProjectDialog } from "./CreateGithubProjectDialog";
import { GithubProjectCard } from "./GithubProjectCard";

interface GithubProjectsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function GithubProjects({ project, onUpdate }: GithubProjectsProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    availableRepositoryProjects,
    isLoadingRepositoryProjects,
    isGitHubConnected
  } = useGetGithubProjects(project);

  const projectRepos = getProjectRepositories(project);

  const handleCreateSuccess = (updatedProject: Project) => {
    onUpdate(updatedProject);
    queryClient.invalidateQueries({
      queryKey: ["github-repository-projects"]
    });
  };

  if (!isGitHubConnected) {
    return (
      <GitHubNotConnectedState description="Connect your GitHub account to link GitHub Projects" />
    );
  }

  const hasProjects = availableRepositoryProjects.length > 0;

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
          {isLoadingRepositoryProjects && projectRepos.length > 0 ? (
            <LoadingState message="Loading projects from repositories..." />
          ) : hasProjects ? (
            <div className="space-y-4">
              {availableRepositoryProjects.length > 0 && (
                <>
                  {availableRepositoryProjects.length > 0 && (
                    <div className="my-4">
                      <Separator />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-4">
                      Projects from Repositories
                    </div>
                    <div className="space-y-4">
                      {availableRepositoryProjects.map((proj) => (
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
