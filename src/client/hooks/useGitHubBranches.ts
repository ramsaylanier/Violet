import { useQuery } from "@tanstack/react-query";
import { listGitHubBranches } from "@/client/api/github";

/**
 * Hook to fetch GitHub branches for a repository
 * @param owner - The repository owner
 * @param repo - The repository name
 * @param enabled - Whether the query should run (defaults to true if owner and repo are provided)
 */
export function useGitHubBranches(
  owner: string | undefined,
  repo: string | undefined,
  enabled?: boolean
) {
  return useQuery({
    queryKey: ["github-branches", owner, repo],
    queryFn: () => {
      if (!owner || !repo) {
        throw new Error("Owner and repo are required");
      }
      return listGitHubBranches(owner, repo);
    },
    enabled: enabled ?? !!(owner && repo)
  });
}
