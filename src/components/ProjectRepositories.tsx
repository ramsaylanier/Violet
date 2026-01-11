import { useEffect, useState } from "react";
import { Github, ExternalLink, Plus, Loader2, Trash2, Check, ChevronsUpDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Project, GitHubRepository } from "@/types";
import {
  listGitHubRepositories,
  createGitHubRepository,
  deleteGitHubRepository,
} from "@/api/github";
import { updateProject } from "@/api/projects";

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
  onUpdate,
}: ProjectRepositoriesProps) {
  const [availableRepos, setAvailableRepos] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
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

  const projectRepos = project.repositories || [];

  const loadRepositories = async () => {
    try {
      setLoadingRepos(true);
      const repos = await listGitHubRepositories();
      setAvailableRepos(repos);
    } catch (err: any) {
      console.error("Failed to load repositories:", err);
      setError(err?.message || "Failed to load repositories");
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (dialogOpen && dialogMode === "add") {
      loadRepositories();
    }
  }, [dialogOpen, dialogMode]);

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
        url: repo.html_url,
      };

      if (projectRepos.some((r) => r.fullName === newRepo.fullName)) {
        setError("This repository is already linked to this project");
        return;
      }

      // Add to existing repositories array
      const updatedRepos = [...projectRepos, newRepo];
      const updatedProject = await updateProject(project.id, {
        repositories: updatedRepos,
      });

      onUpdate(updatedProject);
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
        private: newRepoPrivate,
      });

      const [owner, repoName] = newRepo.full_name.split("/");
      const repo: Repository = {
        owner,
        name: repoName,
        fullName: newRepo.full_name,
        url: newRepo.html_url,
      };

      // Check if repository is already added
      if (projectRepos.some((r) => r.fullName === repo.fullName)) {
        setError("This repository is already linked to this project");
        return;
      }

      // Add to existing repositories array
      const updatedRepos = [...projectRepos, repo];
      const updatedProject = await updateProject(project.id, {
        repositories: updatedRepos,
      });

      onUpdate(updatedProject);
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
        repositories: updatedRepos.length > 0 ? updatedRepos : [],
      });

      onUpdate(updatedProject);
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
                      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
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

              {error && <div className="text-sm text-destructive">{error}</div>}
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
                {dialogMode === "add" ? "Link Repository" : "Create Repository"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projectRepos.length > 0 ? (
        <div className="space-y-4">
          {projectRepos.map((repo) => (
            <Card key={repo.fullName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Github className="w-5 h-5" />
                    {repo.fullName}
                  </CardTitle>
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
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Owner
                  </div>
                  <div className="text-sm mt-1">{repo.owner}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Repository Name
                  </div>
                  <div className="text-sm mt-1">{repo.name}</div>
                </div>
                <div>
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    View on GitHub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
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
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Repository
              </Button>
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
