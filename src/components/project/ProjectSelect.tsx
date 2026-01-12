import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxSeparator
} from "@/components/ui/combobox";
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
  placeholder = "Select a project..."
}: ProjectSelectProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

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

  const handleSelect = (selectedValue: string | null) => {
    if (!selectedValue) return;

    if (selectedValue === CREATE_NEW_VALUE) {
      navigate({ to: "/projects/new" });
      setOpen(false);
      return;
    }
    onValueChange?.(selectedValue);
    setOpen(false);
  };

  // Create items array for Combobox (Base UI will handle filtering automatically)
  const items = projects.map((p) => p.id);

  return (
    <Combobox
      items={items}
      value={value || null}
      onValueChange={handleSelect}
      open={open}
      onOpenChange={setOpen}
      disabled={loading || !isAuthenticated}
    >
      <ComboboxInput
        placeholder={loading ? "Loading..." : placeholder}
        className="w-full"
        disabled={loading || !isAuthenticated}
      />
      <ComboboxContent>
        <ComboboxList>
          {projects.length === 0 && !loading ? (
            <ComboboxEmpty>No projects found</ComboboxEmpty>
          ) : (
            <>
              {projects.map((project) => (
                <Link to={`/projects/${project.id}`} key={project.id}>
                  <ComboboxItem value={project.id}>{project.name}</ComboboxItem>
                </Link>
              ))}
              <ComboboxSeparator />
              <ComboboxItem
                value={CREATE_NEW_VALUE}
                onSelect={() => handleSelect(CREATE_NEW_VALUE)}
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Create new project...</span>
                </div>
              </ComboboxItem>
            </>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
