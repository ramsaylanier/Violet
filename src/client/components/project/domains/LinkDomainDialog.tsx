import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ExternalLink,
  Check,
  ChevronsUpDown,
  Globe,
  Flame
} from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/client/components/ui/dialog";
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
import { Label } from "@/client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/client/components/ui/select";
import { Input } from "@/client/components/ui/input";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import type { Project, Deployment } from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { listCloudflareZones } from "@/client/api/cloudflare";
import {
  listFirebaseHostingSites,
  addFirebaseDomain
} from "@/client/api/firebase";
import { updateProject } from "@/client/api/projects";
import { getProjectDomains } from "@/client/lib/utils";

interface LinkDomainDialogProps {
  project: Project;
  deployment?: Deployment;
  onUpdate: (updatedProject: Project) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LinkDomainDialog({
  project,
  deployment,
  onUpdate,
  trigger,
  open: controlledOpen,
  onOpenChange
}: LinkDomainDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"cloudflare" | "firebase" | null>(
    null
  );

  // Cloudflare state
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>(
    deployment?.id || ""
  );

  // Firebase state
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [firebaseDomainName, setFirebaseDomainName] = useState<string>("");
  const [firebaseComboboxOpen, setFirebaseComboboxOpen] = useState(false);

  const deployments = project.deployments || [];
  const projectDomains = getProjectDomains(project);
  const isCloudflareConnected = !!user?.cloudflareToken;
  const isGoogleConnected = !!user?.googleToken;

  // Fetch Cloudflare zones
  const { data: availableZones = [], isLoading: loadingZones } = useQuery({
    queryKey: ["cloudflare-zones"],
    queryFn: async () => {
      if (!isCloudflareConnected) {
        return [];
      }
      return listCloudflareZones();
    },
    enabled: open && provider === "cloudflare" && isCloudflareConnected
  });

  // Fetch Firebase hosting sites
  const { data: firebaseSites = [], isLoading: loadingFirebaseSites } =
    useQuery({
      queryKey: ["firebase-hosting-sites", project.firebaseProjectId],
      queryFn: async () => {
        if (!project.firebaseProjectId || !isGoogleConnected) {
          return [];
        }
        return listFirebaseHostingSites(project.firebaseProjectId);
      },
      enabled:
        open &&
        provider === "firebase" &&
        !!project.firebaseProjectId &&
        isGoogleConnected
    });

  // Filter out already linked domains
  const availableZonesToAdd =
    deployments.length > 0
      ? availableZones.filter((zone) => {
          return !deployments.some((d) => d.domain?.zoneId === zone.id);
        })
      : availableZones.filter(
          (zone) => !projectDomains.some((d) => d.zoneId === zone.id)
        );

  const addCloudflareDomainMutation = useMutation({
    mutationFn: async ({
      zoneId,
      deploymentId
    }: {
      zoneId: string;
      deploymentId?: string;
    }) => {
      const zone = availableZones.find((z) => z.id === zoneId);
      if (!zone) {
        throw new Error("Zone not found");
      }

      // Domains can only be added to deployments, not directly to projects
      if (deployments.length === 0) {
        throw new Error(
          "No deployments found. Please create a deployment before linking a domain."
        );
      }

      if (!deploymentId) {
        throw new Error("Please select a deployment");
      }

      const selectedDeployment = deployments.find((d) => d.id === deploymentId);
      if (!selectedDeployment) {
        throw new Error("Selected deployment not found");
      }

      if (selectedDeployment.domain?.zoneId === zone.id) {
        throw new Error("This domain is already linked to this deployment");
      }

      const newDomain = {
        zoneId: zone.id,
        zoneName: zone.name,
        provider: "cloudflare" as const,
        linkedAt: new Date()
      };

      const updatedDeployments = deployments.map((d) =>
        d.id === deploymentId
          ? {
              ...d,
              domain: newDomain,
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
      console.error("Failed to add domain:", err);
      setError(err?.message || "Failed to add domain");
    }
  });

  const addFirebaseDomainMutation = useMutation({
    mutationFn: async ({
      siteId,
      domainName,
      deploymentId
    }: {
      siteId: string;
      domainName: string;
      deploymentId?: string;
    }) => {
      // Domains can only be added to deployments, not directly to projects
      if (deployments.length === 0) {
        throw new Error(
          "No deployments found. Please create a deployment before linking a domain."
        );
      }

      if (!deploymentId) {
        throw new Error("Please select a deployment");
      }

      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(domainName.trim())) {
        throw new Error("Invalid domain format");
      }

      const selectedDeployment = deployments.find((d) => d.id === deploymentId);
      if (!selectedDeployment) {
        throw new Error("Selected deployment not found");
      }

      // Check if domain is already linked to any deployment
      if (
        projectDomains.some(
          (d) => d.provider === "firebase" && d.zoneName === domainName.trim()
        )
      ) {
        throw new Error("This domain is already linked to this project");
      }

      if (!project.firebaseProjectId) {
        throw new Error("Firebase project ID is required");
      }

      const result = await addFirebaseDomain(
        siteId,
        project.firebaseProjectId,
        domainName.trim()
      );

      // Store Firebase domain on the selected deployment (same as Cloudflare domains)
      const newDomain = {
        zoneName: result.domain,
        provider: "firebase" as const,
        linkedAt: new Date(),
        siteId,
        status: result.status
      };

      const updatedDeployments = deployments.map((d) =>
        d.id === deploymentId
          ? {
              ...d,
              domain: newDomain,
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
      console.error("Failed to add Firebase domain:", err);
      setError(err?.message || "Failed to add domain to Firebase");
    }
  });

  const handleClose = () => {
    setOpen(false);
    setError(null);
    setProvider(null);
    setSelectedZone("");
    setSelectedDeploymentId(deployment?.id || "");
    setComboboxOpen(false);
    setSelectedSiteId("");
    setFirebaseDomainName("");
    setFirebaseComboboxOpen(false);
  };

  const handleAddCloudflareDomain = () => {
    if (!selectedZone) return;
    if (!selectedDeploymentId && deployments.length > 0) {
      setError("Please select a deployment");
      return;
    }

    setError(null);
    addCloudflareDomainMutation.mutate({
      zoneId: selectedZone,
      deploymentId: selectedDeploymentId
    });
  };

  const handleAddFirebaseDomain = () => {
    if (!selectedSiteId || !firebaseDomainName.trim()) return;
    if (!selectedDeploymentId && deployments.length > 0) {
      setError("Please select a deployment");
      return;
    }
    setError(null);
    addFirebaseDomainMutation.mutate({
      siteId: selectedSiteId,
      domainName: firebaseDomainName,
      deploymentId: selectedDeploymentId
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {provider
              ? `Link ${provider === "cloudflare" ? "Cloudflare" : "Firebase"} Domain`
              : "Link Domain"}
          </DialogTitle>
          <DialogDescription>
            {provider
              ? provider === "cloudflare"
                ? "Link an existing Cloudflare domain to a deployment"
                : "Add a custom domain to your Firebase Hosting site"
              : "Select a domain provider to get started"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {deployments.length === 0 && (
            <Alert>
              <AlertDescription>
                Domains can only be linked to deployments. Please create a
                deployment before linking a domain.
              </AlertDescription>
            </Alert>
          )}

          {!provider ? (
            // Provider selection
            <div className="space-y-3">
              <Label>Domain Provider</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={provider === "cloudflare" ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center gap-2"
                  onClick={() => {
                    setProvider("cloudflare");
                    setError(null);
                  }}
                  disabled={!isCloudflareConnected || deployments.length === 0}
                >
                  <Globe className="w-6 h-6" />
                  <span>Cloudflare</span>
                  {!isCloudflareConnected && (
                    <span className="text-xs text-muted-foreground">
                      Not connected
                    </span>
                  )}
                </Button>
                <Button
                  variant={provider === "firebase" ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center gap-2"
                  onClick={() => {
                    setProvider("firebase");
                    setError(null);
                  }}
                  disabled={
                    !project.firebaseProjectId ||
                    !isGoogleConnected ||
                    deployments.length === 0
                  }
                >
                  <Flame className="w-6 h-6" />
                  <span>Firebase</span>
                  {(!project.firebaseProjectId || !isGoogleConnected) && (
                    <span className="text-xs text-muted-foreground">
                      Not available
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ) : provider === "cloudflare" ? (
            // Cloudflare form
            <>
              {deployments.length > 0 && (
                <div>
                  <Label htmlFor="deployment-select">Deployment *</Label>
                  <Select
                    value={selectedDeploymentId}
                    onValueChange={(value) => {
                      setSelectedDeploymentId(value);
                      setError(null);
                    }}
                  >
                    <SelectTrigger id="deployment-select" className="mt-2">
                      <SelectValue placeholder="Select a deployment" />
                    </SelectTrigger>
                    <SelectContent>
                      {deployments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="zone-select">Domain</Label>
                {loadingZones ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Loading domains...
                    </span>
                  </div>
                ) : availableZonesToAdd.length === 0 ? (
                  <div className="text-sm text-muted-foreground mt-2">
                    {availableZones.length === 0
                      ? "No domains found in your Cloudflare account"
                      : "All available domains are already linked to this project"}
                  </div>
                ) : (
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="zone-select"
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className="w-full justify-between mt-2"
                      >
                        {selectedZone
                          ? availableZonesToAdd.find(
                              (z) => z.id === selectedZone
                            )?.name || "Select domain..."
                          : "Select domain..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search domains..." />
                        <CommandList>
                          <CommandEmpty>No domains found.</CommandEmpty>
                          <CommandGroup>
                            {availableZonesToAdd.map((zone) => (
                              <CommandItem
                                key={zone.id}
                                value={zone.name}
                                onSelect={() => {
                                  setSelectedZone(
                                    zone.id === selectedZone ? "" : zone.id
                                  );
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedZone === zone.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span>{zone.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    Status: {zone.status}
                                  </span>
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

              {availableZones.length === 0 && !loadingZones && (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    No domains found in your Cloudflare account. You can
                    register a new domain through Cloudflare's website.
                  </p>
                  <a
                    href="https://www.cloudflare.com/products/registrar/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                  >
                    Register a domain
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </>
          ) : (
            // Firebase form
            <>
              {deployments.length > 0 && (
                <div>
                  <Label htmlFor="deployment-select-firebase">
                    Deployment *
                  </Label>
                  <Select
                    value={selectedDeploymentId}
                    onValueChange={(value) => {
                      setSelectedDeploymentId(value);
                      setError(null);
                    }}
                  >
                    <SelectTrigger
                      id="deployment-select-firebase"
                      className="mt-2"
                    >
                      <SelectValue placeholder="Select a deployment" />
                    </SelectTrigger>
                    <SelectContent>
                      {deployments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="site-select">Hosting Site</Label>
                {loadingFirebaseSites ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Loading sites...
                    </span>
                  </div>
                ) : firebaseSites.length === 0 ? (
                  <div className="text-sm text-muted-foreground mt-2">
                    No hosting sites found. Please set up Firebase Hosting
                    first.
                  </div>
                ) : (
                  <Popover
                    open={firebaseComboboxOpen}
                    onOpenChange={setFirebaseComboboxOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        id="site-select"
                        variant="outline"
                        role="combobox"
                        aria-expanded={firebaseComboboxOpen}
                        className="w-full justify-between mt-2"
                      >
                        {selectedSiteId
                          ? firebaseSites.find(
                              (s) => s.siteId === selectedSiteId
                            )?.siteId || "Select site..."
                          : "Select site..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search sites..." />
                        <CommandList>
                          <CommandEmpty>No sites found.</CommandEmpty>
                          <CommandGroup>
                            {firebaseSites.map((site) => (
                              <CommandItem
                                key={site.siteId}
                                value={site.siteId}
                                onSelect={() => {
                                  setSelectedSiteId(
                                    site.siteId === selectedSiteId
                                      ? ""
                                      : site.siteId
                                  );
                                  setFirebaseComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedSiteId === site.siteId
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span>{site.siteId}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {site.defaultUrl}
                                  </span>
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

              <div>
                <Label htmlFor="firebase-domain">Domain Name</Label>
                <Input
                  id="firebase-domain"
                  value={firebaseDomainName}
                  onChange={(e) => setFirebaseDomainName(e.target.value)}
                  placeholder="example.com"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the domain name you want to add (e.g., example.com)
                </p>
              </div>
            </>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {provider ? "Cancel" : "Close"}
          </Button>
          {provider === "cloudflare" && (
            <Button
              onClick={handleAddCloudflareDomain}
              disabled={
                addCloudflareDomainMutation.isPending ||
                !selectedZone ||
                (deployments.length > 0 && !selectedDeploymentId)
              }
            >
              {addCloudflareDomainMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Link Domain
            </Button>
          )}
          {provider === "firebase" && (
            <Button
              onClick={handleAddFirebaseDomain}
              disabled={
                addFirebaseDomainMutation.isPending ||
                !selectedSiteId ||
                !firebaseDomainName.trim() ||
                (deployments.length > 0 && !selectedDeploymentId)
              }
            >
              {addFirebaseDomainMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Add Domain
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
