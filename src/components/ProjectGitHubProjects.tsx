import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CheckSquare,
  ExternalLink,
  Plus,
  Loader2,
  Trash2,
  Check,
  ChevronsUpDown,
  AlertCircle,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import type { Project, GitHubProject, User } from "@/types";
import { getCurrentUser } from "@/api/auth";
import {
  listGitHubProjectsForRepository,
  createGitHubProject,
  getGitHubProject,
  getGitHubUser,
  listGitHubOrganizations,
  getGitHubRepositoryId,
} from "@/api/github";
import { updateProject } from "@/api/projects";

interface ProjectGitHubProjectsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectGitHubProjects({
  project,
  onUpdate,
}: ProjectGitHubProjectsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [projectToRemove, setProjectToRemove] = useState<{
    projectId: string;
    name: string;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Create project form state
  const [newProjectOwner, setNewProjectOwner] = useState("");
  const [newProjectOwnerType, setNewProjectOwnerType] = useState<
    "user" | "org"
  >("user");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectBody, setNewProjectBody] = useState("");
  const [newProjectPublic, setNewProjectPublic] = useState(false);
  const [newProjectRepository, setNewProjectRepository] = useState<string>(""); // fullName of selected repo
  const [submittingProject, setSubmittingProject] = useState(false);

  // Owner options
  const [gitHubUser, setGitHubUser] = useState<{ login: string } | null>(null);
  const [gitHubOrganizations, setGitHubOrganizations] = useState<
    Array<{ login: string; id: number; avatar_url?: string }>
  >([]);
  const [loadingOwners, setLoadingOwners] = useState(false);

  const queryClient = useQueryClient();
  const projectGitHubProjects = project.githubProjects || [];
  const projectRepos = project.repositories || [];
  const isGitHubConnected = !!user?.githubToken;

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoadingUser(false);
      }
    }
    loadUser();
  }, []);

  // Load GitHub user and organizations when dialog opens
  useEffect(() => {
    async function loadOwners() {
      if (!createDialogOpen || !isGitHubConnected || !user?.githubToken) {
        return;
      }

      try {
        setLoadingOwners(true);
        const [userInfo, orgs] = await Promise.all([
          getGitHubUser(),
          listGitHubOrganizations(),
        ]);
        setGitHubUser(userInfo);
        setGitHubOrganizations(orgs);
      } catch (error) {
        console.error("Error loading GitHub owners:", error);
      } finally {
        setLoadingOwners(false);
      }
    }

    loadOwners();
  }, [createDialogOpen, isGitHubConnected, user?.githubToken]);

  // Fetch projects for all repositories using TanStack Query
  const projectIds = new Set(projectGitHubProjects.map((p) => p.projectId));

  // Use useQuery with a single query function that fetches all repositories in parallel
  const {
    data: repositoryProjectsData = [],
    isLoading: loadingRepositoryProjects,
  } = useQuery({
    queryKey: [
      "github-repository-projects",
      projectRepos
        .map((r) => r.fullName)
        .sort()
        .join(","),
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
    retry: 1,
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
        url: projectToLink.url,
      };

      const updatedProjects = [...projectGitHubProjects, projectData];
      const updatedProject = await updateProject(project.id, {
        githubProjects: updatedProjects,
      });

      onUpdate(updatedProject);

      // Invalidate repository projects query to refetch and update the list
      queryClient.invalidateQueries({
        queryKey: ["github-repository-projects"],
      });
    } catch (err: any) {
      console.error("Failed to link repository project:", err);
      setError(err?.message || "Failed to link project");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectOwner.trim() || !newProjectTitle.trim()) {
      setError("Owner and title are required");
      return;
    }

    try {
      setSubmittingProject(true);
      setError(null);

      // Get repository ID from selected repository
      let repositoryId: string | undefined;
      if (newProjectRepository) {
        try {
          const [owner, repo] = newProjectRepository.split("/");
          if (owner && repo) {
            repositoryId = await getGitHubRepositoryId(owner, repo);
          }
        } catch (repoErr) {
          console.warn(
            "Failed to get repository ID, continuing without it:",
            repoErr
          );
          // Continue without repository ID - it's optional
        }
      }

      const newProject = await createGitHubProject({
        owner: newProjectOwner,
        ownerType: newProjectOwnerType,
        title: newProjectTitle,
        body: newProjectBody || undefined,
        public: newProjectPublic,
        repositoryId,
      });

      const ownerType = newProjectOwnerType;
      const projectData = {
        projectId: newProject.id,
        name: newProject.title,
        owner: newProject.owner?.login || newProjectOwner,
        ownerType: ownerType as "user" | "org",
        url: newProject.url,
      };

      const updatedProjects = [...projectGitHubProjects, projectData];
      const updatedProject = await updateProject(project.id, {
        githubProjects: updatedProjects,
      });

      onUpdate(updatedProject);
      setCreateDialogOpen(false);
      setNewProjectOwner("");
      setNewProjectOwnerType("user");
      setNewProjectTitle("");
      setNewProjectBody("");
      setNewProjectPublic(false);
      setNewProjectRepository("");

      // Invalidate repository projects query to refetch and update the list
      queryClient.invalidateQueries({
        queryKey: ["github-repository-projects"],
      });
    } catch (err: any) {
      console.error("Failed to create project:", err);
      setError(err?.message || "Failed to create project");
    } finally {
      setSubmittingProject(false);
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
        githubProjects: updatedProjects.length > 0 ? updatedProjects : [],
      });

      onUpdate(updatedProject);
      setRemoveDialogOpen(false);
      setProjectToRemove(null);
    } catch (err: any) {
      console.error("Failed to remove project:", err);
      setError(err?.message || "Failed to remove project");
    } finally {
      setLoading(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isGitHubConnected) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <h4 className="text-sm font-medium">GitHub not connected</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your GitHub account to link GitHub Projects
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create GitHub Project</DialogTitle>
                  <DialogDescription>
                    Create a new GitHub Project and link it to this Violet
                    project
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="new-project-owner-type">Owner Type</Label>
                    <Select
                      value={newProjectOwnerType}
                      onValueChange={(value: "user" | "org") => {
                        setNewProjectOwnerType(value);
                        setNewProjectOwner(""); // Reset owner when type changes
                      }}
                    >
                      <SelectTrigger
                        id="new-project-owner-type"
                        className="mt-2"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="org">Organization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="new-project-owner">Owner</Label>
                    {loadingOwners ? (
                      <div className="flex items-center gap-2 mt-2 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          Loading owners...
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={newProjectOwner}
                        onValueChange={setNewProjectOwner}
                      >
                        <SelectTrigger id="new-project-owner" className="mt-2">
                          <SelectValue
                            placeholder={`Select ${newProjectOwnerType === "user" ? "user" : "organization"}...`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {newProjectOwnerType === "user" && gitHubUser && (
                            <SelectItem value={gitHubUser.login}>
                              {gitHubUser.login}
                            </SelectItem>
                          )}
                          {newProjectOwnerType === "org" &&
                            gitHubOrganizations.map((org) => (
                              <SelectItem key={org.id} value={org.login}>
                                {org.login}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="new-project-repository">Default Repository (optional)</Label>
                    {projectRepos.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">
                        No repositories linked to this project
                      </p>
                    ) : (
                      <Select
                        value={newProjectRepository}
                        onValueChange={setNewProjectRepository}
                      >
                        <SelectTrigger id="new-project-repository" className="mt-2">
                          <SelectValue placeholder="Select a repository..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {projectRepos.map((repo) => (
                            <SelectItem key={repo.fullName} value={repo.fullName}>
                              {repo.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="new-project-title">Title</Label>
                    <Input
                      id="new-project-title"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="Project title"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-project-body">
                      Description (optional)
                    </Label>
                    <Textarea
                      id="new-project-body"
                      value={newProjectBody}
                      onChange={(e) => setNewProjectBody(e.target.value)}
                      placeholder="Project description"
                      className="mt-2"
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="new-project-public"
                      checked={newProjectPublic}
                      onCheckedChange={(checked) =>
                        setNewProjectPublic(checked === true)
                      }
                    />
                    <Label
                      htmlFor="new-project-public"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Make this project public
                    </Label>
                  </div>
                  {error && (
                    <div className="text-sm text-destructive">{error}</div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreateDialogOpen(false);
                      setNewProjectOwner("");
                      setNewProjectOwnerType("user");
                      setNewProjectTitle("");
                      setNewProjectBody("");
                      setNewProjectPublic(false);
                      setNewProjectRepository("");
                      setError(null);
                    }}
                    disabled={loading || submittingProject}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={
                      loading ||
                      submittingProject ||
                      !newProjectOwner.trim() ||
                      !newProjectTitle.trim()
                    }
                  >
                    {loading || submittingProject ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRepositoryProjects && projectRepos.length > 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading projects from repositories...
              </span>
            </div>
          ) : projectGitHubProjects.length > 0 ||
            uniqueRepositoryProjects.length > 0 ? (
            <div className="space-y-4">
              {/* Linked Projects */}
              {projectGitHubProjects.map((proj) => (
                <Card key={proj.projectId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CheckSquare className="w-5 h-5" />
                        {proj.name}
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveClick(proj)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Project ID
                      </div>
                      <div className="text-sm font-mono mt-1">
                        {proj.projectId}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Owner
                      </div>
                      <div className="text-sm mt-1">{proj.owner}</div>
                    </div>
                    {proj.url && (
                      <div>
                        <a
                          href={proj.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          View on GitHub
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Repository Projects */}
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
                        <Card key={proj.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <CheckSquare className="w-4 h-4" />
                                {proj.title}
                              </CardTitle>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleLinkRepositoryProject(proj)
                                }
                                disabled={loading}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Link
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">
                                Owner
                              </div>
                              <div className="text-sm mt-1">
                                {proj.owner?.login || "Unknown"}
                              </div>
                            </div>
                            {proj.shortDescription && (
                              <div>
                                <div className="text-sm font-medium text-muted-foreground">
                                  Description
                                </div>
                                <div className="text-sm mt-1">
                                  {proj.shortDescription}
                                </div>
                              </div>
                            )}
                            {proj.url && (
                              <div>
                                <a
                                  href={proj.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                  View on GitHub
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No GitHub Projects linked</p>
              <p className="text-sm mt-1">
                Link a GitHub Project to enable project management features
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove GitHub Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the GitHub Project integration?
              This will unlink the project from this Violet project, but will
              not delete the GitHub Project itself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveProject}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
