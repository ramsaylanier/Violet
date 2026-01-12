import { CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ExternalLink as ExternalLinkComponent } from "@/components/shared/ExternalLink";
import { GitHubProject } from "@/types";

interface GithubProjectCardProps {
  project: GitHubProject;
  loading?: boolean;
}

export function GithubProjectCard({ project }: GithubProjectCardProps) {
  console.log({ project });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="w-4 h-4" />
            {project.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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
