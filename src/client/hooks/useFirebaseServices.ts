import { useQuery } from "@tanstack/react-query";
import { getFirebaseServicesStatus } from "@/client/api/firebase";

/**
 * Hook to fetch Firebase services status for a project
 * @param projectId - The Firebase project ID
 * @param enabled - Whether the query should run (defaults to true if projectId is provided)
 */
export function useFirebaseServices(
  projectId: string | undefined,
  enabled?: boolean
) {
  return useQuery({
    queryKey: ["firebase-services", projectId],
    queryFn: () => (projectId ? getFirebaseServicesStatus(projectId) : null),
    enabled: enabled ?? !!projectId,
    retry: 1
  });
}
