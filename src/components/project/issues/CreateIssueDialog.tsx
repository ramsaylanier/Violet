import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  createGitHubIssue,
  addGitHubProjectItem,
  getGitHubIssueNodeId
} from "@/api/github";
import { useGetGithubProjects } from "@/hooks/useGetGithubProjects";
import type { Project, GitHubIssue } from "@/types";

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSuccess: () => void;
  error?: string | null;
}

export function CreateIssueDialog({
  onOpenChange,
  project,
  onSuccess,
  error: externalError
}: CreateIssueDialogProps) {
  const [newIssueRepo, setNewIssueRepo] = useState<string>(
    project.repositories?.[0]?.fullName || ""
  );
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueBody, setNewIssueBody] = useState("");
  const [selectedGitHubProject, setSelectedGitHubProject] =
    useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const projectRepos = project.repositories || [];
  const { availableRepositoryProjects } = useGetGithubProjects(project);

  const displayError = error || externalError;

  const createIssueMutation = useMutation({
    mutationFn: async () => {
      if (!newIssueRepo || !newIssueTitle.trim()) {
        throw new Error("Repository and title are required");
      }

      const [owner, repo] = newIssueRepo.split("/");
      if (!owner || !repo) {
        throw new Error("Invalid repository format");
      }

      const createdIssue = await createGitHubIssue({
        owner,
        repo,
        title: newIssueTitle,
        body: newIssueBody || undefined
      });

      // If a GitHub project is selected, add the issue to it
      if (selectedGitHubProject) {
        try {
          // Get the issue node ID (required for GraphQL API)
          const issueNodeId = await getGitHubIssueNodeId(
            owner,
            repo,
            createdIssue.number
          );

          // Add the issue to the selected GitHub project
          await addGitHubProjectItem(selectedGitHubProject, issueNodeId);
        } catch (projectError) {
          console.error("Failed to add issue to GitHub project:", projectError);
          // Don't fail the entire operation if adding to project fails
          // The issue was created successfully, just log the error
        }
      }

      return createdIssue;
    },
    onSuccess: (createdIssue) => {
      // Optimistically update the query cache with the new issue
      const queryKey = ["github-issues", project.id];
      const existingIssues = queryClient.getQueryData<
        Array<
          GitHubIssue & {
            repository: { owner: string; name: string; fullName: string };
          }
        >
      >(queryKey);

      if (existingIssues) {
        // Find the repository info
        const repoInfo = project.repositories?.find(
          (r) => r.fullName === newIssueRepo
        );

        if (repoInfo) {
          // Transform the created issue to match the expected format
          const issueWithRepo: GitHubIssue & {
            repository: { owner: string; name: string; fullName: string };
          } = {
            ...createdIssue,
            repository: {
              owner: repoInfo.owner,
              name: repoInfo.name,
              fullName: repoInfo.fullName
            }
          };

          // Add the new issue to the beginning of the array
          queryClient.setQueryData(queryKey, [
            issueWithRepo,
            ...existingIssues
          ]);
        }
      }

      // Reset form and close dialog
      onOpenChange(false);
      setNewIssueTitle("");
      setNewIssueBody("");
      setSelectedGitHubProject("");
      setError(null);
      onSuccess();
    },
    onError: (err: any) => {
      console.error("Failed to create issue:", err);
      setError(err?.message || "Failed to create issue");
    }
  });

  const handleCreateIssue = () => {
    setError(null);
    createIssueMutation.mutate();
  };

  const handleCancel = () => {
    onOpenChange(false);
    setNewIssueRepo("");
    setNewIssueTitle("");
    setNewIssueBody("");
    setSelectedGitHubProject("");
    setError(null);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Issue</DialogTitle>
        <DialogDescription>
          Create a new issue in one of your linked repositories
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="repo-select">Repository</Label>
          <Select value={newIssueRepo} onValueChange={setNewIssueRepo}>
            <SelectTrigger id="repo-select" className="mt-2">
              <SelectValue placeholder="Select repository" />
            </SelectTrigger>
            <SelectContent>
              {projectRepos.map((repo) => (
                <SelectItem key={repo.fullName} value={repo.fullName}>
                  {repo.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {availableRepositoryProjects.length > 0 && (
          <div>
            <Label htmlFor="github-project-select">
              GitHub Project (optional)
            </Label>
            <Select
              defaultValue={availableRepositoryProjects[0].id}
              // value={selectedGitHubProject}
              onValueChange={setSelectedGitHubProject}
            >
              <SelectTrigger id="github-project-select" className="mt-2">
                <SelectValue placeholder="Select a GitHub project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {availableRepositoryProjects.map((githubProject) => (
                  <SelectItem key={githubProject.id} value={githubProject.id}>
                    {githubProject.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="issue-title">Title</Label>
          <Input
            id="issue-title"
            value={newIssueTitle}
            onChange={(e) => setNewIssueTitle(e.target.value)}
            placeholder="Issue title"
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="issue-body">Description (optional)</Label>
          <Textarea
            id="issue-body"
            value={newIssueBody}
            onChange={(e) => setNewIssueBody(e.target.value)}
            placeholder="Issue description"
            className="mt-2"
            rows={5}
          />
        </div>
        {displayError && (
          <div className="text-sm text-destructive">{displayError}</div>
        )}
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={createIssueMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateIssue}
          disabled={createIssueMutation.isPending}
        >
          {createIssueMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Issue"
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
