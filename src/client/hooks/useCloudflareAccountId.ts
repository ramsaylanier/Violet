import { useQuery } from "@tanstack/react-query";
import { getCloudflareAccountId } from "@/client/api/cloudflare";

/**
 * Hook to fetch Cloudflare account ID
 * @param enabled - Whether the query should run
 */
export function useCloudflareAccountId(enabled: boolean = true) {
  return useQuery({
    queryKey: ["cloudflare-account-id"],
    queryFn: async () => {
      const { accountId } = await getCloudflareAccountId();
      return accountId;
    },
    enabled
  });
}
