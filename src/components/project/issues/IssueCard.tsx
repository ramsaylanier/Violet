import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GitHubIssue } from "@/types";

interface IssueCardProps {
  issue: GitHubIssue & {
    repository: { owner: string; name: string; fullName: string };
  };
  onClick: () => void;
}

export function IssueCard({ issue, onClick }: IssueCardProps) {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {issue.state === "open" ? (
                <AlertCircle className="w-4 h-4 text-green-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              )}
              {issue.title}
            </CardTitle>
            <CardDescription className="mt-2 flex items-center gap-2">
              <span>#{issue.number}</span>
              <span>•</span>
              <span>{issue.repository.fullName}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap">
          {issue.labels.map((label) => (
            <Badge
              key={label.id}
              variant="secondary"
              style={{
                backgroundColor: `#${label.color}20`,
                color: `#${label.color}`,
                borderColor: `#${label.color}`,
              }}
            >
              {label.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
