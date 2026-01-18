import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, ChevronsUpDown, Github } from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { Label } from "@/client/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/client/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/client/components/ui/command";
import { Badge } from "@/client/components/ui/badge";
import type { Project, Deployment, GitHubRepository } from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { useGitHubRepositories } from "@/client/hooks/useGitHubRepositories";
import { createGitHubRepository } from "@/client/api/github";
import { updateProject } from "@/client/api/projects";

// Note: randomUUID is available in Node.js 14.17.0+, but for browser compatibility we'll use a simple UUID generator
function randomUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface CreateDeploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSuccess: (updatedProject: Project) => void;
}

export function CreateDeploymentDialog({
  open,
  onOpenChange,
  project,
  onSuccess
}: CreateDeploymentDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const isGitHubConnected = !!user?.githubToken;
  const projectType = project.type || "multi-service";
  const deployments = project.deployments || [];

  // Step state: "select-repo" | "deployment-form"
  const [step, setStep] = useState<"select-repo" | "deployment-form">(
    "select-repo"
  );
  const [repoMode, setRepoMode] = useState<"add" | "create">("add");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [deploymentName, setDeploymentName] = useState("");
  const [deploymentDescription, setDeploymentDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch repositories
  const { data: availableRepos = [], isLoading: loadingRepos } =
    useGitHubRepositories(open && isGitHubConnected && repoMode === "add");

  // Create repository mutation
  const createRepoMutation = useMutation({
    mutationFn: createGitHubRepository,
    onSuccess: (newRepo) => {
      // Invalidate and refetch repositories list
      queryClient.invalidateQueries({ queryKey: ["github-repositories"] });
      setSelectedRepo(newRepo.full_name);
      // Set deployment name to repo name when repo is created
      const repoName = newRepo.full_name.split("/")[1];
      setDeploymentName(repoName);
      setStep("deployment-form");
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to create repository");
    }
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({
      projectId,
      updates
    }: {
      projectId: string;
      updates: Partial<Project>;
    }) => updateProject(projectId, updates),
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onSuccess(updatedProject);
      handleClose();
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to create deployment");
    }
  });

  // Filter out repositories already used in deployments
  const availableReposToAdd =
    projectType === "monorepo"
      ? availableRepos.filter(
          (repo) =>
            !deployments.some((d) => d.repository?.fullName === repo.full_name)
        )
      : availableRepos.filter(
          (repo) =>
            !deployments.some((d) => d.repository?.fullName === repo.full_name)
        );

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("select-repo");
      setSelectedRepo("");
      setComboboxOpen(false);
      setNewRepoName("");
      setNewRepoDescription("");
      setNewRepoPrivate(false);
      setDeploymentName("");
      setDeploymentDescription("");
      setError(null);
      setRepoMode("add");
    }
  }, [open]);

  // When a repo is selected, move to deployment form and set default name
  useEffect(() => {
    if (selectedRepo && step === "select-repo" && repoMode === "add") {
      const repo = availableRepos.find((r) => r.full_name === selectedRepo);
      if (repo) {
        const repoName = repo.full_name.split("/")[1];
        setDeploymentName(repoName);
        setStep("deployment-form");
      }
    }
  }, [selectedRepo, step, repoMode, availableRepos]);

  const handleSelectRepo = () => {
    if (repoMode === "add") {
      if (!selectedRepo) {
        setError("Please select a repository");
        return;
      }
      const repo = availableRepos.find((r) => r.full_name === selectedRepo);
      if (repo) {
        const repoName = repo.full_name.split("/")[1];
        setDeploymentName(repoName);
        setStep("deployment-form");
      }
    } else if (repoMode === "create") {
      if (!newRepoName.trim()) {
        setError("Repository name is required");
        return;
      }
      createRepoMutation.mutate({
        name: newRepoName,
        description: newRepoDescription || undefined,
        private: newRepoPrivate
      });
    }
  };

  const handleCreateDeployment = async () => {
    if (!deploymentName.trim()) {
      setError("Deployment name is required");
      return;
    }

    // Check if deployment name already exists
    if (deployments.some((d) => d.name === deploymentName.trim())) {
      setError("A deployment with this name already exists");
      return;
    }

    setError(null);

    let repoInfo = null;
    const repoFullName = selectedRepo || "";

    if (repoFullName) {
      // Get repository info
      let repo: GitHubRepository | undefined;
      if (repoMode === "add") {
        repo = availableRepos.find((r) => r.full_name === repoFullName);
      } else {
        // For create mode, use the mutation result if available
        // Otherwise, try to find it in availableRepos (it should be there after invalidation)
        repo = availableRepos.find((r) => r.full_name === repoFullName);
        // If still not found, the mutation result should have it stored
        if (!repo && createRepoMutation.data) {
          repo = createRepoMutation.data;
        }
      }

      if (repo) {
        const [owner, repoName] = repo.full_name.split("/");
        repoInfo = {
          owner,
          name: repoName,
          fullName: repo.full_name,
          url: repo.html_url
        };
      }
    }

    // Create new deployment
    const deploymentId = randomUUID();
    const newDeployment: Deployment = {
      id: deploymentId,
      name: deploymentName.trim(),
      description: deploymentDescription.trim() || undefined,
      repository: repoInfo || undefined,
      domain: undefined,
      hosting: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedDeployments = [...deployments, newDeployment];
    updateProjectMutation.mutate({
      projectId: project.id,
      updates: { deployments: updatedDeployments }
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep("select-repo");
    setError(null);
  };

  const loading =
    createRepoMutation.isPending || updateProjectMutation.isPending;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {step === "select-repo" ? "Select Repository" : "Create Deployment"}
        </DialogTitle>
        <DialogDescription>
          {step === "select-repo"
            ? "First, select a repository for this deployment"
            : `Create a new deployment${projectType === "monorepo" ? ". In a monorepo, multiple deployments can share the same repository." : ""}`}
        </DialogDescription>
      </DialogHeader>

      {step === "select-repo" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Repository</Label>
            <div className="flex gap-2">
              <Button
                variant={repoMode === "add" ? "default" : "outline"}
                onClick={() => setRepoMode("add")}
                className="flex-1"
              >
                Link Existing
              </Button>
              <Button
                variant={repoMode === "create" ? "default" : "outline"}
                onClick={() => setRepoMode("create")}
                className="flex-1"
              >
                Create New
              </Button>
            </div>

            {repoMode === "add" ? (
              <div>
                {loadingRepos ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Loading repositories...
                    </span>
                  </div>
                ) : !isGitHubConnected ? (
                  <div className="text-sm text-muted-foreground mt-2">
                    Connect GitHub in settings to link repositories.
                  </div>
                ) : availableReposToAdd.length === 0 ? (
                  <div className="text-sm text-muted-foreground mt-2">
                    {availableRepos.length === 0
                      ? "No repositories found. Connect GitHub in settings."
                      : "All available repositories are already linked."}
                  </div>
                ) : (
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className="w-full justify-between mt-2"
                      >
                        {selectedRepo
                          ? availableReposToAdd.find(
                              (repo) => repo.full_name === selectedRepo
                            )?.full_name || "Select repository..."
                          : "Select repository..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search repositories..." />
                        <CommandList>
                          <CommandEmpty>No repositories found.</CommandEmpty>
                          <CommandGroup>
                            {availableReposToAdd.map((repo) => (
                              <CommandItem
                                key={repo.id}
                                value={repo.full_name}
                                onSelect={() => {
                                  setSelectedRepo(
                                    repo.full_name === selectedRepo
                                      ? ""
                                      : repo.full_name
                                  );
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedRepo === repo.full_name
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                <div className="flex items-center gap-2">
                                  <Github className="w-4 h-4" />
                                  <span>{repo.full_name}</span>
                                  {repo.private && (
                                    <Badge variant="secondary" className="ml-2">
                                      Private
                                    </Badge>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="repo-name">Repository Name</Label>
                  <Input
                    id="repo-name"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="my-repository"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="repo-description">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="repo-description"
                    value={newRepoDescription}
                    onChange={(e) => setNewRepoDescription(e.target.value)}
                    placeholder="Repository description"
                    className="mt-2"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="repo-private"
                    checked={newRepoPrivate}
                    onChange={(e) => setNewRepoPrivate(e.target.checked)}
                    className="rounded"
                  />
                  <Label
                    htmlFor="repo-private"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Make this repository private
                  </Label>
                </div>
              </div>
            )}
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
      ) : (
        <div className="space-y-4">
          {selectedRepo && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Github className="w-4 h-4" />
              <span className="text-sm font-medium">{selectedRepo}</span>
            </div>
          )}

          <div>
            <Label htmlFor="deployment-name">Deployment Name *</Label>
            <Input
              id="deployment-name"
              value={deploymentName}
              onChange={(e) => setDeploymentName(e.target.value)}
              placeholder="e.g., Marketing Website, API, Client App"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="deployment-description">
              Description (optional)
            </Label>
            <Textarea
              id="deployment-description"
              value={deploymentDescription}
              onChange={(e) => setDeploymentDescription(e.target.value)}
              placeholder="Deployment description"
              className="mt-2"
              rows={2}
            />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {step === "select-repo" ? (
          <Button
            onClick={handleSelectRepo}
            disabled={
              loading ||
              (repoMode === "add" && !selectedRepo) ||
              (repoMode === "create" && !newRepoName.trim())
            }
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Next
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              Back
            </Button>
            <Button
              onClick={handleCreateDeployment}
              disabled={loading || !deploymentName.trim()}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Deployment
            </Button>
          </>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
