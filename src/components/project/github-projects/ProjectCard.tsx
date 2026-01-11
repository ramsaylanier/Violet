import { CheckSquare, Trash2, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink as ExternalLinkComponent } from "@/components/shared/ExternalLink";

interface LinkedProjectCardProps {
  project: {
    projectId: string;
    name: string;
    owner: string;
    url?: string;
  };
  onRemove: () => void;
  loading?: boolean;
}

interface UnlinkedProjectCardProps {
  project: {
    id: string;
    title: string;
    owner?: { login: string } | null;
    shortDescription?: string;
    url?: string;
  };
  onLink: () => void;
  loading?: boolean;
}

export function LinkedProjectCard({
  project,
  onRemove,
  loading = false,
}: LinkedProjectCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            {project.name}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Project ID
          </div>
          <div className="text-sm font-mono mt-1">{project.projectId}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Owner
          </div>
          <div className="text-sm mt-1">{project.owner}</div>
        </div>
        {project.url && (
          <div>
            <ExternalLinkComponent href={project.url}>
              View on GitHub
            </ExternalLinkComponent>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function UnlinkedProjectCard({
  project,
  onLink,
  loading = false,
}: UnlinkedProjectCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="w-4 h-4" />
            {project.title}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onLink}
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Link
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Owner
          </div>
          <div className="text-sm mt-1">
            {project.owner?.login || "Unknown"}
          </div>
        </div>
        {project.shortDescription && (
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Description
            </div>
            <div className="text-sm mt-1">{project.shortDescription}</div>
          </div>
        )}
        {project.url && (
          <div>
            <ExternalLinkComponent href={project.url}>
              View on GitHub
            </ExternalLinkComponent>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
