import { useQuery } from "@tanstack/react-query";
import { listCloudflarePagesProjects } from "@/client/api/cloudflare";

/**
 * Hook to fetch Cloudflare Pages projects
 * @param accountId - The Cloudflare account ID (required for query)
 * @param enabled - Whether the query should run (defaults to true if accountId is provided)
 */
export function useCloudflarePagesProjects(
  accountId: string | undefined,
  enabled?: boolean
) {
  return useQuery({
    queryKey: ["cloudflare-pages-projects", accountId],
    queryFn: async () => {
      if (!accountId) throw new Error("Account ID required");
      return listCloudflarePagesProjects(accountId);
    },
    enabled: enabled ?? !!accountId
  });
}
