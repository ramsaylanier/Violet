import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useProjectContext } from "@/client/contexts/ProjectContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  ArrowLeft,
  Rocket,
  Github,
  Globe,
  Flame,
  ExternalLink,
  Play
} from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/client/components/ui/dialog";
import { DeployDialog } from "@/client/components/deployment/DeployDialog";

export const Route = createFileRoute(
  "/_app/projects/$projectId/deployments/$deploymentId"
)({
  component: DeploymentView
});

function DeploymentView() {
  const navigate = useNavigate();
  const { projectId, deploymentId } = Route.useParams();
  const { project, loading, error } = useProjectContext();
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted-foreground">
          Loading deployment...
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Link to="/projects/$projectId/deployments" params={{ projectId }}>
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deployments
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || "Project not found"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: "/projects" })}>
              Go to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deployment = project.deployments?.find((d) => d.id === deploymentId);

  if (!deployment) {
    return (
      <div className="space-y-6">
        <Link to="/projects/$projectId" params={{ projectId }}>
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Deployment Not Found</CardTitle>
            <CardDescription>
              The deployment you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                navigate({
                  to: "/projects/$projectId/deployments",
                  params: { projectId }
                })
              }
            >
              View All Deployments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/projects/$projectId/deployments" params={{ projectId }}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{deployment.name}</h1>
            {deployment.description && (
              <p className="text-muted-foreground mt-1">
                {deployment.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {deployment.repository && (
            <Button onClick={() => setDeployDialogOpen(true)}>
              <Play className="w-4 h-4 mr-2" />
              Deploy
            </Button>
          )}
          {deployment.repository && (
            <Badge variant="secondary" className="gap-1">
              <Github className="w-3 h-3" />
              {deployment.repository.fullName}
            </Badge>
          )}
          {deployment.domain && (
            <Badge variant="secondary" className="gap-1">
              <Globe className="w-3 h-3" />
              Domain
            </Badge>
          )}
          {deployment.hosting && deployment.hosting.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="w-3 h-3" />
              {deployment.hosting.length} hosting
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Repository Section */}
        {deployment.repository && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                Repository
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Full Name</div>
                <div className="font-medium">
                  {deployment.repository.fullName}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Owner</div>
                <div className="font-medium">{deployment.repository.owner}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{deployment.repository.name}</div>
              </div>
              <a
                href={deployment.repository.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View on GitHub
              </a>
            </CardContent>
          </Card>
        )}

        {/* Deployment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Deployment Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Created</div>
              <div className="font-medium">
                {new Date(deployment.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Last Updated</div>
              <div className="font-medium">
                {new Date(deployment.updatedAt).toLocaleDateString()}
              </div>
            </div>
            {deployment.domain && (
              <div>
                <div className="text-sm text-muted-foreground">Domain</div>
                <div className="font-medium">{deployment.domain.zoneName}</div>
              </div>
            )}
            {deployment.hosting && deployment.hosting.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">Hosting</div>
                <div className="font-medium">{deployment.hosting.length}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Domain Section */}
      {deployment.domain && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Domain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <div className="font-medium">{deployment.domain.zoneName}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {deployment.domain.provider}
                  {deployment.domain.status && ` • ${deployment.domain.status}`}
                </div>
              </div>
              {deployment.domain.zoneId && (
                <a
                  href={`https://dash.cloudflare.com/${deployment.domain.zoneId}/dns`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hosting Section */}
      {deployment.hosting && deployment.hosting.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5" />
              Hosting ({deployment.hosting.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deployment.hosting.map((hosting) => (
                <div
                  key={hosting.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <div className="font-medium">{hosting.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {hosting.provider.replace("-", " ")}
                      {hosting.status && ` • ${hosting.status}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hosting.url && (
                      <a
                        href={hosting.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty States */}
      {!deployment.repository &&
        !deployment.domain &&
        (!deployment.hosting || deployment.hosting.length === 0) && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Rocket className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <h4 className="text-sm font-medium">Empty Deployment</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    This deployment doesn't have a repository, domains, or
                    hosting configured yet.
                  </p>
                </div>
                <Link
                  to="/projects/$projectId/deployments"
                  params={{ projectId }}
                >
                  <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Deployments
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        {deployment && project && (
          <DeployDialog
            open={deployDialogOpen}
            onOpenChange={setDeployDialogOpen}
            projectId={projectId}
            deployment={deployment}
            project={project}
            onProjectUpdate={() => {
              // Refresh project context if available
              // The ProjectContext should handle this automatically
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
