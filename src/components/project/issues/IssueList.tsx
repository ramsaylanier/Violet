import { IssueCard } from "./IssueCard";
import type { GitHubIssue } from "@/types";

type IssueWithRepo = GitHubIssue & {
  repository: { owner: string; name: string; fullName: string };
};

interface IssueListProps {
  issues: IssueWithRepo[];
  onIssueClick: (issue: IssueWithRepo) => void;
}

export function IssueList({ issues, onIssueClick }: IssueListProps) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {issues.map((issue) => (
        <IssueCard
          key={`${issue.repository.fullName}-${issue.number}`}
          issue={issue}
          onClick={() => onIssueClick(issue)}
        />
      ))}
    </div>
  );
}
