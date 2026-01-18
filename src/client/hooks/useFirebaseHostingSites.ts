import { useQuery } from "@tanstack/react-query";
import { listFirebaseHostingSites } from "@/client/api/firebase";

/**
 * Hook to fetch Firebase hosting sites for a project
 * @param projectId - The Firebase project ID
 * @param enabled - Whether the query should run (defaults to true if projectId is provided)
 */
export function useFirebaseHostingSites(
  projectId: string | undefined,
  enabled?: boolean
) {
  return useQuery({
    queryKey: ["firebase-hosting-sites", projectId],
    queryFn: async () => {
      if (!projectId) {
        return [];
      }
      return listFirebaseHostingSites(projectId);
    },
    enabled: enabled ?? !!projectId
  });
}
