import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Check,
  ChevronsUpDown,
  Github,
  Flame,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Label } from "@/client/components/ui/label";
import { Input } from "@/client/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/client/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/client/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/client/components/ui/select";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Progress } from "@/client/components/ui/progress";
import { Badge } from "@/client/components/ui/badge";
import type { Deployment, Hosting, Project } from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { useGitHubBranches } from "@/client/hooks/useGitHubBranches";
import { useCloudflareAccountId } from "@/client/hooks/useCloudflareAccountId";
import { useCloudflarePagesProjects } from "@/client/hooks/useCloudflarePagesProjects";
import { useFirebaseHostingSites } from "@/client/hooks/useFirebaseHostingSites";
import { deployDeployment } from "@/client/api/deployments";
import { updateProject } from "@/client/api/projects";
import { createCloudflarePagesProject } from "@/client/api/cloudflare";

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  deployment: Deployment;
  project: Project;
  onProjectUpdate?: (updatedProject: Project) => void;
}

type Step = "branch" | "add-hosting" | "providers" | "review" | "progress";

export function DeployDialog({
  open,
  onOpenChange,
  projectId,
  deployment,
  project,
  onProjectUpdate
}: DeployDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [step, setStep] = useState<Step>("branch");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(
    new Set()
  );
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<Awaited<
    ReturnType<typeof deployDeployment>
  > | null>(null);

  // Hosting creation state
  const [selectedHostingProvider, setSelectedHostingProvider] = useState<
    "cloudflare-pages" | "firebase-hosting" | ""
  >("");
  const [selectedPagesProject, setSelectedPagesProject] = useState<string>("");
  const [newPagesProjectName, setNewPagesProjectName] = useState("");
  const [newPagesProjectBranch, setNewPagesProjectBranch] = useState("main");
  const [selectedFirebaseSite, setSelectedFirebaseSite] = useState<string>("");
  const [newFirebaseSiteId, setNewFirebaseSiteId] = useState("");

  // Get the current deployment from project (may be updated after adding hosting)
  const currentDeployment =
    project.deployments?.find((d) => d.id === deployment.id) || deployment;

  const hasRepository = !!currentDeployment.repository;
  const availableHosting = currentDeployment.hosting || [];
  const needsHosting = availableHosting.length === 0;
  const repoOwner = currentDeployment.repository?.owner || "";
  const repoName = currentDeployment.repository?.name || "";
  const isCloudflareConnected = !!user?.cloudflareToken;
  const hasFirebaseProject = !!project.firebaseProjectId;

  // Ensure we're on the right step based on hosting availability
  useEffect(() => {
    if (open && step === "providers" && needsHosting) {
      // If we're on providers step but no hosting exists, go to add-hosting
      setStep("add-hosting");
    }
  }, [open, step, needsHosting, currentDeployment.hosting]);

  // Fetch branches
  const { data: branches = [], isLoading: loadingBranches } = useGitHubBranches(
    repoOwner,
    repoName,
    open &&
      hasRepository &&
      !!user?.githubToken &&
      step === "branch" &&
      !!repoOwner &&
      !!repoName
  );

  // Fetch Cloudflare account ID
  const { data: accountId, isLoading: isLoadingAccountId } =
    useCloudflareAccountId(
      open &&
        (step === "add-hosting" || step === "providers") &&
        selectedHostingProvider === "cloudflare-pages" &&
        isCloudflareConnected
    );

  // Fetch Cloudflare Pages projects
  const { data: availablePagesProjects = [], isLoading: loadingPagesProjects } =
    useCloudflarePagesProjects(
      accountId,
      !!accountId &&
        open &&
        (step === "add-hosting" || step === "providers") &&
        selectedHostingProvider === "cloudflare-pages" &&
        isCloudflareConnected
    );

  // Fetch Firebase hosting sites
  const { data: firebaseSites = [], isLoading: loadingFirebaseSites } =
    useFirebaseHostingSites(
      project.firebaseProjectId || undefined,
      !!project.firebaseProjectId &&
        open &&
        (step === "add-hosting" || step === "providers") &&
        selectedHostingProvider === "firebase-hosting" &&
        hasFirebaseProject
    );

  // Create Cloudflare Pages project mutation
  const createPagesProjectMutation = useMutation({
    mutationFn: async (data: {
      accountId?: string;
      name: string;
      production_branch?: string;
    }) => {
      return createCloudflarePagesProject(data);
    }
  });

  // Update project mutation (for adding hosting)
  const updateProjectMutation = useMutation({
    mutationFn: async (updatedDeployments: typeof project.deployments) => {
      return updateProject(project.id, { deployments: updatedDeployments });
    },
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject);
      }
      // Refresh deployment data by updating the deployment in the list
      const updatedDeployment = updatedProject.deployments?.find(
        (d) => d.id === deployment.id
      );
      if (updatedDeployment) {
        // Update local state to reflect new hosting
        setError(null);
        // Move to providers step
        setStep("providers");
      }
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to add hosting");
    }
  });

  // Set default branch
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      const defaultBranch =
        branches.find((b: any) => b.name === "main") ||
        branches.find((b: any) => b.name === "master") ||
        branches[0];
      if (defaultBranch) {
        setSelectedBranch(defaultBranch.name);
      }
    }
  }, [branches, selectedBranch]);

  // Deployment mutation
  const deployMutation = useMutation({
    mutationFn: (options: { branch: string; hostingProviderIds: string[] }) =>
      deployDeployment(projectId, deployment.id, options),
    onSuccess: (status) => {
      setDeploymentStatus(status);
      setStep("progress");
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to start deployment");
      setStep("review");
    }
  });

  // Poll deployment status
  useEffect(() => {
    if (step === "progress" && deploymentStatus && !deploymentStatus.error) {
      if (
        deploymentStatus.step === "success" ||
        deploymentStatus.step === "error"
      ) {
        return; // Stop polling when done
      }

      const interval = setInterval(async () => {
        try {
          // For now, we'll just check the initial status
          // In a real implementation, you'd poll a status endpoint
          // This is a placeholder - the actual status would come from the server
        } catch (err) {
          console.error("Error polling deployment status:", err);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [step, deploymentStatus]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("branch");
      setSelectedBranch("");
      setSelectedProviders(new Set());
      setComboboxOpen(false);
      setError(null);
      setDeploymentStatus(null);
      setSelectedHostingProvider("");
      setSelectedPagesProject("");
      setNewPagesProjectName("");
      setNewPagesProjectBranch("main");
      setSelectedFirebaseSite("");
      setNewFirebaseSiteId("");
    }
  }, [open]);

  const handleAddHosting = async () => {
    if (!selectedHostingProvider) {
      setError("Please select a hosting provider");
      return;
    }

    setError(null);

    const deployments = project.deployments || [];
    const selectedDeployment = deployments.find((d) => d.id === deployment.id);
    if (!selectedDeployment) {
      setError("Deployment not found");
      return;
    }

    if (selectedHostingProvider === "cloudflare-pages") {
      if (selectedPagesProject) {
        // Link existing project
        const pagesProject = availablePagesProjects.find(
          (p) => p.name === selectedPagesProject
        );
        if (!pagesProject) {
          setError("Pages project not found");
          return;
        }

        if (
          selectedDeployment.hosting?.some(
            (h) =>
              h.provider === "cloudflare-pages" && h.name === pagesProject.name
          )
        ) {
          setError("This hosting project is already linked");
          return;
        }

        const newHosting: Hosting = {
          id: `cf-${pagesProject.name}-${Date.now()}`,
          provider: "cloudflare-pages",
          name: pagesProject.name,
          url: pagesProject.subdomain
            ? `https://${pagesProject.subdomain}.pages.dev`
            : undefined,
          status: pagesProject.latest_deployment?.latest_stage?.status,
          linkedAt: new Date()
        };

        const updatedDeployments = deployments.map((d) =>
          d.id === deployment.id
            ? {
                ...d,
                hosting: [...(d.hosting || []), newHosting],
                updatedAt: new Date()
              }
            : d
        );
        updateProjectMutation.mutate(updatedDeployments);
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
                id: `cf-${pagesProject.name}-${Date.now()}`,
                provider: "cloudflare-pages",
                name: pagesProject.name,
                url: pagesProject.subdomain
                  ? `https://${pagesProject.subdomain}.pages.dev`
                  : undefined,
                status: "idle",
                linkedAt: new Date()
              };

              const updatedDeployments = deployments.map((d) =>
                d.id === deployment.id
                  ? {
                      ...d,
                      hosting: [...(d.hosting || []), newHosting],
                      updatedAt: new Date()
                    }
                  : d
              );
              updateProjectMutation.mutate(updatedDeployments);
            },
            onError: (err: any) => {
              setError(err?.message || "Failed to create Pages project");
            }
          }
        );
      } else {
        setError("Please select or create a Pages project");
      }
    } else if (selectedHostingProvider === "firebase-hosting") {
      if (!hasFirebaseProject) {
        setError("Firebase project must be linked first");
        return;
      }

      const siteId = selectedFirebaseSite || newFirebaseSiteId.trim();
      if (!siteId) {
        setError("Please select or enter a Firebase site ID");
        return;
      }

      // Check if already linked
      if (
        selectedDeployment.hosting?.some(
          (h) => h.provider === "firebase-hosting" && h.name === siteId
        )
      ) {
        setError("Firebase Hosting is already linked to this deployment");
        return;
      }

      const newHosting: Hosting = {
        id: `fb-${siteId}-${Date.now()}`,
        provider: "firebase-hosting",
        name: siteId,
        url: `https://${siteId}.web.app`,
        status: "active",
        linkedAt: new Date()
      };

      const updatedDeployments = deployments.map((d) =>
        d.id === deployment.id
          ? {
              ...d,
              hosting: [...(d.hosting || []), newHosting],
              updatedAt: new Date()
            }
          : d
      );
      updateProjectMutation.mutate(updatedDeployments);
    }
  };

  const handleNext = () => {
    if (step === "branch") {
      if (!selectedBranch) {
        setError("Please select a branch");
        return;
      }
      // If no hosting, go to add-hosting step, otherwise go to providers
      if (needsHosting) {
        setStep("add-hosting");
      } else {
        setStep("providers");
      }
      setError(null);
    } else if (step === "add-hosting") {
      // After adding hosting, move to providers step
      // The hosting should have been added via handleAddHosting
      // Check if we have hosting now
      const currentDeployment = project.deployments?.find(
        (d) => d.id === deployment.id
      );
      if (currentDeployment && (currentDeployment.hosting?.length || 0) > 0) {
        setStep("providers");
      } else {
        setError("Please add at least one hosting provider");
      }
    } else if (step === "providers") {
      if (selectedProviders.size === 0) {
        setError("Please select at least one hosting provider");
        return;
      }
      setStep("review");
      setError(null);
    }
  };

  const handleBack = () => {
    if (step === "add-hosting") {
      setStep("branch");
    } else if (step === "providers") {
      if (needsHosting) {
        setStep("add-hosting");
      } else {
        setStep("branch");
      }
    } else if (step === "review") {
      setStep("providers");
    }
    setError(null);
  };

  const handleDeploy = () => {
    setError(null);
    deployMutation.mutate({
      branch: selectedBranch,
      hostingProviderIds: Array.from(selectedProviders)
    });
  };

  const toggleProvider = (providerId: string) => {
    const newSet = new Set(selectedProviders);
    if (newSet.has(providerId)) {
      newSet.delete(providerId);
    } else {
      newSet.add(providerId);
    }
    setSelectedProviders(newSet);
  };

  const getProviderIcon = (provider: string) => {
    if (provider === "firebase-hosting") {
      return <Flame className="w-4 h-4" />;
    }
    return <Globe className="w-4 h-4" />;
  };

  const getProviderName = (provider: string) => {
    if (provider === "firebase-hosting") {
      return "Firebase Hosting";
    }
    if (provider === "cloudflare-pages") {
      return "Cloudflare Pages";
    }
    return provider;
  };

  const loading =
    deployMutation.isPending ||
    updateProjectMutation.isPending ||
    createPagesProjectMutation.isPending ||
    isLoadingAccountId ||
    loadingPagesProjects ||
    loadingFirebaseSites;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {step === "branch"
            ? "Select Branch"
            : step === "add-hosting"
              ? "Add Hosting Provider"
              : step === "providers"
                ? "Select Hosting Providers"
                : step === "review"
                  ? "Review Deployment"
                  : "Deploying"}
        </DialogTitle>
        <DialogDescription>
          {step === "branch"
            ? "Choose the branch to deploy from"
            : step === "add-hosting"
              ? "Add a hosting provider to deploy your application"
              : step === "providers"
                ? "Select one or more hosting providers to deploy to"
                : step === "review"
                  ? "Review your deployment configuration"
                  : "Your deployment is in progress"}
        </DialogDescription>
      </DialogHeader>

      {step === "branch" && (
        <div className="space-y-4">
          {!hasRepository ? (
            <div className="text-sm text-muted-foreground">
              This deployment doesn't have a repository configured. Please add a
              repository first.
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Branch</Label>
              {loadingBranches ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Loading branches...
                  </span>
                </div>
              ) : branches.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No branches found
                </div>
              ) : (
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between"
                    >
                      {selectedBranch
                        ? branches.find((b: any) => b.name === selectedBranch)
                            ?.name || "Select branch..."
                        : "Select branch..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search branches..." />
                      <CommandList>
                        <CommandEmpty>No branches found.</CommandEmpty>
                        <CommandGroup>
                          {branches.map((branch: any) => (
                            <CommandItem
                              key={branch.name}
                              value={branch.name}
                              onSelect={() => {
                                setSelectedBranch(branch.name);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedBranch === branch.name
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              <div className="flex items-center gap-2">
                                <Github className="w-4 h-4" />
                                <span>{branch.name}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
      )}

      {step === "add-hosting" && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="hosting-provider-select">Hosting Provider</Label>
            <Select
              value={selectedHostingProvider}
              onValueChange={(value) => {
                setSelectedHostingProvider(
                  value as "cloudflare-pages" | "firebase-hosting"
                );
                setError(null);
              }}
            >
              <SelectTrigger id="hosting-provider-select" className="mt-2">
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

          {selectedHostingProvider === "cloudflare-pages" && (
            <div className="space-y-4">
              {!isCloudflareConnected ? (
                <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
                  <p className="mb-2">
                    Cloudflare account required for Cloudflare Pages.
                  </p>
                  <a href="/settings" className="text-primary hover:underline">
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
                        setNewPagesProjectBranch("main");
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
                        setNewPagesProjectBranch("main");
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
                        <Label htmlFor="pages-project-name">Project Name</Label>
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

          {selectedHostingProvider === "firebase-hosting" && (
            <div className="space-y-4">
              {!hasFirebaseProject ? (
                <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
                  <p className="mb-2">Firebase project must be linked first.</p>
                  <p>Go to the Integrations tab to link a Firebase project.</p>
                </div>
              ) : (
                <>
                  {firebaseSites.length > 0 ? (
                    <div>
                      <Label>Firebase Hosting Site</Label>
                      {loadingFirebaseSites ? (
                        <div className="flex items-center gap-2 mt-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            Loading sites...
                          </span>
                        </div>
                      ) : (
                        <>
                          <Select
                            value={selectedFirebaseSite}
                            onValueChange={setSelectedFirebaseSite}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select a site" />
                            </SelectTrigger>
                            <SelectContent>
                              {firebaseSites.map((site) => (
                                <SelectItem
                                  key={site.siteId}
                                  value={site.siteId}
                                >
                                  {site.siteId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="text-xs text-muted-foreground mt-2">
                            Or enter a new site ID below
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                  <div>
                    <Label htmlFor="firebase-site-id">
                      {firebaseSites.length > 0
                        ? "Or Enter Site ID"
                        : "Site ID"}
                    </Label>
                    <Input
                      id="firebase-site-id"
                      value={newFirebaseSiteId}
                      onChange={(e) => setNewFirebaseSiteId(e.target.value)}
                      placeholder={project.firebaseProjectId || "site-id"}
                      className="mt-2"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
      )}

      {step === "providers" && (
        <div className="space-y-4">
          {availableHosting.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              This deployment doesn't have any hosting providers configured.
              Please add hosting providers first.
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Hosting Providers</Label>
              {availableHosting.map((hosting: Hosting) => (
                <div
                  key={hosting.id}
                  className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50"
                >
                  <Checkbox
                    id={hosting.id}
                    checked={selectedProviders.has(hosting.id)}
                    onCheckedChange={() => toggleProvider(hosting.id)}
                  />
                  <Label
                    htmlFor={hosting.id}
                    className="flex-1 cursor-pointer flex items-center gap-2"
                  >
                    {getProviderIcon(hosting.provider)}
                    <div className="flex-1">
                      <div className="font-medium">{hosting.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {getProviderName(hosting.provider)}
                        {hosting.url && ` • ${hosting.url}`}
                        {hosting.status && ` • ${hosting.status}`}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-1">Repository</div>
              <div className="text-sm text-muted-foreground">
                {currentDeployment.repository?.fullName}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Branch</div>
              <div className="text-sm text-muted-foreground">
                {selectedBranch}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Hosting Providers</div>
              <div className="space-y-1 mt-1">
                {Array.from(selectedProviders).map((providerId) => {
                  const hosting = availableHosting.find(
                    (h) => h.id === providerId
                  );
                  if (!hosting) return null;
                  return (
                    <div
                      key={providerId}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      {getProviderIcon(hosting.provider)}
                      <span>{hosting.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {getProviderName(hosting.provider)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
      )}

      {step === "progress" && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {deploymentStatus?.message || "Deploying..."}
                </span>
                <span className="text-sm text-muted-foreground">
                  {deploymentStatus?.progress || 0}%
                </span>
              </div>
              <Progress value={deploymentStatus?.progress || 0} />
            </div>

            {deploymentStatus?.deployments && (
              <div className="space-y-2 mt-4">
                {deploymentStatus.deployments.map((dep) => {
                  const hosting = availableHosting.find(
                    (h) => h.id === dep.providerId
                  );
                  return (
                    <div
                      key={dep.providerId}
                      className="flex items-center gap-2 p-2 border rounded-md"
                    >
                      {dep.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : dep.status === "error" ? (
                        <XCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {hosting?.name || dep.providerId}
                        </div>
                        {dep.error && (
                          <div className="text-xs text-destructive mt-1">
                            {dep.error}
                          </div>
                        )}
                        {dep.url && (
                          <a
                            href={dep.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline mt-1"
                          >
                            View deployment
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {deploymentStatus?.error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <div className="text-sm text-destructive">
                  {deploymentStatus.error}
                </div>
              </div>
            )}

            {deploymentStatus?.step === "success" && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <div className="text-sm text-green-800 dark:text-green-200">
                  Deployment completed successfully!
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <DialogFooter>
        {step !== "progress" && (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step !== "branch" && (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
            )}
            {step === "add-hosting" ? (
              <Button
                onClick={handleAddHosting}
                disabled={
                  loading ||
                  !selectedHostingProvider ||
                  (selectedHostingProvider === "cloudflare-pages" &&
                    !isCloudflareConnected) ||
                  (selectedHostingProvider === "firebase-hosting" &&
                    !hasFirebaseProject) ||
                  (selectedHostingProvider === "cloudflare-pages" &&
                    !selectedPagesProject &&
                    !newPagesProjectName.trim()) ||
                  (selectedHostingProvider === "firebase-hosting" &&
                    !selectedFirebaseSite &&
                    !newFirebaseSiteId.trim())
                }
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Hosting
              </Button>
            ) : step === "review" ? (
              <Button onClick={handleDeploy} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Deploy
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={
                  (step === "branch" && !selectedBranch) ||
                  (step === "providers" && selectedProviders.size === 0) ||
                  loading
                }
              >
                Next
              </Button>
            )}
          </>
        )}
        {step === "progress" &&
          (deploymentStatus?.step === "success" ||
            deploymentStatus?.step === "error") && (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
      </DialogFooter>
    </DialogContent>
  );
}
