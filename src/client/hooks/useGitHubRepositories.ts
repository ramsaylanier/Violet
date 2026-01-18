import { useQuery } from "@tanstack/react-query";
import { listGitHubRepositories } from "@/client/api/github";

/**
 * Hook to fetch GitHub repositories
 * @param enabled - Whether the query should run
 */
export function useGitHubRepositories(enabled: boolean = true) {
  return useQuery({
    queryKey: ["github-repositories"],
    queryFn: async () => {
      try {
        return await listGitHubRepositories();
      } catch (err: any) {
        console.error("Failed to load GitHub repositories:", err);
        return [];
      }
    },
    enabled,
    retry: 1
  });
}
