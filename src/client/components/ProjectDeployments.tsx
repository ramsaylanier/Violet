import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Rocket,
  ExternalLink,
  Plus,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Github,
  Globe,
  Flame
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Dialog } from "@/client/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/client/components/ui/alert-dialog";
import type { Project, Deployment, GitHubIssue } from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { listGitHubIssues } from "@/client/api/github";
import { updateProject } from "@/client/api/projects";
import { CreateDeploymentDialog } from "@/client/components/CreateDeploymentDialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/client/components/ui/collapsible";
import { Badge } from "@/client/components/ui/badge";

interface ProjectDeploymentsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectDeployments({
  project,
  onUpdate
}: ProjectDeploymentsProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [deploymentToRemove, setDeploymentToRemove] =
    useState<Deployment | null>(null);
  const { user } = useCurrentUser();
  const [repoIssues, setRepoIssues] = useState<
    Record<string, { issues: GitHubIssue[]; loading: boolean; open: boolean }>
  >({});

  const deployments = project.deployments || [];
  const isGitHubConnected = !!user?.githubToken;

  const loadRepoIssues = async (repoFullName: string) => {
    if (!user?.githubToken || repoIssues[repoFullName]?.loading) return;

    const [owner, name] = repoFullName.split("/");
    try {
      setRepoIssues((prev) => ({
        ...prev,
        [repoFullName]: {
          issues: prev[repoFullName]?.issues || [],
          loading: true,
          open: prev[repoFullName]?.open || false
        }
      }));

      const issues = await listGitHubIssues(owner, name);
      setRepoIssues((prev) => ({
        ...prev,
        [repoFullName]: {
          issues,
          loading: false,
          open: prev[repoFullName]?.open || false
        }
      }));
    } catch (err: any) {
      console.error(`Failed to load issues for ${repoFullName}:`, err);
      setRepoIssues((prev) => ({
        ...prev,
        [repoFullName]: {
          issues: prev[repoFullName]?.issues || [],
          loading: false,
          open: prev[repoFullName]?.open || false
        }
      }));
    }
  };

  const toggleRepoIssues = (repoFullName: string) => {
    const currentState = repoIssues[repoFullName];
    const newOpenState = !currentState?.open;

    setRepoIssues((prev) => ({
      ...prev,
      [repoFullName]: {
        issues: prev[repoFullName]?.issues || [],
        loading: prev[repoFullName]?.loading || false,
        open: newOpenState
      }
    }));

    if (newOpenState && !currentState?.issues.length) {
      loadRepoIssues(repoFullName);
    }
  };

  const handleRemoveClick = (deployment: Deployment) => {
    setDeploymentToRemove(deployment);
    setRemoveDialogOpen(true);
    setError(null);
  };

  const removeDeploymentMutation = useMutation({
    mutationFn: async (deploymentId: string) => {
      const updatedDeployments = deployments.filter(
        (d) => d.id !== deploymentId
      );
      return await updateProject(project.id, {
        deployments: updatedDeployments.length > 0 ? updatedDeployments : []
      });
    },
    onSuccess: (updatedProject) => {
      onUpdate(updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setRemoveDialogOpen(false);
      setDeploymentToRemove(null);
    },
    onError: (err: any) => {
      console.error("Failed to remove deployment:", err);
      setError(err?.message || "Failed to remove deployment");
    }
  });

  const handleRemoveDeployment = () => {
    if (!deploymentToRemove) return;
    removeDeploymentMutation.mutate(deploymentToRemove.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Deployments</h3>
          <p className="text-sm text-muted-foreground">
            {project.type === "monorepo"
              ? "Manage deployments for this monorepo project"
              : "Manage deployments (one per repository)"}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Deployment
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <CreateDeploymentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          project={project}
          onSuccess={onUpdate}
        />
      </Dialog>

      {deployments.length > 0 ? (
        <div className="space-y-4">
          {deployments.map((deployment) => (
            <Card key={deployment.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="w-5 h-5" />
                      <Link
                        to="/projects/$projectId/deployments/$deploymentId"
                        params={{
                          projectId: project.id,
                          deploymentId: deployment.id
                        }}
                        className="hover:underline"
                      >
                        {deployment.name}
                      </Link>
                    </CardTitle>
                    {deployment.repository && (
                      <Badge variant="outline" className="gap-1">
                        <Github className="w-3 h-3" />
                        {deployment.repository.fullName}
                      </Badge>
                    )}
                    {deployment.domains && deployment.domains.length > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Globe className="w-3 h-3" />
                        {deployment.domains.length} domain
                        {deployment.domains.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {deployment.hosting && deployment.hosting.length > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Flame className="w-3 h-3" />
                        {deployment.hosting.length} hosting
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/projects/$projectId/deployments/$deploymentId"
                      params={{
                        projectId: project.id,
                        deploymentId: deployment.id
                      }}
                    >
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {deployment.repository && (
                      <a
                        href={deployment.repository.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveClick(deployment)}
                      disabled={removeDeploymentMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {deployment.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {deployment.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Repository Issues Section */}
                {deployment.repository && isGitHubConnected && (
                  <Collapsible
                    open={
                      repoIssues[deployment.repository.fullName]?.open || false
                    }
                    onOpenChange={() =>
                      toggleRepoIssues(deployment.repository!.fullName)
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto hover:bg-transparent"
                      >
                        <div className="flex items-center gap-2">
                          {repoIssues[deployment.repository.fullName]?.open ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">Issues</span>
                          {repoIssues[deployment.repository.fullName]
                            ?.issues && (
                            <Badge variant="secondary" className="ml-2">
                              {
                                repoIssues[deployment.repository.fullName]
                                  .issues.length
                              }
                            </Badge>
                          )}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {repoIssues[deployment.repository.fullName]?.loading ? (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            Loading issues...
                          </span>
                        </div>
                      ) : repoIssues[deployment.repository.fullName]?.issues
                          .length === 0 ? (
                        <div className="text-sm text-muted-foreground py-2">
                          No open issues
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {repoIssues[deployment.repository.fullName]?.issues
                            .slice(0, 5)
                            .map((issue) => (
                              <div
                                key={issue.id}
                                className="flex items-center gap-2 p-2 bg-muted rounded-md hover:bg-muted/80"
                              >
                                {issue.state === "open" ? (
                                  <AlertCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                )}
                                <a
                                  href={issue.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm flex-1 hover:underline truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  #{issue.number} {issue.title}
                                </a>
                              </div>
                            ))}
                          {repoIssues[deployment.repository.fullName]?.issues
                            .length > 5 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              +
                              {repoIssues[deployment.repository.fullName].issues
                                .length - 5}{" "}
                              more issues
                            </div>
                          )}
                          <a
                            href={`${deployment.repository.url}/issues`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View all issues
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Rocket className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h4 className="text-sm font-medium">No deployments</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a deployment to get started
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Deployment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Deployment</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the deployment "{deploymentToRemove?.name}" from
              this project.
              {deploymentToRemove?.domains &&
                deploymentToRemove.domains.length > 0 && (
                  <>
                    {" "}
                    This deployment has {deploymentToRemove.domains.length}{" "}
                    domain(s) linked.
                  </>
                )}
              {deploymentToRemove?.hosting &&
                deploymentToRemove.hosting.length > 0 && (
                  <>
                    {" "}
                    This deployment has {deploymentToRemove.hosting.length}{" "}
                    hosting configuration(s).
                  </>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveDialogOpen(false);
                setDeploymentToRemove(null);
                setError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDeployment}
              disabled={removeDeploymentMutation.isPending}
              variant="destructive"
            >
              {removeDeploymentMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
