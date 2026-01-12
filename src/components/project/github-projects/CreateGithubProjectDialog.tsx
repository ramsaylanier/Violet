import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  getGitHubUser,
  listGitHubOrganizations,
  getGitHubRepositoryId,
  createGitHubProject
} from "@/api/github";
import type { Project } from "@/types";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSuccess: (updatedProject: Project) => void;
  isGitHubConnected: boolean;
  loading?: boolean;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
  isGitHubConnected,
  loading: parentLoading = false
}: CreateProjectDialogProps) {
  const [newProjectOwner, setNewProjectOwner] = useState("");
  const [newProjectOwnerType, setNewProjectOwnerType] = useState<
    "user" | "org"
  >("user");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectBody, setNewProjectBody] = useState("");
  const [newProjectPublic, setNewProjectPublic] = useState(false);
  const [newProjectRepository, setNewProjectRepository] = useState<string>("");
  const [submittingProject, setSubmittingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Owner options
  const [gitHubUser, setGitHubUser] = useState<{ login: string } | null>(null);
  const [gitHubOrganizations, setGitHubOrganizations] = useState<
    Array<{ login: string; id: number; avatar_url?: string }>
  >([]);
  const [loadingOwners, setLoadingOwners] = useState(false);

  const projectRepos = project.repositories || [];

  // Load GitHub user and organizations when dialog opens
  useEffect(() => {
    async function loadOwners() {
      if (!open || !isGitHubConnected) {
        return;
      }

      try {
        setLoadingOwners(true);
        const [userInfo, orgs] = await Promise.all([
          getGitHubUser(),
          listGitHubOrganizations()
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
  }, [open, isGitHubConnected]);

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
        }
      }

      const newProject = await createGitHubProject({
        owner: newProjectOwner,
        ownerType: newProjectOwnerType,
        title: newProjectTitle,
        body: newProjectBody || undefined,
        public: newProjectPublic,
        repositoryId
      });

      const projectData = {
        projectId: newProject.id,
        name: newProject.title,
        owner: newProject.owner?.login || newProjectOwner,
        ownerType: newProjectOwnerType as "user" | "org",
        url: newProject.url
      };

      const updatedProjects = [...(project.githubProjects || []), projectData];
      const { updateProject } = await import("@/api/projects");
      const updatedProject = await updateProject(project.id, {
        githubProjects: updatedProjects
      });

      onSuccess(updatedProject);
      onOpenChange(false);

      // Reset form
      setNewProjectOwner("");
      setNewProjectOwnerType("user");
      setNewProjectTitle("");
      setNewProjectBody("");
      setNewProjectPublic(false);
      setNewProjectRepository("");
      setError(null);
    } catch (err: any) {
      console.error("Failed to create project:", err);
      setError(err?.message || "Failed to create project");
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setNewProjectOwner("");
    setNewProjectOwnerType("user");
    setNewProjectTitle("");
    setNewProjectBody("");
    setNewProjectPublic(false);
    setNewProjectRepository("");
    setError(null);
  };

  const loading = parentLoading || submittingProject;

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Create GitHub Project</DialogTitle>
        <DialogDescription>
          Create a new GitHub Project and link it to this Violet project
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="new-project-owner-type">Owner Type</Label>
          <Select
            value={newProjectOwnerType}
            onValueChange={(value: "user" | "org") => {
              setNewProjectOwnerType(value);
              setNewProjectOwner("");
            }}
          >
            <SelectTrigger id="new-project-owner-type" className="mt-2">
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
            <Select value={newProjectOwner} onValueChange={setNewProjectOwner}>
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
          <Label htmlFor="new-project-repository">
            Default Repository (optional)
          </Label>
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
          <Label htmlFor="new-project-body">Description (optional)</Label>
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
            onCheckedChange={(checked) => setNewProjectPublic(checked === true)}
          />
          <Label
            htmlFor="new-project-public"
            className="text-sm font-normal cursor-pointer"
          >
            Make this project public
          </Label>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateProject}
          disabled={
            loading || !newProjectOwner.trim() || !newProjectTitle.trim()
          }
        >
          {loading ? (
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
  );
}
