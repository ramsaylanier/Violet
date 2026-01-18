import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Trash2,
  ExternalLink,
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
import { getProjectDomains } from "@/client/lib/utils";
import { EmptyState } from "@/client/components/shared/EmptyState";
import { DNSRecordDialog } from "../../DNSRecordDialog";
import { deleteCloudflareDNSRecord } from "@/client/api/cloudflare";
import { LinkDomainDialog } from "./LinkDomainDialog";

interface ProjectDomainsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectDomains({ project, onUpdate }: ProjectDomainsProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
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
  const projectDomains = getProjectDomains(project); // Legacy support
  const isCloudflareConnected = !!user?.cloudflareToken;

  // Fetch Cloudflare zones using useQuery
  const { data: availableZones = [] } = useQuery({
    queryKey: ["cloudflare-zones"],
    queryFn: async () => {
      if (!isCloudflareConnected) {
        return [];
      }
      return listCloudflareZones();
    },
    enabled: isCloudflareConnected
  });

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

  const handleRemoveClick = (domain: { zoneId: string; zoneName: string }) => {
    setZoneToRemove(domain);
    setRemoveDialogOpen(true);
    setError(null);
  };

  const removeDomainMutation = useMutation({
    mutationFn: async (zoneToRemove: { zoneId: string; zoneName: string }) => {
      // Find the deployment that has this domain and remove it
      const updatedDeployments = deployments.map((d) => {
        if (!d.domain) return d;

        // Match Cloudflare domains by zoneId
        const isCloudflareMatch =
          d.domain.provider === "cloudflare" &&
          d.domain.zoneId === zoneToRemove.zoneId;

        // Match Firebase domains by zoneName
        const isFirebaseMatch =
          d.domain.provider === "firebase" &&
          d.domain.zoneName === zoneToRemove.zoneName;

        if (isCloudflareMatch || isFirebaseMatch) {
          return {
            ...d,
            domain: undefined,
            updatedAt: new Date()
          };
        }

        return d;
      });

      return await updateProject(project.id, {
        deployments: updatedDeployments
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
          <LinkDomainDialog
            project={project}
            onUpdate={onUpdate}
            trigger={
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Link Domain
              </Button>
            }
          />
        </div>
      </div>

      {/* Show domains from deployments */}
      {deployments.some((d) => d.domain) ? (
        <div className="space-y-6">
          {deployments
            .filter((d) => d.domain)
            .map((deployment) => {
              const domain = deployment.domain!;
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
                : `firebase-${domain.zoneName}`;

              return (
                <div key={deployment.id} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {deployment.name}
                  </h4>
                  <div className="space-y-4">
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
                              onClick={async () => {
                                // Remove domain from deployment
                                const updatedDeployments = deployments.map(
                                  (d) =>
                                    d.id === deployment.id
                                      ? {
                                          ...d,
                                          domain: undefined,
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
                              disabled={false}
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
                              <div className="text-muted-foreground">
                                Site ID
                              </div>
                              <div className="font-medium">{domain.siteId}</div>
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
                  </div>
                </div>
              );
            })}
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
                        disabled={false}
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
