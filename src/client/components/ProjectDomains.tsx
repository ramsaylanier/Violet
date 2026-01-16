import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Trash2,
  ExternalLink,
  Check,
  ChevronsUpDown,
  Globe,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  Flame
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/client/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/client/components/ui/tooltip";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/client/components/ui/collapsible";
import { Badge } from "@/client/components/ui/badge";
import type { Project, CloudflareDNSRecord } from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import {
  listCloudflareZones,
  listCloudflareDNSRecords
} from "@/client/api/cloudflare";
import { updateProject } from "@/client/api/projects";
import { EmptyState } from "@/client/components/shared/EmptyState";
import { DNSRecordDialog } from "./DNSRecordDialog";
import { deleteCloudflareDNSRecord } from "@/client/api/cloudflare";
import {
  listFirebaseHostingSites,
  addFirebaseDomain
} from "@/client/api/firebase";
import { Input } from "@/client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/client/components/ui/select";

interface ProjectDomainsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectDomains({ project, onUpdate }: ProjectDomainsProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [zoneToRemove, setZoneToRemove] = useState<{
    zoneId: string;
    zoneName: string;
  } | null>(null);
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>(
    {}
  );
  const [dnsRecords, setDnsRecords] = useState<
    Record<string, { records: CloudflareDNSRecord[]; loading: boolean }>
  >({});
  const [dnsDialogOpen, setDnsDialogOpen] = useState(false);
  const [selectedZoneForDns, setSelectedZoneForDns] = useState<{
    zoneId: string;
    zoneName: string;
  } | null>(null);
  const [selectedRecord, setSelectedRecord] =
    useState<CloudflareDNSRecord | null>(null);
  const [deleteRecordDialogOpen, setDeleteRecordDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] =
    useState<CloudflareDNSRecord | null>(null);
  const { user } = useCurrentUser();

  const deployments = project.deployments || [];
  const projectDomains = project.domains || []; // Legacy support
  const isCloudflareConnected = !!user?.cloudflareToken;
  const isGoogleConnected = !!user?.googleToken;
  const [firebaseDialogOpen, setFirebaseDialogOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [firebaseDomainName, setFirebaseDomainName] = useState<string>("");
  const [firebaseComboboxOpen, setFirebaseComboboxOpen] = useState(false);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>("");

  // Fetch Cloudflare zones using useQuery
  const {
    data: availableZones = [],
    isLoading: loadingZones,
    error: zonesError
  } = useQuery({
    queryKey: ["cloudflare-zones"],
    queryFn: async () => {
      if (!isCloudflareConnected) {
        return [];
      }
      return listCloudflareZones();
    },
    enabled: dialogOpen && isCloudflareConnected
  });

  // Fetch Firebase hosting sites using useQuery
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
        firebaseDialogOpen && !!project.firebaseProjectId && isGoogleConnected
    });

  // Update error state when zones query error changes
  useEffect(() => {
    if (zonesError) {
      setError(
        zonesError instanceof Error
          ? zonesError.message
          : "Failed to load domains"
      );
    } else if (!zonesError) {
      setError(null);
    }
  }, [zonesError]);

  const loadDNSRecords = async (zoneId: string, zoneName: string) => {
    if (dnsRecords[zoneId]?.loading) return;

    try {
      setDnsRecords((prev) => ({
        ...prev,
        [zoneId]: {
          records: prev[zoneId]?.records || [],
          loading: true
        }
      }));

      const records = await listCloudflareDNSRecords(zoneId);
      setDnsRecords((prev) => ({
        ...prev,
        [zoneId]: {
          records,
          loading: false
        }
      }));
    } catch (err: any) {
      console.error(`Failed to load DNS records for ${zoneName}:`, err);
      setDnsRecords((prev) => ({
        ...prev,
        [zoneId]: {
          records: prev[zoneId]?.records || [],
          loading: false
        }
      }));
    }
  };

  const toggleZoneExpansion = (zoneId: string, zoneName: string) => {
    const isExpanded = expandedZones[zoneId];
    setExpandedZones((prev) => ({
      ...prev,
      [zoneId]: !isExpanded
    }));

    if (!isExpanded && !dnsRecords[zoneId]) {
      loadDNSRecords(zoneId, zoneName);
    }
  };

  const addDomainMutation = useMutation({
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

      if (deployments.length > 0) {
        if (!deploymentId) {
          throw new Error("Please select a deployment");
        }

        const selectedDeployment = deployments.find((d) => d.id === deploymentId);
        if (!selectedDeployment) {
          throw new Error("Selected deployment not found");
        }

        // Check if domain is already linked to this deployment
        if (selectedDeployment.domains?.some((d) => d.zoneId === zone.id)) {
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
                domains: [...(d.domains || []), newDomain],
                updatedAt: new Date()
              }
            : d
        );
        return await updateProject(project.id, {
          deployments: updatedDeployments
        });
      } else {
        // Legacy: Add to project-level domains
        if (projectDomains.some((d) => d.zoneId === zone.id)) {
          throw new Error("This domain is already linked to this project");
        }

        const updatedDomains = [
          ...projectDomains,
          {
            zoneId: zone.id,
            zoneName: zone.name,
            provider: "cloudflare" as const,
            linkedAt: new Date()
          }
        ];
        return await updateProject(project.id, {
          domains: updatedDomains
        });
      }
    },
    onSuccess: (updatedProject) => {
      onUpdate(updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setDialogOpen(false);
      setSelectedZone("");
      setSelectedDeploymentId("");
      setComboboxOpen(false);
    },
    onError: (err: any) => {
      console.error("Failed to add domain:", err);
      setError(err?.message || "Failed to add domain");
    }
  });

  const handleAddDomain = () => {
    if (!selectedZone) return;
    if (!selectedDeploymentId && deployments.length > 0) {
      setError("Please select a deployment");
      return;
    }

    setError(null);
    addDomainMutation.mutate({
      zoneId: selectedZone,
      deploymentId: selectedDeploymentId
    });
  };

  const handleRemoveClick = (domain: { zoneId: string; zoneName: string }) => {
    setZoneToRemove(domain);
    setRemoveDialogOpen(true);
    setError(null);
  };

  const removeDomainMutation = useMutation({
    mutationFn: async (zoneToRemove: { zoneId: string; zoneName: string }) => {
      const updatedDomains = projectDomains.filter(
        (d) =>
          (d.provider === "cloudflare" && d.zoneId !== zoneToRemove.zoneId) ||
          (d.provider === "firebase" && d.zoneName !== zoneToRemove.zoneName)
      );
      return await updateProject(project.id, {
        domains: updatedDomains.length > 0 ? updatedDomains : []
      });
    },
    onSuccess: (updatedProject) => {
      onUpdate(updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setRemoveDialogOpen(false);
      setZoneToRemove(null);
    },
    onError: (err: any) => {
      console.error("Failed to remove domain:", err);
      setError(err?.message || "Failed to remove domain");
    }
  });

  const handleRemoveDomain = () => {
    if (!zoneToRemove) return;
    setError(null);
    removeDomainMutation.mutate(zoneToRemove);
  };

  const addFirebaseDomainMutation = useMutation({
    mutationFn: async ({
      siteId,
      domainName
    }: {
      siteId: string;
      domainName: string;
    }) => {
      // Validate domain format
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(domainName.trim())) {
        throw new Error("Invalid domain format");
      }

      // Check if domain is already linked
      if (
        projectDomains.some(
          (d) => d.provider === "firebase" && d.zoneName === domainName.trim()
        )
      ) {
        throw new Error("This domain is already linked to this project");
      }

      // Add domain to Firebase Hosting
      if (!project.firebaseProjectId) {
        throw new Error("Firebase project ID is required");
      }

      const result = await addFirebaseDomain(
        siteId,
        project.firebaseProjectId,
        domainName.trim()
      );

      // Add to project domains
      const updatedDomains = [
        ...projectDomains,
        {
          zoneName: result.domain,
          provider: "firebase" as const,
          linkedAt: new Date(),
          siteId,
          status: result.status
        }
      ];

      return await updateProject(project.id, {
        domains: updatedDomains
      });
    },
    onSuccess: (updatedProject) => {
      onUpdate(updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setFirebaseDialogOpen(false);
      setSelectedSiteId("");
      setFirebaseDomainName("");
    },
    onError: (err: any) => {
      console.error("Failed to add Firebase domain:", err);
      setError(err?.message || "Failed to add domain to Firebase");
    }
  });

  const handleAddFirebaseDomain = () => {
    if (!selectedSiteId || !firebaseDomainName.trim()) return;
    setError(null);
    addFirebaseDomainMutation.mutate({
      siteId: selectedSiteId,
      domainName: firebaseDomainName
    });
  };

  const deleteDNSRecordMutation = useMutation({
    mutationFn: async ({
      zoneId,
      recordId
    }: {
      zoneId: string;
      recordId: string;
    }) => {
      await deleteCloudflareDNSRecord(zoneId, recordId);
      return { zoneId };
    },
    onSuccess: ({ zoneId }) => {
      // Reload DNS records
      const zone = availableZones.find((z) => z.id === zoneId);
      if (zone) {
        loadDNSRecords(zoneId, zone.name);
      }
      setDeleteRecordDialogOpen(false);
      setRecordToDelete(null);
    },
    onError: (err: any) => {
      console.error("Failed to delete DNS record:", err);
      setError(err?.message || "Failed to delete DNS record");
    }
  });

  const handleDeleteDNSRecord = () => {
    if (!recordToDelete || !selectedZoneForDns) return;
    setError(null);
    deleteDNSRecordMutation.mutate({
      zoneId: selectedZoneForDns.zoneId,
      recordId: recordToDelete.id
    });
  };

  // Filter out already linked domains from the select list
  const availableZonesToAdd =
    deployments.length > 0
      ? availableZones.filter((zone) => {
          // Check if domain is linked to any deployment
          return !deployments.some((d) =>
            d.domains?.some((domain) => domain.zoneId === zone.id)
          );
        })
      : availableZones.filter(
          (zone) => !projectDomains.some((d) => d.zoneId === zone.id)
        );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Domains</h3>
          <p className="text-sm text-muted-foreground">
            Manage domains linked to this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCloudflareConnected ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Link Cloudflare Domain
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Domain</DialogTitle>
                  <DialogDescription>
                    Link an existing Cloudflare domain to a deployment
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
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
                          {deployments.map((deployment) => (
                            <SelectItem
                              key={deployment.id}
                              value={deployment.id}
                            >
                              {deployment.name}
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
                      <Popover
                        open={comboboxOpen}
                        onOpenChange={setComboboxOpen}
                      >
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

                  {error && (
                    <div className="text-sm text-destructive">{error}</div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setError(null);
                      setSelectedZone("");
                      setComboboxOpen(false);
                    }}
                    disabled={addFirebaseDomainMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddDomain}
                    disabled={
                      addDomainMutation.isPending ||
                      !selectedZone ||
                      (deployments.length > 0 && !selectedDeploymentId)
                    }
                  >
                    {addDomainMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Link Domain
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button variant="outline" disabled>
                    <Plus className="w-4 h-4 mr-2" />
                    Link Cloudflare Domain
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-2">
                  <p>Cloudflare account required to link domains.</p>
                  <a
                    href="/settings"
                    className="underline font-medium text-background hover:text-background/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Connect Cloudflare in settings
                  </a>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          {project.firebaseProjectId && isGoogleConnected ? (
            <Dialog
              open={firebaseDialogOpen}
              onOpenChange={setFirebaseDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Flame className="w-4 h-4 mr-2" />
                  Add Firebase Domain
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Firebase Domain</DialogTitle>
                  <DialogDescription>
                    Add a custom domain to your Firebase Hosting site
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
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

                  {error && (
                    <div className="text-sm text-destructive">{error}</div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFirebaseDialogOpen(false);
                      setError(null);
                      setSelectedSiteId("");
                      setFirebaseDomainName("");
                      setFirebaseComboboxOpen(false);
                    }}
                    disabled={addFirebaseDomainMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddFirebaseDomain}
                    disabled={
                      addFirebaseDomainMutation.isPending ||
                      !selectedSiteId ||
                      !firebaseDomainName.trim()
                    }
                  >
                    {addFirebaseDomainMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Add Domain
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : project.firebaseProjectId ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button disabled>
                    <Flame className="w-4 h-4 mr-2" />
                    Add Firebase Domain
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-2">
                  <p>Google account required to add Firebase domains.</p>
                  <a
                    href="/settings"
                    className="underline font-medium text-background hover:text-background/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Connect Google in settings
                  </a>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>

      {/* Show domains from deployments */}
      {deployments.some((d) => d.domains && d.domains.length > 0) ? (
        <div className="space-y-6">
          {deployments
            .filter((d) => d.domains && d.domains.length > 0)
            .map((deployment) => (
              <div key={deployment.id} className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  {deployment.name}
                </h4>
                <div className="space-y-4">
                  {deployment.domains!.map((domain, index) => {
                    const isCloudflareDomain = domain.provider === "cloudflare";
                    const isFirebaseDomain = domain.provider === "firebase";
                    const zone = isCloudflareDomain
                      ? availableZones.find((z) => z.id === domain.zoneId)
                      : null;
                    const isExpanded = isCloudflareDomain
                      ? expandedZones[domain.zoneId || ""]
                      : false;
                    const records = isCloudflareDomain
                      ? dnsRecords[domain.zoneId || ""]
                      : null;
                    const domainKey = isCloudflareDomain
                      ? domain.zoneId
                      : `firebase-${domain.zoneName}-${index}`;

                    return (
                      <Card key={domainKey}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="flex items-center gap-2">
                                {isFirebaseDomain ? (
                                  <Flame className="w-5 h-5" />
                                ) : (
                                  <Globe className="w-5 h-5" />
                                )}
                                {domain.zoneName}
                              </CardTitle>
                              {isCloudflareDomain && zone && (
                                <Badge
                                  variant={
                                    zone.status === "active"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {zone.status}
                                </Badge>
                              )}
                              {isFirebaseDomain && domain.status && (
                                <Badge
                                  variant={
                                    domain.status === "ACTIVE"
                                      ? "default"
                                      : domain.status === "PENDING"
                                        ? "secondary"
                                        : "destructive"
                                  }
                                >
                                  {domain.status}
                                </Badge>
                              )}
                              <Badge variant="outline" className="capitalize">
                                {domain.provider}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {isCloudflareDomain && zone && (
                                <a
                                  href={`https://dash.cloudflare.com/${zone?.account?.id || ""}/dns`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                  <Settings className="w-4 h-4" />
                                  Manage
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {isFirebaseDomain &&
                                project.firebaseProjectId && (
                                  <a
                                    href={`https://console.firebase.google.com/project/${project.firebaseProjectId}/hosting`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                  >
                                    <Settings className="w-4 h-4" />
                                    Manage
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  // Remove domain from deployment
                                  const updatedDeployments = deployments.map(
                                    (d) =>
                                      d.id === deployment.id
                                        ? {
                                            ...d,
                                            domains:
                                              d.domains?.filter(
                                                (dd) =>
                                                  (isCloudflareDomain &&
                                                    dd.zoneId !==
                                                      domain.zoneId) ||
                                                  (isFirebaseDomain &&
                                                    dd.zoneName !==
                                                      domain.zoneName)
                                              ) || [],
                                            updatedAt: new Date()
                                          }
                                        : d
                                  );
                                  const updated = await updateProject(
                                    project.id,
                                    {
                                      deployments: updatedDeployments
                                    }
                                  );
                                  onUpdate(updated);
                                  queryClient.invalidateQueries({
                                    queryKey: ["projects"]
                                  });
                                }}
                                disabled={addFirebaseDomainMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* DNS Records and other domain details - similar to original */}
                          {isCloudflareDomain && zone && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">
                                  Type
                                </div>
                                <div className="font-medium capitalize">
                                  {zone.type}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">
                                  Plan
                                </div>
                                <div className="font-medium">
                                  {zone.plan?.name || "Free"}
                                </div>
                              </div>
                            </div>
                          )}

                          {isFirebaseDomain && domain.siteId && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">
                                  Site ID
                                </div>
                                <div className="font-medium">
                                  {domain.siteId}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">
                                  Status
                                </div>
                                <div className="font-medium capitalize">
                                  {domain.status || "Unknown"}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* DNS Records Section - Only for Cloudflare */}
                          {isCloudflareDomain && isCloudflareConnected && (
                            <Collapsible
                              open={isExpanded}
                              onOpenChange={() =>
                                toggleZoneExpansion(
                                  domain.zoneId || "",
                                  domain.zoneName
                                )
                              }
                            >
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-between p-0 h-auto hover:bg-transparent"
                                >
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                    <span className="text-sm font-medium">
                                      DNS Records
                                    </span>
                                    {records?.records && (
                                      <Badge
                                        variant="secondary"
                                        className="ml-2"
                                      >
                                        {records.records.length}
                                      </Badge>
                                    )}
                                  </div>
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-2 mt-2">
                                {records?.loading ? (
                                  <div className="flex items-center gap-2 py-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm text-muted-foreground">
                                      Loading DNS records...
                                    </span>
                                  </div>
                                ) : !records ||
                                  records?.records.length === 0 ? (
                                  <div className="text-sm text-muted-foreground py-2">
                                    No DNS records found
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {records?.records
                                      ?.slice(0, 10)
                                      .map((record) => (
                                        <div
                                          key={record.id}
                                          className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm hover:bg-muted/80"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <Badge
                                                variant="outline"
                                                className="font-mono"
                                              >
                                                {record.type}
                                              </Badge>
                                              <span className="font-medium truncate">
                                                {record.name}
                                              </span>
                                              {record.proxied && (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs"
                                                >
                                                  Proxied
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 truncate">
                                              {record.content}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      ) : projectDomains.length > 0 ? (
        // Legacy: Show project-level domains if no deployments
        <div className="space-y-4">
          {projectDomains.map((domain, index) => {
            const isCloudflareDomain = domain.provider === "cloudflare";
            const isFirebaseDomain = domain.provider === "firebase";
            const zone = isCloudflareDomain
              ? availableZones.find((z) => z.id === domain.zoneId)
              : null;
            const isExpanded = isCloudflareDomain
              ? expandedZones[domain.zoneId || ""]
              : false;
            const records = isCloudflareDomain
              ? dnsRecords[domain.zoneId || ""]
              : null;
            const domainKey = isCloudflareDomain
              ? domain.zoneId
              : `firebase-${domain.zoneName}-${index}`;

            return (
              <Card key={domainKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2">
                        {isFirebaseDomain ? (
                          <Flame className="w-5 h-5" />
                        ) : (
                          <Globe className="w-5 h-5" />
                        )}
                        {domain.zoneName}
                      </CardTitle>
                      {isCloudflareDomain && zone && (
                        <Badge
                          variant={
                            zone.status === "active" ? "default" : "secondary"
                          }
                        >
                          {zone.status}
                        </Badge>
                      )}
                      {isFirebaseDomain && domain.status && (
                        <Badge
                          variant={
                            domain.status === "ACTIVE"
                              ? "default"
                              : domain.status === "PENDING"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {domain.status}
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {domain.provider}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCloudflareDomain && zone && (
                        <a
                          href={`https://dash.cloudflare.com/${zone?.account?.id || ""}/dns`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Settings className="w-4 h-4" />
                          Manage
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {isFirebaseDomain && project.firebaseProjectId && (
                        <a
                          href={`https://console.firebase.google.com/project/${project.firebaseProjectId}/hosting`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Settings className="w-4 h-4" />
                          Manage
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleRemoveClick({
                            zoneId: domain.zoneId || "",
                            zoneName: domain.zoneName
                          })
                        }
                        disabled={addFirebaseDomainMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isCloudflareDomain && zone && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Type</div>
                        <div className="font-medium capitalize">
                          {zone.type}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Plan</div>
                        <div className="font-medium">
                          {zone.plan?.name || "Free"}
                        </div>
                      </div>
                    </div>
                  )}

                  {isFirebaseDomain && domain.siteId && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Site ID</div>
                        <div className="font-medium">{domain.siteId}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Status</div>
                        <div className="font-medium capitalize">
                          {domain.status || "Unknown"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DNS Records Section - Only for Cloudflare */}
                  {isCloudflareDomain && isCloudflareConnected && (
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() =>
                        toggleZoneExpansion(
                          domain.zoneId || "",
                          domain.zoneName
                        )
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-0 h-auto hover:bg-transparent"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">
                              DNS Records
                            </span>
                            {records?.records && (
                              <Badge variant="secondary" className="ml-2">
                                {records.records.length}
                              </Badge>
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {records?.loading ? (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              Loading DNS records...
                            </span>
                          </div>
                        ) : !records || records?.records.length === 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">
                                DNS Records
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (zone) {
                                    setSelectedZoneForDns({
                                      zoneId: domain.zoneId || "",
                                      zoneName: domain.zoneName
                                    });
                                    setSelectedRecord(null);
                                    setDnsDialogOpen(true);
                                  }
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Record
                              </Button>
                            </div>
                            <div className="text-sm text-muted-foreground py-2">
                              No DNS records found
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">
                                DNS Records
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (zone) {
                                    setSelectedZoneForDns({
                                      zoneId: domain.zoneId || "",
                                      zoneName: domain.zoneName
                                    });
                                    setSelectedRecord(null);
                                    setDnsDialogOpen(true);
                                  }
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Record
                              </Button>
                            </div>
                            {records?.records?.slice(0, 10).map((record) => (
                              <div
                                key={record.id}
                                className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm hover:bg-muted/80"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="font-mono"
                                    >
                                      {record.type}
                                    </Badge>
                                    <span className="font-medium truncate">
                                      {record.name}
                                    </span>
                                    {record.proxied && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        Proxied
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 truncate">
                                    {record.content}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedZoneForDns({
                                        zoneId: domain.zoneId || "",
                                        zoneName: domain.zoneName
                                      });
                                      setSelectedRecord(record);
                                      setDnsDialogOpen(true);
                                    }}
                                  >
                                    <Settings className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setRecordToDelete(record);
                                      setDeleteRecordDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {records.records.length > 10 && (
                              <div className="text-xs text-muted-foreground text-center py-1">
                                +{records.records.length - 10} more records
                              </div>
                            )}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Globe className="w-12 h-12 mx-auto text-muted-foreground" />}
          title="No domains linked"
          description="Link a domain from your Cloudflare account to manage DNS and settings"
        />
      )}

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Domain</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the domain from this project. The domain will
              remain in your Cloudflare account and can be linked again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveDialogOpen(false);
                setZoneToRemove(null);
                setError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDomain}
              disabled={removeDomainMutation.isPending}
            >
              {removeDomainMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedZoneForDns && (
        <DNSRecordDialog
          open={dnsDialogOpen}
          onOpenChange={setDnsDialogOpen}
          zoneId={selectedZoneForDns.zoneId}
          zoneName={selectedZoneForDns.zoneName}
          record={selectedRecord || undefined}
          onSuccess={() => {
            // Reload DNS records for this zone
            if (selectedZoneForDns) {
              loadDNSRecords(
                selectedZoneForDns.zoneId,
                selectedZoneForDns.zoneName
              );
            }
            setSelectedZoneForDns(null);
            setSelectedRecord(null);
          }}
        />
      )}

      <AlertDialog
        open={deleteRecordDialogOpen}
        onOpenChange={setDeleteRecordDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete DNS Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the DNS record{" "}
              <strong>{recordToDelete?.name}</strong> ({recordToDelete?.type})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteRecordDialogOpen(false);
                setRecordToDelete(null);
                setError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDNSRecord}
                                disabled={deleteDNSRecordMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDNSRecordMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
