import { useQuery } from "@tanstack/react-query";
import { listGitHubWorkflowRuns } from "@/client/api/github";

/**
 * Hook to fetch GitHub workflow runs for a specific workflow
 * @param owner - The repository owner
 * @param repo - The repository name
 * @param workflowId - The workflow ID
 * @param enabled - Whether the query should run (defaults to true if owner, repo, and workflowId are provided)
 * @param perPage - Number of runs to fetch per page (default: 5)
 */
export function useGitHubWorkflowRuns(
  owner: string | undefined,
  repo: string | undefined,
  workflowId: number | undefined,
  enabled?: boolean,
  perPage: number = 5
) {
  return useQuery({
    queryKey: ["github-workflow-runs", owner, repo, workflowId],
    queryFn: () => {
      if (!owner || !repo || workflowId === undefined) {
        throw new Error("Owner, repo, and workflowId are required");
      }
      return listGitHubWorkflowRuns(owner, repo, {
        workflowId: workflowId.toString(),
        per_page: perPage
      });
    },
    enabled: enabled ?? !!(owner && repo && workflowId !== undefined),
    refetchInterval: (query) => {
      // Poll for in-progress runs
      const runs = query.state.data || [];
      const hasInProgress = runs.some(
        (run) => run.status === "queued" || run.status === "in_progress"
      );
      return hasInProgress ? 5000 : false;
    }
  });
}
