import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Cloud,
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  Globe,
  Flame,
  Rocket,
  CheckCircle2,
  XCircle,
  Clock,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/client/components/ui/alert-dialog";
import { Badge } from "@/client/components/ui/badge";
import type { Project, CloudflarePagesDeployment } from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import {
  getCloudflareAccountId,
  listCloudflarePagesDeployments
} from "@/client/api/cloudflare";
import { updateProject } from "@/client/api/projects";
import { EmptyState } from "@/client/components/shared/EmptyState";
import { ProjectAddHostingDialog } from "./ProjectAddHostingDialog";
import { DeployToFirebaseDialog } from "./DeployToFirebaseDialog";
import { LinkCustomDomainDialog } from "./LinkCustomDomainDialog";

interface ProjectHostingProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectHosting({ project, onUpdate }: ProjectHostingProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [hostingToRemove, setHostingToRemove] = useState<{
    id: string;
    name: string;
    provider: string;
  } | null>(null);
  const [deployments, setDeployments] = useState<
    Record<
      string,
      { deployments: CloudflarePagesDeployment[]; loading: boolean }
    >
  >({});
  const [accountId, setAccountId] = useState<string | null>(null);
  const [addDomainDialogOpen, setAddDomainDialogOpen] = useState(false);
  const [selectedHostingForDomain, setSelectedHostingForDomain] = useState<{
    id: string;
    name: string;
    siteId: string;
  } | null>(null);
  const { user } = useCurrentUser();

  const projectHosting = project.hosting || [];

  // Load account ID for deployments
  useEffect(() => {
    const loadAccountId = async () => {
      if (user?.cloudflareToken && !accountId) {
        try {
          const { accountId: id } = await getCloudflareAccountId();
          setAccountId(id);
        } catch (err) {
          console.error("Failed to load account ID:", err);
        }
      }
    };
    loadAccountId();
  }, [user?.cloudflareToken, accountId]);

  const loadDeployments = async (hostingId: string, projectName: string) => {
    if (deployments[hostingId]?.loading || !accountId) return;

    try {
      setDeployments((prev) => ({
        ...prev,
        [hostingId]: {
          deployments: prev[hostingId]?.deployments || [],
          loading: true
        }
      }));

      const deploymentList = await listCloudflarePagesDeployments(projectName, {
        accountId
      });
      setDeployments((prev) => ({
        ...prev,
        [hostingId]: {
          deployments: deploymentList,
          loading: false
        }
      }));
    } catch (err: any) {
      console.error(`Failed to load deployments for ${projectName}:`, err);
      setDeployments((prev) => ({
        ...prev,
        [hostingId]: {
          deployments: prev[hostingId]?.deployments || [],
          loading: false
        }
      }));
    }
  };

  const handleRemoveClick = (hosting: {
    id: string;
    name: string;
    provider: string;
  }) => {
    setHostingToRemove(hosting);
    setRemoveDialogOpen(true);
    setError(null);
  };

  const handleRemoveHosting = async () => {
    if (!hostingToRemove) return;

    try {
      setLoading(true);
      setError(null);

      // If it's a Cloudflare Pages project, optionally delete it
      // For now, we'll just remove from project
      const updatedHosting = projectHosting.filter(
        (h) => h.id !== hostingToRemove.id
      );
      const updatedProject = await updateProject(project.id, {
        hosting: updatedHosting.length > 0 ? updatedHosting : []
      });

      onUpdate(updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setRemoveDialogOpen(false);
      setHostingToRemove(null);
    } catch (err: any) {
      console.error("Failed to remove hosting:", err);
      setError(err?.message || "Failed to remove hosting");
    } finally {
      setLoading(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "cloudflare-pages":
        return Cloud;
      case "firebase-hosting":
        return Flame;
      default:
        return Rocket;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig = {
      success: { variant: "default" as const, icon: CheckCircle2 },
      active: { variant: "default" as const, icon: CheckCircle2 },
      idle: { variant: "secondary" as const, icon: Clock },
      failure: { variant: "destructive" as const, icon: XCircle },
      canceled: { variant: "secondary" as const, icon: XCircle }
    };

    const config =
      statusConfig[status.toLowerCase() as keyof typeof statusConfig] ||
      statusConfig.idle;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Hosting</h3>
          <p className="text-sm text-muted-foreground">
            Manage hosting deployments for this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          {project.repositories && project.repositories.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setDeployDialogOpen(true)}
            >
              <Flame className="w-4 h-4 mr-2" />
              Deploy to Firebase
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Hosting
          </Button>
        </div>
        <ProjectAddHostingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          project={project}
          onSuccess={(updatedProject) => {
            onUpdate(updatedProject);
            setDialogOpen(false);
          }}
        />
        <DeployToFirebaseDialog
          open={deployDialogOpen}
          onOpenChange={setDeployDialogOpen}
          project={project}
          onSuccess={(updatedProject) => {
            onUpdate(updatedProject);
            setDeployDialogOpen(false);
          }}
        />
        {selectedHostingForDomain && (
          <LinkCustomDomainDialog
            open={addDomainDialogOpen}
            onOpenChange={setAddDomainDialogOpen}
            project={project}
            siteId={selectedHostingForDomain.siteId}
            hostingName={selectedHostingForDomain.name}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["projects"] });
              setAddDomainDialogOpen(false);
              setSelectedHostingForDomain(null);
            }}
          />
        )}
      </div>

      {projectHosting.length > 0 ? (
        <div className="space-y-4">
          {projectHosting.map((hosting) => {
            const ProviderIcon = getProviderIcon(hosting.provider);
            const hostingDeployments = deployments[hosting.id];

            return (
              <Card key={hosting.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <ProviderIcon className="w-5 h-5" />
                        {hosting.name}
                      </CardTitle>
                      {getStatusBadge(hosting.status)}
                      <Badge variant="outline" className="capitalize">
                        {hosting.provider.replace("-", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {hosting.url && (
                        <a
                          href={hosting.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Globe className="w-4 h-4" />
                          Visit
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {hosting.provider === "cloudflare-pages" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!hostingDeployments && accountId) {
                              loadDeployments(hosting.id, hosting.name);
                            }
                          }}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                      {hosting.provider === "firebase-hosting" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Use hosting.name as siteId (default Firebase sites use projectId as siteId)
                              setSelectedHostingForDomain({
                                id: hosting.id,
                                name: hosting.name,
                                siteId: hosting.name // Firebase default siteId is typically the projectId
                              });
                              setAddDomainDialogOpen(true);
                            }}
                          >
                            <Globe className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeployDialogOpen(true)}
                          >
                            <Flame className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveClick(hosting)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                      {(hosting.provider === "cloudflare-pages" ||
                        hosting.provider === "firebase-hosting") &&
                        hostingDeployments && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          Recent Deployments
                        </div>
                        {hostingDeployments.loading ? (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              Loading deployments...
                            </span>
                          </div>
                        ) : hostingDeployments.deployments.length === 0 ? (
                          <div className="text-sm text-muted-foreground py-2">
                            No deployments found
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {hostingDeployments.deployments
                              .slice(0, 5)
                              .map((deployment) => (
                                <div
                                  key={deployment.id}
                                  className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
                                >
                                  {getStatusBadge(
                                    deployment.latest_stage?.status
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate">
                                      {deployment.deployment_trigger?.metadata
                                        ?.commit_message ||
                                        deployment.environment}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(
                                        deployment.created_on
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                  <a
                                    href={deployment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Rocket className="w-12 h-12 mx-auto text-muted-foreground" />}
          title="No hosting configured"
          description="Add a hosting provider to deploy your project"
        />
      )}

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Hosting</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the hosting configuration from this project. The
              hosting project will remain in your provider account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveDialogOpen(false);
                setHostingToRemove(null);
                setError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveHosting} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
