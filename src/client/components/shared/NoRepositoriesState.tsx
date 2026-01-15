import { Github, Plus } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { EmptyState } from "./EmptyState";

interface NoRepositoriesStateProps {
  isGitHubConnected: boolean;
  onAddRepository?: () => void;
  description?: string;
}

export function NoRepositoriesState({
  isGitHubConnected,
  onAddRepository,
  description = "Link or create a GitHub repository to get started"
}: NoRepositoriesStateProps) {
  const action = isGitHubConnected ? (
    <Button onClick={onAddRepository}>
      <Plus className="w-4 h-4 mr-2" />
      Add Repository
    </Button>
  ) : null;

  return (
    <EmptyState
      icon={<Github className="w-12 h-12 mx-auto text-muted-foreground" />}
      title="No repositories linked"
      description={description}
      action={action}
    />
  );
}
