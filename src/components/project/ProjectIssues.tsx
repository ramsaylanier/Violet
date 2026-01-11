import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Plus,
  Loader2,
  MessageSquare,
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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { Project, GitHubIssue, GitHubIssueComment, User } from "@/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { GitHubNotConnectedState } from "@/components/shared/GitHubNotConnectedState";
import { NoRepositoriesState } from "@/components/shared/NoRepositoriesState";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  listGitHubIssuesAggregated,
  closeGitHubIssue,
  reopenGitHubIssue,
  addGitHubIssueComment,
  listGitHubIssueComments,
} from "@/api/github";
import { CreateIssueDialog } from "./issues/CreateIssueDialog";
import { IssueFilters } from "./issues/IssueFilters";
import { IssueList } from "./issues/IssueList";

interface ProjectIssuesProps {
  project: Project;
  onUpdate?: (updatedProject: Project) => void;
}

type IssueWithRepo = GitHubIssue & {
  repository: { owner: string; name: string; fullName: string };
};

export function ProjectIssues({ project }: ProjectIssuesProps) {
  const [issues, setIssues] = useState<IssueWithRepo[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<IssueWithRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loadingUser } = useCurrentUser();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueWithRepo | null>(
    null
  );
  const [comments, setComments] = useState<GitHubIssueComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Create issue form state
  const [newIssueRepo, setNewIssueRepo] = useState<string>("");
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueBody, setNewIssueBody] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">(
    "all"
  );
  const [repoFilter, setRepoFilter] = useState<string>("all");

  const projectRepos = project.repositories || [];
  const isGitHubConnected = !!user?.githubToken;

  useEffect(() => {
    if (isGitHubConnected && projectRepos.length > 0) {
      loadIssues();
    }
  }, [isGitHubConnected, projectRepos.length]);

  useEffect(() => {
    filterIssues();
  }, [issues, statusFilter, repoFilter]);

  const loadIssues = async () => {
    if (!user?.githubToken || projectRepos.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      const repos = projectRepos.map((r) => ({ owner: r.owner, name: r.name }));
      const allIssues = await listGitHubIssuesAggregated(repos, "all");
      setIssues(allIssues);
    } catch (err: any) {
      console.error("Failed to load issues:", err);
      setError(err?.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const filterIssues = () => {
    let filtered = [...issues];

    if (statusFilter !== "all") {
      filtered = filtered.filter((issue) => issue.state === statusFilter);
    }

    if (repoFilter !== "all") {
      filtered = filtered.filter(
        (issue) => issue.repository.fullName === repoFilter
      );
    }

    setFilteredIssues(filtered);
  };

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

      setCreateDialogOpen(false);
      setNewIssueRepo("");
      setNewIssueTitle("");
      setNewIssueBody("");
      await loadIssues();
    } catch (err: any) {
      console.error("Failed to create issue:", err);
      setError(err?.message || "Failed to create issue");
    } finally {
      setSubmittingIssue(false);
    }
  };

  const handleViewIssue = async (issue: IssueWithRepo) => {
    setSelectedIssue(issue);
    setViewDialogOpen(true);
    setComments([]);
    setNewComment("");

    // Load comments
    try {
      setLoadingComments(true);
      const [owner, repo] = issue.repository.fullName.split("/");
      const issueComments = await listGitHubIssueComments(
        owner,
        repo,
        issue.number
      );
      setComments(issueComments);
    } catch (err: any) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCloseIssue = async (issue: IssueWithRepo) => {
    try {
      const [owner, repo] = issue.repository.fullName.split("/");
      await closeGitHubIssue(owner, repo, issue.number);
      await loadIssues();
      if (selectedIssue?.id === issue.id) {
        const updated = { ...issue, state: "closed" as const };
        setSelectedIssue(updated);
      }
    } catch (err: any) {
      console.error("Failed to close issue:", err);
      setError(err?.message || "Failed to close issue");
    }
  };

  const handleReopenIssue = async (issue: IssueWithRepo) => {
    try {
      const [owner, repo] = issue.repository.fullName.split("/");
      await reopenGitHubIssue(owner, repo, issue.number);
      await loadIssues();
      if (selectedIssue?.id === issue.id) {
        const updated = { ...issue, state: "open" as const };
        setSelectedIssue(updated);
      }
    } catch (err: any) {
      console.error("Failed to reopen issue:", err);
      setError(err?.message || "Failed to reopen issue");
    }
  };

  const handleAddComment = async () => {
    if (!selectedIssue || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      setError(null);
      const [owner, repo] = selectedIssue.repository.fullName.split("/");
      const comment = await addGitHubIssueComment(
        owner,
        repo,
        selectedIssue.number,
        newComment
      );
      setComments([...comments, comment]);
      setNewComment("");
    } catch (err: any) {
      console.error("Failed to add comment:", err);
      setError(err?.message || "Failed to add comment");
    } finally {
      setSubmittingComment(false);
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
      <GitHubNotConnectedState description="Connect your GitHub account to view and manage issues" />
    );
  }

  if (projectRepos.length === 0) {
    return (
      <NoRepositoriesState
        isGitHubConnected={isGitHubConnected}
        description="Link a GitHub repository to view issues"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Issues</h3>
          <p className="text-sm text-muted-foreground">
            Manage issues across linked repositories
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Issue
            </Button>
          </DialogTrigger>
          <CreateIssueDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            project={project}
            onSuccess={loadIssues}
            error={error}
          />
        </Dialog>
      </div>

      {/* Filters */}
      <IssueFilters
        statusFilter={statusFilter}
        repoFilter={repoFilter}
        onStatusFilterChange={setStatusFilter}
        onRepoFilterChange={setRepoFilter}
        project={project}
      />

      {/* Issues List */}
      {loading ? (
        <LoadingState message="Loading issues..." />
      ) : error && !loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={loadIssues} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredIssues.length === 0 ? (
        <EmptyState
          icon={<AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />}
          title="No issues found"
          description={
            issues.length === 0
              ? "No issues in linked repositories"
              : "No issues match the current filters"
          }
        />
      ) : (
        <IssueList issues={filteredIssues} onIssueClick={handleViewIssue} />
      )}

      {/* View Issue Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIssue && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="flex items-center gap-2">
                      {selectedIssue.state === "open" ? (
                        <AlertCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      )}
                      {selectedIssue.title}
                    </DialogTitle>
                    <DialogDescription className="mt-2">
                      #{selectedIssue.number} in{" "}
                      {selectedIssue.repository.fullName}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedIssue.state === "open" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCloseIssue(selectedIssue)}
                      >
                        Close
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReopenIssue(selectedIssue)}
                      >
                        Reopen
                      </Button>
                    )}
                    {selectedIssue.html_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={selectedIssue.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View on GitHub
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {selectedIssue.labels.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedIssue.labels.map((label) => (
                      <Badge
                        key={label.id}
                        variant="secondary"
                        style={{
                          backgroundColor: `#${label.color}20`,
                          color: `#${label.color}`,
                          borderColor: `#${label.color}`,
                        }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {selectedIssue.body && (
                  <div>
                    <Label>Description</Label>
                    <div className="mt-2 p-4 bg-muted rounded-md whitespace-pre-wrap">
                      {selectedIssue.body}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <Label>Comments ({comments.length})</Label>
                  <div className="mt-2 space-y-4">
                    {loadingComments ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No comments yet
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-4 bg-muted rounded-md"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">
                              {comment.user.login}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap">
                            {comment.body}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-comment">Add Comment</Label>
                  <Textarea
                    id="new-comment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="mt-2"
                    rows={4}
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="mt-2"
                  >
                    {submittingComment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Comment
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
