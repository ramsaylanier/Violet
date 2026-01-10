import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/LoginForm";
import { ChatInterface } from "@/components/ChatInterface";
import { ProjectList } from "@/components/ProjectList";

export const Route = createFileRoute("/_layout")({
  component: Index,
});

function Index() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Violet</h1>
        <p className="text-xl text-muted-foreground">
          Your development project management platform
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Projects</h2>
          <ProjectList />
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">AI Assistant</h2>
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
