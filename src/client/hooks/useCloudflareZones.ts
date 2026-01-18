import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { listCloudflareZones } from "@/client/api/cloudflare";

/**
 * Hook to fetch Cloudflare zones
 * @param enabled - Whether the query should run (defaults to true if Cloudflare is connected)
 */
export function useCloudflareZones(enabled?: boolean) {
  const { user } = useCurrentUser();
  const isCloudflareConnected = !!user?.cloudflareToken;

  return useQuery({
    queryKey: ["cloudflare-zones"],
    queryFn: async () => {
      if (!isCloudflareConnected) {
        return [];
      }
      return listCloudflareZones();
    },
    enabled: enabled ?? isCloudflareConnected
  });
}
