import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project } from "@/types";

interface IssueFiltersProps {
  statusFilter: "all" | "open" | "closed";
  repoFilter: string;
  onStatusFilterChange: (value: "all" | "open" | "closed") => void;
  onRepoFilterChange: (value: string) => void;
  project: Project;
}

export function IssueFilters({
  statusFilter,
  repoFilter,
  onStatusFilterChange,
  onRepoFilterChange,
  project,
}: IssueFiltersProps) {
  const projectRepos = project.repositories || [];

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <Label htmlFor="status-filter">Status</Label>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger id="status-filter" className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor="repo-filter">Repository</Label>
        <Select value={repoFilter} onValueChange={onRepoFilterChange}>
          <SelectTrigger id="repo-filter" className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Repositories</SelectItem>
            {projectRepos.map((repo) => (
              <SelectItem key={repo.fullName} value={repo.fullName}>
                {repo.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
