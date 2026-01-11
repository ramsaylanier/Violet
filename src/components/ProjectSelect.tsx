import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listProjects } from "@/api/projects";
import { useAuth } from "@/contexts/AuthContext";
import type { Project } from "@/types";
import { Plus } from "lucide-react";

const CREATE_NEW_VALUE = "__create_new__";

interface ProjectSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

export function ProjectSelect({
  value,
  onValueChange,
  placeholder = "Select a project...",
}: ProjectSelectProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const data = await listProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [isAuthenticated]);

  const handleValueChange = (newValue: string) => {
    if (newValue === CREATE_NEW_VALUE) {
      navigate({ to: "/projects/new" });
      // Reset select value by not calling onValueChange
      return;
    }
    onValueChange?.(newValue);
  };

  return (
    <Select
      value={value}
      onValueChange={handleValueChange}
      disabled={loading || !isAuthenticated}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={loading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {projects.length === 0 && !loading ? (
          <SelectItem value="no-projects" disabled>
            No projects found
          </SelectItem>
        ) : (
          <>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value={CREATE_NEW_VALUE}>
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Create new project...</span>
              </div>
            </SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
