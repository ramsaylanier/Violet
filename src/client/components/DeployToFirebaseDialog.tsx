import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Flame, Github, GitBranch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/client/components/ui/select";
import { Badge } from "@/client/components/ui/badge";
import type { Project } from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import {
  listFirebaseProjects,
  listFirebaseHostingSites,
  deployToFirebaseHosting
} from "@/client/api/firebase";
import { updateProject } from "@/client/api/projects";

interface DeployToFirebaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSuccess: (updatedProject: Project) => void;
}

export function DeployToFirebaseDialog({
  open,
  onOpenChange,
  project,
  onSuccess
}: DeployToFirebaseDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [selectedFirebaseProject, setSelectedFirebaseProject] =
    useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const { user } = useCurrentUser();

  const deployments = project.deployments || [];
  const repositories = project.repositories || []; // Legacy support
  const hasGoogleToken = !!user?.googleToken;
  const hasGithubToken = !!user?.githubToken;

  // Get deployments with repositories
  const deploymentsWithRepos = deployments.filter((d) => d.repository);

  // Query Firebase projects
  const { data: firebaseProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["firebase-projects"],
    queryFn: listFirebaseProjects,
    enabled: open && hasGoogleToken
  });

  // Query hosting sites for selected Firebase project
  const { data: hostingSites = [], isLoading: loadingSites } = useQuery({
    queryKey: ["firebase-hosting-sites", selectedFirebaseProject],
    queryFn: () => listFirebaseHostingSites(selectedFirebaseProject),
    enabled: open && !!selectedFirebaseProject && hasGoogleToken
  });

  // Deployment mutation
  const deployMutation = useMutation({
    mutationFn: deployToFirebaseHosting,
    onSuccess: async (deployment) => {
      // Update deployment with hosting entry
      const hostingEntry = {
        id: `fb-deploy-${deployment.id}`,
        provider: "firebase-hosting" as const,
        name: deployment.siteId,
        url: deployment.url,
        status: deployment.status,
        linkedAt: new Date()
      };

      if (deployments.length > 0 && selectedDeploymentId) {
        // Add hosting to selected deployment
        const updatedDeployments = deployments.map((d) =>
          d.id === selectedDeploymentId
            ? {
                ...d,
                hosting: [...(d.hosting || []), hostingEntry],
                updatedAt: new Date()
              }
            : d
        );

        const updatedProject = await updateProject(project.id, {
          deployments: updatedDeployments
        });

        queryClient.invalidateQueries({ queryKey: ["projects"] });
        onSuccess(updatedProject);
        handleClose();
      } else {
        // Legacy: Add to project-level hosting
        const existingHosting = project.hosting || [];
        const updatedHosting = [...existingHosting, hostingEntry];

        const updatedProject = await updateProject(project.id, {
          hosting: updatedHosting
        });

        queryClient.invalidateQueries({ queryKey: ["projects"] });
        onSuccess(updatedProject);
        handleClose();
      }
    },
    onError: (err: any) => {
      console.error("Failed to deploy:", err);
      setError(err?.message || "Failed to deploy to Firebase Hosting");
    }
  });

  // Auto-select site when sites load
  useEffect(() => {
    if (hostingSites.length > 0 && !selectedSiteId) {
      // Prefer default site or first site
      const defaultSite =
        hostingSites.find((s) => s.siteId === selectedFirebaseProject) ||
        hostingSites[0];
      if (defaultSite) {
        setSelectedSiteId(defaultSite.siteId);
      }
    }
  }, [hostingSites, selectedFirebaseProject, selectedSiteId]);

  // Auto-select Firebase project if project has one linked
  useEffect(() => {
    if (project.firebaseProjectId && !selectedFirebaseProject) {
      setSelectedFirebaseProject(project.firebaseProjectId);
    }
  }, [project.firebaseProjectId, selectedFirebaseProject]);

  const handleDeploy = async () => {
    if (!selectedFirebaseProject) {
      setError("Please select a Firebase project");
      return;
    }

    if (deployments.length > 0 && !selectedDeploymentId) {
      setError("Please select a deployment");
      return;
    }

    setError(null);

    let repo;
    if (deployments.length > 0 && selectedDeploymentId) {
      const selectedDeployment = deployments.find(
        (d) => d.id === selectedDeploymentId
      );
      if (!selectedDeployment || !selectedDeployment.repository) {
        setError("Selected deployment does not have a repository");
        return;
      }
      repo = selectedDeployment.repository;
    } else {
      // Legacy: Find repo from repositories array
      if (!selectedRepo) {
        setError("Please select a repository");
        return;
      }
      repo = repositories.find((r) => {
        const fullName = `${r.owner}/${r.name}`;
        return fullName === selectedRepo;
      });

      if (!repo) {
        setError("Repository not found");
        return;
      }
    }

    // Determine provider from repository URL or assume GitHub
    const provider: "github" | "gitlab" = repo.url.includes("gitlab.com")
      ? "gitlab"
      : "github";

    deployMutation.mutate({
      projectId: project.id,
      repository: {
        owner: repo.owner,
        name: repo.name,
        branch: selectedBranch || "main",
        provider
      },
      firebaseProjectId: selectedFirebaseProject,
      siteId: selectedSiteId || undefined
    });
  };

  const handleClose = () => {
    setError(null);
    setSelectedDeploymentId("");
    setSelectedRepo("");
    setSelectedBranch("main");
    setSelectedSiteId("");
    onOpenChange(false);
  };

  const selectedDeployment = deployments.find(
    (d) => d.id === selectedDeploymentId
  );
  const selectedRepoObj =
    selectedDeployment?.repository ||
    repositories.find((r) => {
      const fullName = `${r.owner}/${r.name}`;
      return fullName === selectedRepo;
    });

  const repoProvider = selectedRepoObj?.url.includes("gitlab.com")
    ? "gitlab"
    : "github";

  const isLoading = loadingProjects || loadingSites || deployMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5" />
            Deploy to Firebase Hosting
          </DialogTitle>
          <DialogDescription>
            Deploy a repository to Firebase Hosting. GitHub repos use native
            integration, GitLab repos are built and deployed via API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!hasGoogleToken ? (
            <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
              <p className="mb-2">
                Google account required for Firebase Hosting.
              </p>
              <a href="/settings" className="text-primary hover:underline">
                Connect Google in settings
              </a>
            </div>
          ) : deploymentsWithRepos.length === 0 && repositories.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
              <p>No deployments with repositories found.</p>
              <p className="mt-2">
                Create a deployment with a repository first.
              </p>
            </div>
          ) : (
            <>
              {deploymentsWithRepos.length > 0 ? (
                <div>
                  <Label htmlFor="deployment-select">Deployment *</Label>
                  <Select
                    value={selectedDeploymentId}
                    onValueChange={(value) => {
                      setSelectedDeploymentId(value);
                      setError(null);
                    }}
                  >
                    <SelectTrigger id="deployment-select" className="mt-2">
                      <SelectValue placeholder="Select a deployment" />
                    </SelectTrigger>
                    <SelectContent>
                      {deploymentsWithRepos.map((deployment) => {
                        const repo = deployment.repository!;
                        const isGitLab = repo.url.includes("gitlab.com");
                        return (
                          <SelectItem key={deployment.id} value={deployment.id}>
                            <div className="flex items-center gap-2">
                              {isGitLab ? (
                                <GitBranch className="w-4 h-4" />
                              ) : (
                                <Github className="w-4 h-4" />
                              )}
                              <span>{deployment.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({repo.fullName})
                              </span>
                              <Badge variant="outline" className="ml-2">
                                {isGitLab ? "GitLab" : "GitHub"}
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="repo-select">Repository</Label>
                  <Select
                    value={selectedRepo}
                    onValueChange={(value) => {
                      setSelectedRepo(value);
                      setError(null);
                    }}
                  >
                    <SelectTrigger id="repo-select" className="mt-2">
                      <SelectValue placeholder="Select a repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {repositories.map((repo) => {
                        const fullName = `${repo.owner}/${repo.name}`;
                        const isGitLab = repo.url.includes("gitlab.com");
                        return (
                          <SelectItem key={fullName} value={fullName}>
                            <div className="flex items-center gap-2">
                              {isGitLab ? (
                                <GitBranch className="w-4 h-4" />
                              ) : (
                                <Github className="w-4 h-4" />
                              )}
                              <span>{fullName}</span>
                              <Badge variant="outline" className="ml-2">
                                {isGitLab ? "GitLab" : "GitHub"}
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedRepoObj && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary">
                    {repoProvider === "github" ? "Native" : "API"} deployment
                  </Badge>
                  {repoProvider === "gitlab" && !user?.gitlabToken && (
                    <span className="text-xs text-muted-foreground">
                      (GitLab token required)
                    </span>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="branch-input">Branch</Label>
                <Input
                  id="branch-input"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  placeholder="main"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="firebase-project-select">
                  Firebase Project
                </Label>
                {loadingProjects ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Loading projects...
                    </span>
                  </div>
                ) : firebaseProjects.length === 0 ? (
                  <div className="text-sm text-muted-foreground mt-2">
                    No Firebase projects found.
                  </div>
                ) : (
                  <Select
                    value={selectedFirebaseProject}
                    onValueChange={(value) => {
                      setSelectedFirebaseProject(value);
                      setSelectedSiteId(""); // Reset site selection
                      setError(null);
                    }}
                  >
                    <SelectTrigger
                      id="firebase-project-select"
                      className="mt-2"
                    >
                      <SelectValue placeholder="Select Firebase project" />
                    </SelectTrigger>
                    <SelectContent>
                      {firebaseProjects.map((proj) => (
                        <SelectItem key={proj.projectId} value={proj.projectId}>
                          {proj.displayName || proj.projectId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedFirebaseProject && (
                <div>
                  <Label htmlFor="site-select">Hosting Site (optional)</Label>
                  {loadingSites ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Loading sites...
                      </span>
                    </div>
                  ) : hostingSites.length === 0 ? (
                    <div className="text-sm text-muted-foreground mt-2">
                      No hosting sites found. Default site will be used.
                    </div>
                  ) : (
                    <Select
                      value={selectedSiteId}
                      onValueChange={setSelectedSiteId}
                    >
                      <SelectTrigger id="site-select" className="mt-2">
                        <SelectValue placeholder="Select site (default if empty)" />
                      </SelectTrigger>
                      <SelectContent>
                        {hostingSites.map((site) => (
                          <SelectItem key={site.siteId} value={site.siteId}>
                            {site.name} ({site.siteId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {error && (
                <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={
              isLoading ||
              !hasGoogleToken ||
              !selectedFirebaseProject ||
              (deploymentsWithRepos.length > 0 && !selectedDeploymentId) ||
              (deploymentsWithRepos.length === 0 && !selectedRepo) ||
              (repoProvider === "github" && !hasGithubToken) ||
              (repoProvider === "gitlab" && !(user as any)?.gitlabToken)
            }
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Deploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
