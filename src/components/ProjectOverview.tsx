import { Calendar, Github, Flame, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Project } from "@/types";

interface ProjectOverviewProps {
  project: Project;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Project ID
              </div>
              <div className="text-sm font-mono mt-1">{project.id}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Created
              </div>
              <div className="text-sm mt-1">
                {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Last Updated
              </div>
              <div className="text-sm mt-1">
                {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {project.repositories && project.repositories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                GitHub Repositories ({project.repositories.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.repositories.map((repo, index) => (
                <div key={repo.fullName} className={index > 0 ? "pt-4 border-t" : ""}>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Repository
                    </div>
                    <div className="text-sm mt-1">
                      {repo.fullName}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Owner
                    </div>
                    <div className="text-sm mt-1">
                      {repo.owner}
                    </div>
                  </div>
                  <div>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      View on GitHub
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {project.firebaseProjectId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5" />
                Firebase Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Project ID
                </div>
                <div className="text-sm font-mono mt-1">
                  {project.firebaseProjectId}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
