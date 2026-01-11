import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  SelectValue,
} from "@/components/ui/select";
import { createGitHubIssue } from "@/api/github";
import type { Project } from "@/types";

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSuccess: () => void;
  error?: string | null;
}

export function CreateIssueDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
  error: externalError,
}: CreateIssueDialogProps) {
  const [newIssueRepo, setNewIssueRepo] = useState<string>("");
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueBody, setNewIssueBody] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectRepos = project.repositories || [];
  const displayError = error || externalError;

  const handleCreateIssue = async () => {
    if (!newIssueRepo || !newIssueTitle.trim()) {
      setError("Repository and title are required");
      return;
    }

    const [owner, repo] = newIssueRepo.split("/");
    if (!owner || !repo) {
      setError("Invalid repository format");
      return;
    }

    try {
      setSubmittingIssue(true);
      setError(null);
      await createGitHubIssue({
        owner,
        repo,
        title: newIssueTitle,
        body: newIssueBody || undefined,
      });

      onOpenChange(false);
      setNewIssueRepo("");
      setNewIssueTitle("");
      setNewIssueBody("");
      onSuccess();
    } catch (err: any) {
      console.error("Failed to create issue:", err);
      setError(err?.message || "Failed to create issue");
    } finally {
      setSubmittingIssue(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setNewIssueRepo("");
    setNewIssueTitle("");
    setNewIssueBody("");
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
        <Button variant="outline" onClick={handleCancel} disabled={submittingIssue}>
          Cancel
        </Button>
        <Button onClick={handleCreateIssue} disabled={submittingIssue}>
          {submittingIssue ? (
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
