import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Github,
  ExternalLink,
  Plus,
  Loader2,
  Trash2,
  Check,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/client/components/ui/dialog";
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
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { Label } from "@/client/components/ui/label";
import { Checkbox } from "@/client/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/client/components/ui/tooltip";
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
import type { Project, GitHubRepository, GitHubIssue } from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { useGitHubRepositories } from "@/client/hooks/useGitHubRepositories";
import { getProjectRepositories } from "@/client/lib/utils";
import {
  createGitHubRepository,
  deleteGitHubRepository,
  listGitHubIssues
} from "@/client/api/github";
import { updateProject } from "@/client/api/projects";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/client/components/ui/collapsible";
import { Badge } from "@/client/components/ui/badge";
import { ProjectWorkflows } from "./ProjectWorkflows";

interface ProjectRepositoriesProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

type Repository = {
  owner: string;
  name: string;
  fullName: string;
  url: string;
};

export function ProjectRepositories({
  project,
  onUpdate
}: ProjectRepositoriesProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "create">("add");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [repoToRemove, setRepoToRemove] = useState<Repository | null>(null);
  const [deleteRepo, setDeleteRepo] = useState(false);
  const [confirmRepoName, setConfirmRepoName] = useState("");
  const { user } = useCurrentUser();
  const [repoIssues, setRepoIssues] = useState<
    Record<string, { issues: GitHubIssue[]; loading: boolean; open: boolean }>
  >({});

  const projectRepos = getProjectRepositories(project);
  const isGitHubConnected = !!user?.githubToken;

  // Fetch GitHub repositories when dialog is open in "add" mode
  const { data: availableRepos = [], isLoading: loadingRepos } =
    useGitHubRepositories(dialogOpen && dialogMode === "add" && isGitHubConnected);

  const loadRepoIssues = async (repo: Repository, fullName: string) => {
    if (!user?.githubToken || repoIssues[fullName]?.loading) return;

    try {
      setRepoIssues((prev) => ({
        ...prev,
        [fullName]: {
          issues: prev[fullName]?.issues || [],
          loading: true,
          open: prev[fullName]?.open || false
        }
      }));

      const issues = await listGitHubIssues(repo.owner, repo.name);
      setRepoIssues((prev) => ({
        ...prev,
        [fullName]: {
          issues,
          loading: false,
          open: prev[fullName]?.open || false
        }
      }));
    } catch (err: any) {
      console.error(`Failed to load issues for ${fullName}:`, err);
      setRepoIssues((prev) => ({
        ...prev,
        [fullName]: {
          issues: prev[fullName]?.issues || [],
          loading: false,
          open: prev[fullName]?.open || false
        }
      }));
    }
  };

  const toggleRepoIssues = (repo: Repository, fullName: string) => {
    const currentState = repoIssues[fullName];
    const newOpenState = !currentState?.open;

    setRepoIssues((prev) => ({
      ...prev,
      [fullName]: {
        issues: prev[fullName]?.issues || [],
        loading: prev[fullName]?.loading || false,
        open: newOpenState
      }
    }));

    if (newOpenState && !currentState?.issues.length) {
      loadRepoIssues(repo, fullName);
    }
  };

  const handleAddRepository = async () => {
    if (!selectedRepo) return;

    try {
      setLoading(true);
      setError(null);

      const repo = availableRepos.find((r) => r.full_name === selectedRepo);
      if (!repo) {
        throw new Error("Repository not found");
      }

      // Check if repository is already added
      const [owner, repoName] = repo.full_name.split("/");
      const newRepo: Repository = {
        owner,
        name: repoName,
        fullName: repo.full_name,
        url: repo.html_url
      };

      if (projectRepos.some((r) => r.fullName === newRepo.fullName)) {
        setError("This repository is already linked to this project");
        return;
      }

      // Add to existing repositories array
      const updatedRepos = [...projectRepos, newRepo];
      const updatedProject = await updateProject(project.id, {
        repositories: updatedRepos
      });

      onUpdate(updatedProject);
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDialogOpen(false);
      setSelectedRepo("");
      setComboboxOpen(false);
    } catch (err: any) {
      console.error("Failed to add repository:", err);
      setError(err?.message || "Failed to add repository");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRepository = async () => {
    if (!newRepoName.trim()) {
      setError("Repository name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const newRepo = await createGitHubRepository({
        name: newRepoName,
        description: newRepoDescription || undefined,
        private: newRepoPrivate
      });

      const [owner, repoName] = newRepo.full_name.split("/");
      const repo: Repository = {
        owner,
        name: repoName,
        fullName: newRepo.full_name,
        url: newRepo.html_url
      };

      // Check if repository is already added
      if (projectRepos.some((r) => r.fullName === repo.fullName)) {
        setError("This repository is already linked to this project");
        return;
      }

      // Add to existing repositories array
      const updatedRepos = [...projectRepos, repo];
      const updatedProject = await updateProject(project.id, {
        repositories: updatedRepos
      });

      onUpdate(updatedProject);
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDialogOpen(false);
      setNewRepoName("");
      setNewRepoDescription("");
      setNewRepoPrivate(false);
    } catch (err: any) {
      console.error("Failed to create repository:", err);
      setError(err?.message || "Failed to create repository");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClick = (repo: Repository) => {
    setRepoToRemove(repo);
    setRemoveDialogOpen(true);
    setDeleteRepo(false);
    setConfirmRepoName("");
    setError(null);
  };

  const handleRemoveRepository = async () => {
    if (!repoToRemove) return;

    try {
      setLoading(true);
      setError(null);

      // If deletion is requested, delete from GitHub first
      if (deleteRepo) {
        try {
          await deleteGitHubRepository(repoToRemove.owner, repoToRemove.name);
        } catch (deleteErr: any) {
          console.error("Failed to delete repository from GitHub:", deleteErr);
          setError(
            deleteErr?.message ||
              "Failed to delete repository from GitHub. It will still be removed from this project."
          );
          // Continue to remove from project even if deletion fails
        }
      }

      // Remove from project repositories array
      const updatedRepos = projectRepos.filter(
        (r) => r.fullName !== repoToRemove.fullName
      );
      const updatedProject = await updateProject(project.id, {
        repositories: updatedRepos.length > 0 ? updatedRepos : []
      });

      onUpdate(updatedProject);
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setRemoveDialogOpen(false);
      setRepoToRemove(null);
      setDeleteRepo(false);
      setConfirmRepoName("");
    } catch (err: any) {
      console.error("Failed to remove repository:", err);
      setError(err?.message || "Failed to remove repository");
    } finally {
      setLoading(false);
    }
  };

  const isRemoveDisabled = deleteRepo
    ? confirmRepoName !== repoToRemove?.fullName
    : false;

  // Filter out already added repositories from the select list
  const availableReposToAdd = availableRepos.filter(
    (repo) => !projectRepos.some((pr) => pr.fullName === repo.full_name)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Repositories</h3>
          <p className="text-sm text-muted-foreground">
            Manage GitHub repositories linked to this project
          </p>
        </div>
        {isGitHubConnected ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Repository
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Repository</DialogTitle>
                <DialogDescription>
                  Link an existing repository or create a new one
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={dialogMode === "add" ? "default" : "outline"}
                    onClick={() => setDialogMode("add")}
                    className="flex-1"
                  >
                    Link Existing
                  </Button>
                  <Button
                    variant={dialogMode === "create" ? "default" : "outline"}
                    onClick={() => setDialogMode("create")}
                    className="flex-1"
                  >
                    Create New
                  </Button>
                </div>

                {dialogMode === "add" ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="repo-select">Repository</Label>
                      {loadingRepos ? (
                        <div className="flex items-center gap-2 mt-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            Loading repositories...
                          </span>
                        </div>
                      ) : availableReposToAdd.length === 0 ? (
                        <div className="text-sm text-muted-foreground mt-2">
                          No available repositories to add. All repositories are
                          already linked.
                        </div>
                      ) : (
                        <Popover
                          open={comboboxOpen}
                          onOpenChange={setComboboxOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              id="repo-select"
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
                          <PopoverContent
                            className="w-[400px] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Search repositories..." />
                              <CommandList>
                                <CommandEmpty>
                                  No repositories found.
                                </CommandEmpty>
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
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
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
                      <Checkbox
                        id="repo-private"
                        checked={newRepoPrivate}
                        onCheckedChange={(checked) =>
                          setNewRepoPrivate(checked === true)
                        }
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

                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setError(null);
                    setSelectedRepo("");
                    setComboboxOpen(false);
                    setNewRepoName("");
                    setNewRepoDescription("");
                    setNewRepoPrivate(false);
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={
                    dialogMode === "add"
                      ? handleAddRepository
                      : handleCreateRepository
                  }
                  disabled={
                    loading ||
                    (dialogMode === "add" && !selectedRepo) ||
                    (dialogMode === "create" && !newRepoName.trim())
                  }
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {dialogMode === "add"
                    ? "Link Repository"
                    : "Create Repository"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Repository
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-2">
                <p>GitHub account required to add repositories.</p>
                <Link
                  to="/settings"
                  className="underline font-medium text-background hover:text-background/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  Connect GitHub in settings
                </Link>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {projectRepos.length > 0 ? (
        <div className="space-y-4">
          {projectRepos.map((repo) => (
            <Card key={repo.fullName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Github className="w-5 h-5" />
                      {repo.fullName}
                    </CardTitle>
                    <div>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveClick(repo)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Issues Section */}
                {isGitHubConnected && (
                  <Collapsible
                    open={repoIssues[repo.fullName]?.open || false}
                    onOpenChange={() => toggleRepoIssues(repo, repo.fullName)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto hover:bg-transparent"
                      >
                        <div className="flex items-center gap-2">
                          {repoIssues[repo.fullName]?.open ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">Issues</span>
                          {repoIssues[repo.fullName]?.issues && (
                            <Badge variant="secondary" className="ml-2">
                              {repoIssues[repo.fullName].issues.length}
                            </Badge>
                          )}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {repoIssues[repo.fullName]?.loading ? (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            Loading issues...
                          </span>
                        </div>
                      ) : repoIssues[repo.fullName]?.issues.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-2">
                          No open issues
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {repoIssues[repo.fullName]?.issues
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
                          {repoIssues[repo.fullName]?.issues.length > 5 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              +{repoIssues[repo.fullName].issues.length - 5}{" "}
                              more issues
                            </div>
                          )}
                          <a
                            href={`${repo.url}/issues`}
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

                {/* Workflows Section */}
                {isGitHubConnected && (
                  <div className="mt-4 pt-4 border-t">
                    <ProjectWorkflows
                      owner={repo.owner}
                      repo={repo.name}
                      repoUrl={repo.url}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Github className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h4 className="text-sm font-medium">No repositories linked</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Link or create a GitHub repository to get started
                </p>
              </div>
              {isGitHubConnected ? (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Repository
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button disabled onClick={() => setDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Repository
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-2">
                      <p>GitHub account required to add repositories.</p>
                      <Link
                        to="/settings"
                        className="underline font-medium text-background hover:text-background/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Connect GitHub in settings
                      </Link>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Repository</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the repository from this project. You can
              optionally delete the repository from GitHub as well.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="delete-repo"
                checked={deleteRepo}
                onCheckedChange={(checked) => {
                  setDeleteRepo(checked === true);
                  if (!checked) {
                    setConfirmRepoName("");
                  }
                }}
              />
              <Label
                htmlFor="delete-repo"
                className="text-sm font-normal cursor-pointer"
              >
                Also delete the repository from GitHub
              </Label>
            </div>
            {deleteRepo && (
              <div className="space-y-2">
                <Label htmlFor="confirm-repo-name">
                  Type the repository name to confirm deletion:
                </Label>
                <Input
                  id="confirm-repo-name"
                  value={confirmRepoName}
                  onChange={(e) => setConfirmRepoName(e.target.value)}
                  placeholder={repoToRemove?.fullName}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Expected: <code>{repoToRemove?.fullName}</code>
                </p>
              </div>
            )}
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveDialogOpen(false);
                setRepoToRemove(null);
                setDeleteRepo(false);
                setConfirmRepoName("");
                setError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRepository}
              disabled={loading || isRemoveDisabled}
              variant={deleteRepo ? "destructive" : "default"}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {deleteRepo ? "Remove and Delete" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
