import { useEffect, useState } from "react";
import { Github, ExternalLink, Plus, Loader2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { Project, GitHubRepository } from "@/types";
import { listGitHubRepositories, createGitHubRepository } from "@/api/github";
import { updateProject } from "@/api/projects";

interface ProjectRepositoriesProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectRepositories({
  project,
  onUpdate,
}: ProjectRepositoriesProps) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "create">("add");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);

  const loadRepositories = async () => {
    try {
      setLoadingRepos(true);
      const repos = await listGitHubRepositories();
      setRepositories(repos);
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

      const repo = repositories.find((r) => r.full_name === selectedRepo);
      if (!repo) {
        throw new Error("Repository not found");
      }

      const [owner, repoName] = repo.full_name.split("/");
      const updatedProject = await updateProject(project.id, {
        githubRepo: {
          owner,
          name: repoName,
          fullName: repo.full_name,
          url: repo.html_url,
        },
      });

      onUpdate(updatedProject);
      setDialogOpen(false);
      setSelectedRepo("");
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
      const updatedProject = await updateProject(project.id, {
        githubRepo: {
          owner,
          name: repoName,
          fullName: newRepo.full_name,
          url: newRepo.html_url,
        },
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

  const handleRemoveRepository = async () => {
    if (!confirm("Are you sure you want to remove this repository?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updatedProject = await updateProject(project.id, {
        githubRepo: undefined,
      });

      onUpdate(updatedProject);
    } catch (err: any) {
      console.error("Failed to remove repository:", err);
      setError(err?.message || "Failed to remove repository");
    } finally {
      setLoading(false);
    }
  };

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
                    ) : (
                      <Select
                        value={selectedRepo}
                        onValueChange={setSelectedRepo}
                      >
                        <SelectTrigger id="repo-select" className="mt-2">
                          <SelectValue placeholder="Select a repository" />
                        </SelectTrigger>
                        <SelectContent>
                          {repositories.map((repo) => (
                            <SelectItem key={repo.id} value={repo.full_name}>
                              <div className="flex items-center gap-2">
                                <Github className="w-4 h-4" />
                                <span>{repo.full_name}</span>
                                {repo.private && (
                                  <Badge variant="secondary" className="ml-2">
                                    Private
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <Label htmlFor="repo-description">Description (optional)</Label>
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
                disabled={loading || (dialogMode === "add" && !selectedRepo) || (dialogMode === "create" && !newRepoName.trim())}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {dialogMode === "add" ? "Link Repository" : "Create Repository"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {project.githubRepo ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                {project.githubRepo.fullName}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveRepository}
                disabled={loading}
              >
                Remove
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Owner
              </div>
              <div className="text-sm mt-1">{project.githubRepo.owner}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Repository Name
              </div>
              <div className="text-sm mt-1">{project.githubRepo.name}</div>
            </div>
            <div>
              <a
                href={project.githubRepo.url}
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
    </div>
  );
}
