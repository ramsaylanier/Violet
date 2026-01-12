import { useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled: isAuthenticated
  });

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

  // Preserve current search params when linking to a project
  const currentSearch = location.search || {};

  return (
    <Combobox
      items={items}
      value={value || null}
      onValueChange={handleSelect}
      open={open}
      onOpenChange={setOpen}
      disabled={isLoading || !isAuthenticated}
    >
      <ComboboxInput
        placeholder={isLoading ? "Loading..." : placeholder}
        className="w-full"
        disabled={isLoading || !isAuthenticated}
      />
      <ComboboxContent>
        <ComboboxList>
          {projects.length === 0 && !isLoading ? (
            <ComboboxEmpty>No projects found</ComboboxEmpty>
          ) : (
            <>
              {projects.map((project) => (
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  search={currentSearch}
                  key={project.id}
                >
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
