import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, ExternalLink, Flame, Settings } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/client/components/ui/dialog";
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
import { Label } from "@/client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/client/components/ui/select";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import type { Project, Deployment, Hosting } from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { useCloudflareAccountId } from "@/client/hooks/useCloudflareAccountId";
import { useCloudflarePagesProjects } from "@/client/hooks/useCloudflarePagesProjects";
import { createCloudflarePagesProject } from "@/client/api/cloudflare";
import { setupFirebaseHosting } from "@/client/api/firebase";
import { updateProject } from "@/client/api/projects";

interface ProjectHostingDialogProps {
  project: Project;
  deployment: Deployment;
  onUpdate: (updatedProject: Project) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectHostingDialog({
  project,
  deployment,
  onUpdate,
  open,
  onOpenChange
}: ProjectHostingDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [error, setError] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [hostingToRemove, setHostingToRemove] = useState<Hosting | null>(null);

  // Add hosting state
  const [selectedProvider, setSelectedProvider] = useState<
    "cloudflare-pages" | "firebase-hosting" | ""
  >("");
  const [selectedPagesProject, setSelectedPagesProject] = useState<string>("");
  const [newPagesProjectName, setNewPagesProjectName] = useState("");
  const [newPagesProjectBranch, setNewPagesProjectBranch] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);

  const deployments = project.deployments || [];
  const isCloudflareConnected = !!user?.cloudflareToken;
  const hasFirebaseProject = !!project.firebaseProjectId;
  const hasHosting = deployment.hosting && deployment.hosting.length > 0;

  // Query for Cloudflare account ID
  const { data: accountId, isLoading: isLoadingAccountId } =
    useCloudflareAccountId(
      open &&
        !hasHosting &&
        selectedProvider === "cloudflare-pages" &&
        isCloudflareConnected
    );

  // Query for Cloudflare Pages projects
  const { data: availablePagesProjects = [], isLoading: loadingPagesProjects } =
    useCloudflarePagesProjects(
      accountId,
      !!accountId &&
        open &&
        !hasHosting &&
        selectedProvider === "cloudflare-pages" &&
        isCloudflareConnected &&
        !isCreateMode
    );

  // Mutation for creating Cloudflare Pages project
  const createPagesProjectMutation = useMutation({
    mutationFn: async (data: {
      accountId?: string;
      name: string;
      production_branch?: string;
    }) => {
      return createCloudflarePagesProject(data);
    }
  });

  // Mutation for setting up Firebase Hosting
  const setupFirebaseHostingMutation = useMutation({
    mutationFn: async (data: { projectId: string; siteId?: string }) => {
      return setupFirebaseHosting(data);
    }
  });

