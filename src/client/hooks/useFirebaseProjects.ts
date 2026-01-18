import { useQuery } from "@tanstack/react-query";
import { listFirebaseProjects } from "@/client/api/firebase";

/**
 * Hook to fetch Firebase projects
 * @param enabled - Whether the query should run
 * @param throwOnAuthError - If true, throws errors on auth issues; if false, returns empty array
 */
export function useFirebaseProjects(
  enabled: boolean = true,
  throwOnAuthError: boolean = false
) {
  return useQuery({
    queryKey: ["firebase-projects"],
    queryFn: async () => {
      try {
        return await listFirebaseProjects();
      } catch (err: any) {
        if (
          err?.message?.includes("Google account not connected") ||
          err?.message?.includes("needsAuth")
        ) {
          if (throwOnAuthError) {
            throw new Error("needsAuth");
          }
          return [];
        }
        throw err;
      }
    },
    enabled,
    retry: 1
  });
}
