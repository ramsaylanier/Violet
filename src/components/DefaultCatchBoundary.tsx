import { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DefaultCatchBoundary({ error, reset }: ErrorComponentProps) {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-destructive">
            Something went wrong
          </CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && error && (
            <div className="rounded-md bg-muted p-4">
              <pre className="text-xs overflow-auto">
                <code className="text-destructive">
                  {error instanceof Error ? error.message : String(error)}
                </code>
                {error instanceof Error && error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Stack trace
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-64">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </pre>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} variant="default">
              Reload Page
            </Button>
            {reset && (
              <Button onClick={reset} variant="outline">
                Try Again
              </Button>
            )}
            <Button
              onClick={() => (window.location.href = "/")}
              variant="ghost"
            >
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