  const addHostingMutation = useMutation({
    mutationFn: async (newHosting: Hosting) => {
      const updatedDeployments = deployments.map((d) =>
        d.id === deployment.id
          ? {
              ...d,
              hosting: [...(d.hosting || []), newHosting],
              updatedAt: new Date()
            }
          : d
      );
      return await updateProject(project.id, {
        deployments: updatedDeployments
      });
    },
    onSuccess: (updatedProject) => {
      onUpdate(updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      handleClose();
    },
    onError: (err: any) => {
      console.error("Failed to add hosting:", err);
      setError(err?.message || "Failed to add hosting");
    }
  });

  const removeHostingMutation = useMutation({
    mutationFn: async (hostingId: string) => {
      const updatedDeployments = deployments.map((d) =>
        d.id === deployment.id
          ? {
              ...d,
              hosting: d.hosting?.filter((h) => h.id !== hostingId) || [],
              updatedAt: new Date()
            }
          : d
      );
      return await updateProject(project.id, {
        deployments: updatedDeployments
      });
    },
    onSuccess: (updatedProject) => {
      onUpdate(updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setRemoveDialogOpen(false);
      setHostingToRemove(null);
    },
    onError: (err: any) => {
      console.error("Failed to remove hosting:", err);
      setError(err?.message || "Failed to remove hosting");
    }
  });

  const handleAddHosting = async () => {
    if (!selectedProvider) return;
    setError(null);

    if (selectedProvider === "cloudflare-pages") {
      if (selectedPagesProject) {
        // Link existing project
        const pagesProject = availablePagesProjects.find(
          (p) => p.name === selectedPagesProject
        );
        if (!pagesProject) {
          setError("Pages project not found");
          return;
        }

        // Check if already linked
        if (
          deployment.hosting?.some(
            (h) =>
              h.provider === "cloudflare-pages" && h.name === pagesProject.name
          )
        ) {
          setError("This hosting project is already linked to this deployment");
          return;
        }

        const newHosting: Hosting = {
          id: `cf-${pagesProject.name}`,
          provider: "cloudflare-pages",
          name: pagesProject.name,
          url: pagesProject.subdomain
            ? `https://${pagesProject.subdomain}.pages.dev`
            : undefined,
          status: pagesProject.latest_deployment?.latest_stage?.status,
          linkedAt: new Date()
        };
        addHostingMutation.mutate(newHosting);
      } else if (newPagesProjectName.trim()) {
        // Create new project
        createPagesProjectMutation.mutate(
          {
            accountId: accountId || undefined,
            name: newPagesProjectName.trim(),
            production_branch: newPagesProjectBranch.trim() || "main"
          },
          {
            onSuccess: (pagesProject) => {
              const newHosting: Hosting = {
                id: `cf-${pagesProject.name}`,
                provider: "cloudflare-pages",
                name: pagesProject.name,
                url: pagesProject.subdomain
                  ? `https://${pagesProject.subdomain}.pages.dev`
                  : undefined,
                status: "idle",
                linkedAt: new Date()
              };
              addHostingMutation.mutate(newHosting);
            },
            onError: (err: any) => {
              setError(err?.message || "Failed to create Pages project");
            }
          }
        );
      } else {
        setError("Please select or create a Pages project");
        return;
      }
    } else if (selectedProvider === "firebase-hosting") {
      if (!hasFirebaseProject) {
        setError("Firebase project must be linked first");
        return;
      }

      if (!project.firebaseProjectId) {
        setError("Firebase project ID is missing");
        return;
      }

      // Check if already linked
      const existingHosting = deployment.hosting?.find(
        (h) =>
          h.provider === "firebase-hosting" &&
          h.id === `fb-${project.firebaseProjectId}`
      );
      if (existingHosting) {
        setError("Firebase Hosting is already linked to this deployment");
        return;
      }

      // First, setup Firebase Hosting in Firebase
      const firebaseProjectId = project.firebaseProjectId;
      if (!firebaseProjectId) {
        setError("Firebase project ID is missing");
        return;
      }

      setupFirebaseHostingMutation.mutate(
        {
          projectId: firebaseProjectId
        },
        {
          onSuccess: () => {
            // After hosting is set up, add it to the deployment
            const newHosting: Hosting = {
              id: `fb-${firebaseProjectId}`,
              provider: "firebase-hosting",
              name: firebaseProjectId,
              url: `https://${firebaseProjectId}.web.app`,
              status: "active",
              linkedAt: new Date()
            };
            addHostingMutation.mutate(newHosting);
          },
          onError: (err: any) => {
            console.error("Failed to setup Firebase Hosting:", err);
            setError(
              err?.message ||
                "Failed to setup Firebase Hosting. Please try again."
            );
          }
        }
      );
    }
  };

  const handleRemoveClick = (hosting: Hosting) => {
    setHostingToRemove(hosting);
    setRemoveDialogOpen(true);
    setError(null);
  };

  const handleRemoveHosting = () => {
    if (!hostingToRemove) return;
    setError(null);
    removeHostingMutation.mutate(hostingToRemove.id);
  };

  const getManagementUrl = (hosting: Hosting): string | null => {
    if (hosting.provider === "cloudflare-pages" && accountId) {
      return `https://dash.cloudflare.com/${accountId}/pages`;
    }
    if (hosting.provider === "firebase-hosting" && project.firebaseProjectId) {
      return `https://console.firebase.google.com/project/${project.firebaseProjectId}/hosting`;
    }
    return null;
  };

  const handleClose = () => {
    setError(null);
    setSelectedProvider("");
    setSelectedPagesProject("");
    setNewPagesProjectName("");
    setNewPagesProjectBranch("");
    setIsCreateMode(false);
    onOpenChange(false);
  };

  const isLoading =
    isLoadingAccountId ||
    loadingPagesProjects ||
    createPagesProjectMutation.isPending ||
    setupFirebaseHostingMutation.isPending ||
    addHostingMutation.isPending ||
    removeHostingMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {hasHosting ? "Manage Hosting" : "Add Hosting"}
            </DialogTitle>
            <DialogDescription>
              {hasHosting
                ? "Manage hosting configurations for this deployment"
                : "Connect a hosting provider to deploy your project"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {hasHosting && (
              // Show existing hosting
              <div className="space-y-3">
                <Label>Existing Hosting Configurations</Label>
                {deployment.hosting!.map((hosting) => {
                  const managementUrl = getManagementUrl(hosting);
                  return (
                    <div
                      key={hosting.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Flame className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{hosting.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {hosting.provider === "firebase-hosting"
                                ? "Firebase"
                                : hosting.provider === "cloudflare-pages"
                                  ? "Cloudflare"
                                  : hosting.provider}
                            </Badge>
                            {hosting.status && (
                              <Badge
                                variant={
                                  hosting.status === "ACTIVE" ||
                                  hosting.status === "connected" ||
                                  hosting.status === "success"
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {hosting.status}
                              </Badge>
                            )}
                          </div>
                          {hosting.url && (
                            <a
                              href={hosting.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                              {hosting.url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {managementUrl && (
                          <a
                            href={managementUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Settings className="w-4 h-4" />
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveClick(hosting)}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasHosting && (
              <div className="pt-4 border-t">
                <Label className="text-base font-semibold">
                  Add More Hosting
                </Label>
              </div>
            )}

            <div>
              <Label htmlFor="provider-select">Hosting Provider</Label>
              <Select
                value={selectedProvider}
                onValueChange={(value) => {
                  setSelectedProvider(
                    value as "cloudflare-pages" | "firebase-hosting"
                  );
                  setError(null);
                  setIsCreateMode(false);
                }}
              >
                <SelectTrigger id="provider-select" className="mt-2">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloudflare-pages">
                    <div className="flex flex-col">
                      <span>Cloudflare Pages</span>
                      <span className="text-xs text-muted-foreground">
                        Static site hosting with serverless functions
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="firebase-hosting">
                    <div className="flex flex-col">
                      <span>Firebase Hosting</span>
                      <span className="text-xs text-muted-foreground">
                        Fast and secure web hosting
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedProvider === "cloudflare-pages" && (
              <div className="space-y-4">
                {!isCloudflareConnected ? (
                  <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
                    <p className="mb-2">
                      Cloudflare account required for Cloudflare Pages.
                    </p>
                    <a
                      href="/settings"
                      className="text-primary hover:underline"
                    >
                      Connect Cloudflare in settings
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Button
                        variant={!isCreateMode ? "default" : "outline"}
                        onClick={() => {
                          setIsCreateMode(false);
                          setNewPagesProjectName("");
                          setNewPagesProjectBranch("");
                          setError(null);
                        }}
                        className="flex-1"
                      >
                        Link Existing
                      </Button>
                      <Button
                        variant={isCreateMode ? "default" : "outline"}
                        onClick={() => {
                          setIsCreateMode(true);
                          setSelectedPagesProject("");
                          setError(null);
                        }}
                        className="flex-1"
                      >
                        Create New
                      </Button>
                    </div>

                    {!isCreateMode ? (
                      <div>
                        <Label>Cloudflare Pages Project</Label>
                        {loadingPagesProjects ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              Loading projects...
                            </span>
                          </div>
                        ) : availablePagesProjects.length === 0 ? (
                          <div className="text-sm text-muted-foreground mt-2">
                            No Pages projects found. Create a new one instead.
                          </div>
                        ) : (
                          <Select
                            value={selectedPagesProject}
                            onValueChange={setSelectedPagesProject}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {availablePagesProjects.map((proj) => (
                                <SelectItem key={proj.name} value={proj.name}>
                                  {proj.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="pages-project-name">
                            Project Name
                          </Label>
                          <Input
                            id="pages-project-name"
                            value={newPagesProjectName}
                            onChange={(e) =>
                              setNewPagesProjectName(e.target.value)
                            }
                            placeholder="my-project"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pages-project-branch">
                            Production Branch (optional)
                          </Label>
                          <Input
                            id="pages-project-branch"
                            value={newPagesProjectBranch}
                            onChange={(e) =>
                              setNewPagesProjectBranch(e.target.value)
                            }
                            placeholder="main"
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedProvider === "firebase-hosting" && (
              <div className="space-y-4">
                {!hasFirebaseProject ? (
                  <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
                    <p className="mb-2">
                      Firebase project must be linked first.
                    </p>
                    <p>
                      Go to the Integrations tab to link a Firebase project.
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
                    <p>
                      Firebase Hosting will be linked to your existing Firebase
                      project: <strong>{project.firebaseProjectId}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Close
            </Button>
            <Button
              onClick={handleAddHosting}
              disabled={
                isLoading ||
                !selectedProvider ||
                (selectedProvider === "cloudflare-pages" &&
                  !isCloudflareConnected) ||
                (selectedProvider === "firebase-hosting" &&
                  !hasFirebaseProject) ||
                (selectedProvider === "cloudflare-pages" &&
                  !selectedPagesProject &&
                  !newPagesProjectName.trim())
              }
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Hosting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Hosting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the hosting configuration{" "}
              <strong>{hostingToRemove?.name}</strong> from this deployment? The
              hosting project will remain in your{" "}
              {hostingToRemove?.provider === "cloudflare-pages"
                ? "Cloudflare"
                : "Firebase"}{" "}
              account and can be linked again later.
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
            <AlertDialogAction
              onClick={handleRemoveHosting}
              disabled={removeHostingMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeHostingMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
