import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/client/contexts/AuthContext";
import { getProject } from "@/client/api/projects";
import type { Project } from "@/shared/types";

interface ProjectContextType {
  project: Project | null;
  setProject: (project: Project) => void;
  loading: boolean;
  error: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: React.ReactNode;
  projectId: string;
}

export function ProjectProvider({ children, projectId }: ProjectProviderProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: project,
    isLoading: loading,
    error: queryError
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: isAuthenticated && !!projectId,
    retry: 1
  });

  const setProject = (updatedProject: Project) => {
    queryClient.setQueryData(["project", projectId], updatedProject);
  };

  const error = queryError
    ? (queryError as Error)?.message || "Failed to load project"
    : null;

  return (
    <ProjectContext.Provider
      value={{
        project: project || null,
        setProject,
        loading,
        error
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}
