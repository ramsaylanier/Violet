import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Project } from "@/types";

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Project Settings</CardTitle>
          <CardDescription>
            Manage your project settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium">Auto Sync</div>
            <div className="text-sm text-muted-foreground mt-1">
              {project.settings.autoSync ? "Enabled" : "Disabled"}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Notifications</div>
            <div className="text-sm text-muted-foreground mt-1">
              {project.settings.notifications ? "Enabled" : "Disabled"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
