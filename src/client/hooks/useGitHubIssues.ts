import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { listGitHubIssuesAggregated } from "@/client/api/github";
import { getProjectRepositories } from "@/client/lib/utils";
import type { Project } from "@/shared/types";

/**
 * Hook to fetch GitHub issues for a project
 * @param project - The project to fetch issues for
 * @param enabled - Whether the query should run (defaults to true if GitHub is connected and project has repos)
 */
export function useGitHubIssues(project: Project, enabled?: boolean) {
  const { user } = useCurrentUser();
  const isGitHubConnected = !!user?.githubToken;
  const projectRepos = getProjectRepositories(project);

  return useQuery({
    queryKey: ["github-issues", project.id],
    queryFn: async () => {
      if (!user?.githubToken || projectRepos.length === 0) {
        return [];
      }
      const repos = projectRepos.map((r) => ({ owner: r.owner, name: r.name }));
      return await listGitHubIssuesAggregated(repos, "all");
    },
    enabled: enabled ?? (isGitHubConnected && projectRepos.length > 0),
    retry: 1
  });
}
