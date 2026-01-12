import { AlertCircle } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface GitHubNotConnectedStateProps {
  description?: string;
}

export function GitHubNotConnectedState({
  description = "Connect your GitHub account to get started"
}: GitHubNotConnectedStateProps) {
  return (
    <EmptyState
      icon={<AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />}
      title="GitHub not connected"
      description={description}
    />
  );
}
