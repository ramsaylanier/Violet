import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          {icon}
          <div>
            <h4 className="text-sm font-medium">{title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          {action && <div className="pt-2">{action}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
