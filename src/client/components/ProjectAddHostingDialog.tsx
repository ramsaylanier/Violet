import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/client/components/ui/select";
import type {
  Project,
  HostingProvider
} from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import {
  getCloudflareAccountId,
  listCloudflarePagesProjects,
  createCloudflarePagesProject
} from "@/client/api/cloudflare";
import { updateProject } from "@/client/api/projects";

interface ProjectAddHostingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSuccess: (updatedProject: Project) => void;
}

const HOSTING_PROVIDERS: HostingProvider[] = [
  {
    id: "cloudflare-pages",
    name: "Cloudflare Pages",
    description: "Static site hosting with serverless functions"
  },
  {
    id: "firebase-hosting",
    name: "Firebase Hosting",
    description: "Fast and secure web hosting"
  }
];

export function ProjectAddHostingDialog({
  open,
  onOpenChange,
  project,
  onSuccess
}: ProjectAddHostingDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<
    "cloudflare-pages" | "firebase-hosting" | ""
  >("");
  const [selectedPagesProject, setSelectedPagesProject] = useState<string>("");
  const [newPagesProjectName, setNewPagesProjectName] = useState("");
  const [newPagesProjectBranch, setNewPagesProjectBranch] = useState("");
  const { user } = useCurrentUser();

  const projectHosting = project.hosting || [];
  const isCloudflareConnected = !!user?.cloudflareToken;
  const hasFirebaseProject = !!project.firebaseProjectId;

  // Query for Cloudflare account ID
  const {
    data: accountId,
    isLoading: isLoadingAccountId
  } = useQuery({
    queryKey: ["cloudflare-account-id"],
    queryFn: async () => {
      const { accountId: id } = await getCloudflareAccountId();
      return id;
    },
    enabled: open && selectedProvider === "cloudflare-pages" && isCloudflareConnected
  });

  // Query for Cloudflare Pages projects
  const {
    data: availablePagesProjects = [],
    isLoading: loadingPagesProjects
  } = useQuery({
    queryKey: ["cloudflare-pages-projects", accountId],
    queryFn: async () => {
      if (!accountId) throw new Error("Account ID required");
      return listCloudflarePagesProjects(accountId);
    },
    enabled: !!accountId && open && selectedProvider === "cloudflare-pages" && isCloudflareConnected
  });

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

  // Mutation for updating project with hosting
  const updateProjectMutation = useMutation({
    mutationFn: async (hosting: Array<{
      id: string;
      provider: "cloudflare-pages" | "firebase-hosting";
      name: string;
      url?: string;
      status?: string;
      linkedAt: Date;
    }>) => {
      return updateProject(project.id, { hosting });
    },
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onSuccess(updatedProject);
      handleClose();
    },
    onError: (err: any) => {
      console.error("Failed to add hosting:", err);
      setError(err?.message || "Failed to add hosting");
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
          projectHosting.some(
            (h) =>
              h.provider === "cloudflare-pages" &&
              h.name === pagesProject.name
          )
        ) {
          setError("This hosting project is already linked");
          return;
        }

        const newHosting = {
          id: `cf-${pagesProject.name}`,
          provider: "cloudflare-pages" as const,
          name: pagesProject.name,
          url: pagesProject.subdomain
            ? `https://${pagesProject.subdomain}.pages.dev`
            : undefined,
          status: pagesProject.latest_deployment?.latest_stage?.status,
          linkedAt: new Date()
        };

        const updatedHosting = [...projectHosting, newHosting];
        updateProjectMutation.mutate(updatedHosting);
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
              const newHosting = {
                id: `cf-${pagesProject.name}`,
                provider: "cloudflare-pages" as const,
                name: pagesProject.name,
                url: pagesProject.subdomain
                  ? `https://${pagesProject.subdomain}.pages.dev`
                  : undefined,
                status: "idle",
                linkedAt: new Date()
              };

              const updatedHosting = [...projectHosting, newHosting];
              updateProjectMutation.mutate(updatedHosting);
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

      // For Firebase, we'll use the existing firebaseProjectId
      // In a real implementation, you'd check if hosting is enabled
      if (!project.firebaseProjectId) {
        setError("Firebase project ID is missing");
        return;
      }

      const newHosting = {
        id: `fb-${project.firebaseProjectId}`,
        provider: "firebase-hosting" as const,
        name: project.firebaseProjectId,
        url: `https://${project.firebaseProjectId}.web.app`,
        status: "active",
        linkedAt: new Date()
      };

      // Check if already linked
      if (
        projectHosting.some(
          (h) => h.provider === "firebase-hosting" && h.id === newHosting.id
        )
      ) {
        setError("Firebase Hosting is already linked");
        return;
      }

      const updatedHosting = [...projectHosting, newHosting];
      updateProjectMutation.mutate(updatedHosting);
    }
  };

  const handleClose = () => {
    setError(null);
    setSelectedProvider("");
    setSelectedPagesProject("");
    setNewPagesProjectName("");
    setNewPagesProjectBranch("");
    onOpenChange(false);
  };

  const isLoading =
    isLoadingAccountId ||
    loadingPagesProjects ||
    createPagesProjectMutation.isPending ||
    updateProjectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Hosting</DialogTitle>
          <DialogDescription>
            Connect a hosting provider to deploy your project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="provider-select">Hosting Provider</Label>
            <Select
              value={selectedProvider}
              onValueChange={(value) => {
                setSelectedProvider(
                  value as "cloudflare-pages" | "firebase-hosting"
                );
                setError(null);
              }}
            >
              <SelectTrigger id="provider-select" className="mt-2">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {HOSTING_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex flex-col">
                      <span>{provider.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {provider.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
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
                      variant={selectedPagesProject ? "default" : "outline"}
                      onClick={() => {
                        setSelectedPagesProject("");
                        setNewPagesProjectName("");
                        setNewPagesProjectBranch("");
                        setError(null);
                      }}
                      className="flex-1"
                    >
                      Link Existing
                    </Button>
                    <Button
                      variant={newPagesProjectName ? "default" : "outline"}
                      onClick={() => {
                        setSelectedPagesProject("");
                        setNewPagesProjectName("");
                        setNewPagesProjectBranch("");
                        setError(null);
                      }}
                      className="flex-1"
                    >
                      Create New
                    </Button>
                  </div>

                  {selectedPagesProject ? (
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
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
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
  );
}
