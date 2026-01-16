import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { listGitHubProjectsForRepository } from "@/client/api/github";
import type { Project, GitHubProject } from "@/shared/types";
import { getProjectRepositories } from "@/client/lib/utils";

interface UseGetGithubProjectsResult {
  availableRepositoryProjects: GitHubProject[];
  isLoadingRepositoryProjects: boolean;
  isGitHubConnected: boolean;
}

/**
 * Hook to get GitHub projects for a project.
 * Returns linked projects and optionally fetches available projects from repositories.
 */
export function useGetGithubProjects(
  project: Project
): UseGetGithubProjectsResult {
  const { user, loadingUser } = useCurrentUser();
  const isGitHubConnected = !!user?.githubToken;

  const projectRepos = getProjectRepositories(project);

  // Fetch projects for all repositories using TanStack Query
  const {
    data: repositoryProjectsData = [],
    isLoading: loadingRepositoryProjects
  } = useQuery({
    queryKey: [
      "github-repository-projects",
      projectRepos
        .map((r) => r.fullName)
        .sort()
        .join(",")
    ],
    queryFn: async () => {
      if (!isGitHubConnected || projectRepos.length === 0) {
        return [];
      }

      const allProjects: GitHubProject[] = [];

      // Fetch projects for each repository in parallel
      const promises = projectRepos.map(async (repo) => {
        try {
          const [owner, name] = repo.fullName.split("/");
          if (!owner || !name) return [];
          const projects = await listGitHubProjectsForRepository(owner, name);
          return projects;
        } catch (err: any) {
          console.error(`Failed to load projects for ${repo.fullName}:`, err);
          return [];
        }
      });

      const results = await Promise.all(promises);
      allProjects.push(...results.flat());

      // Remove duplicates by ID, filter out already linked projects, and only include open projects
      const uniqueProjects = Array.from(
        new Map(allProjects.map((p) => [p.id, p])).values()
      );

      return uniqueProjects;
    },
    enabled: isGitHubConnected && projectRepos.length > 0 && !loadingUser,
    retry: 1
  });

  return {
    availableRepositoryProjects: repositoryProjectsData,
    isLoadingRepositoryProjects: loadingRepositoryProjects,
    isGitHubConnected: isGitHubConnected && !loadingUser
  };
}
