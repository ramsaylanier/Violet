import { useEffect, useState } from "react";
import {
  Calendar,
  Github,
  Flame,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project, GitHubIssue } from "@/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listGitHubIssuesAggregated } from "@/api/github";

interface ProjectOverviewProps {
  project: Project;
}

type IssueWithRepo = GitHubIssue & {
  repository: { owner: string; name: string; fullName: string };
};

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const [issues, setIssues] = useState<IssueWithRepo[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const { user } = useCurrentUser();

  const projectRepos = project.repositories || [];
  const projectGitHubProjects = project.githubProjects || [];
  const isGitHubConnected = !!user?.githubToken;

  useEffect(() => {
    if (isGitHubConnected && projectRepos.length > 0) {
      loadIssues();
    }
  }, [isGitHubConnected, projectRepos.length]);

  const loadIssues = async () => {
    if (!user?.githubToken || projectRepos.length === 0) return;

    try {
      setLoadingIssues(true);
      const repos = projectRepos.map((r) => ({ owner: r.owner, name: r.name }));
      const allIssues = await listGitHubIssuesAggregated(repos, "all");
      setIssues(allIssues);
    } catch (err: any) {
      console.error("Failed to load issues:", err);
    } finally {
      setLoadingIssues(false);
    }
  };

  const openIssues = issues.filter((i) => i.state === "open");
  const closedIssues = issues.filter((i) => i.state === "closed");
  const recentIssues = issues
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Project ID
              </div>
              <div className="text-sm font-mono mt-1">{project.id}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Created
              </div>
              <div className="text-sm mt-1">
                {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Last Updated
              </div>
              <div className="text-sm mt-1">
                {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {project.repositories && project.repositories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                GitHub Repositories ({project.repositories.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.repositories.map((repo, index) => (
                <div
                  key={repo.fullName}
                  className={index > 0 ? "pt-4 border-t" : ""}
                >
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
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {project.firebaseProjectId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5" />
                Firebase Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Project ID
                </div>
                <div className="text-sm font-mono mt-1">
                  {project.firebaseProjectId}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Issues Summary */}
      {isGitHubConnected && projectRepos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Issues Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingIssues ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{issues.length}</div>
                    <div className="text-sm text-muted-foreground">
                      Total Issues
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {openIssues.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Open</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-muted-foreground">
                      {closedIssues.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Closed</div>
                  </div>
                </div>

                {recentIssues.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Recent Issues
                    </div>
                    <div className="space-y-2">
                      {recentIssues.map((issue) => (
                        <div
                          key={`${issue.repository.fullName}-${issue.number}`}
                          className="flex items-center gap-2 p-2 bg-muted rounded-md"
                        >
                          {issue.state === "open" ? (
                            <AlertCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">
                              <a
                                href={issue.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                #{issue.number} {issue.title}
                              </a>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {issue.repository.fullName}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* GitHub Projects Summary */}
      {projectGitHubProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              GitHub Projects ({projectGitHubProjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectGitHubProjects.map((proj, index) => (
              <div
                key={proj.projectId}
                className={index > 0 ? "pt-4 border-t" : ""}
              >
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Project Name
                  </div>
                  <div className="text-sm mt-1">{proj.name}</div>
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
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
