import { useQuery } from "@tanstack/react-query";
import { listProjects } from "@/client/api/projects";

/**
 * Hook to fetch all projects
 * @param enabled - Whether the query should run
 */
export function useProjects(enabled: boolean = true) {
  return useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled
  });
}
