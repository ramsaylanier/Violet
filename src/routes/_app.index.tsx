import { createFileRoute } from "@tanstack/react-router";
import { ChatInterface } from "@/components/ChatInterface";
import { ProjectList } from "@/components/ProjectList";

export const Route = createFileRoute("/_app/")({
  component: Index,
});

function Index() {
  return (
    <div className="space-y-8 px-4">
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
