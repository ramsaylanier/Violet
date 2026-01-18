import { useQuery } from "@tanstack/react-query";
import { listGitHubWorkflowDefinitions } from "@/client/api/github";

/**
 * Hook to fetch GitHub workflows for a repository
 * @param owner - The repository owner
 * @param repo - The repository name
 * @param enabled - Whether the query should run (defaults to true if owner and repo are provided)
 */
export function useGitHubWorkflows(
  owner: string | undefined,
  repo: string | undefined,
  enabled?: boolean
) {
  return useQuery({
    queryKey: ["github-workflows", owner, repo],
    queryFn: () => {
      if (!owner || !repo) {
        throw new Error("Owner and repo are required");
      }
      return listGitHubWorkflowDefinitions(owner, repo);
    },
    enabled: enabled ?? !!(owner && repo)
  });
}
