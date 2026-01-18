import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Trash2,
  ExternalLink,
  Globe,
  Flame,
  Settings
} from "lucide-react";
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
import { Badge } from "@/client/components/ui/badge";
import type { Project, Deployment } from "@/shared/types";
import { updateProject } from "@/client/api/projects";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { useCloudflareZones } from "@/client/hooks/useCloudflareZones";

interface ManageDomainDialogProps {
  project: Project;
  deployment: Deployment;
  onUpdate: (updatedProject: Project) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageDomainDialog({
  project,
  deployment,
  onUpdate,
  open,
  onOpenChange
}: ManageDomainDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const domain = deployment.domain;
  const isCloudflareDomain = domain?.provider === "cloudflare";
  const isFirebaseDomain = domain?.provider === "firebase";
  const isCloudflareConnected = !!user?.cloudflareToken;

  // Fetch Cloudflare zones to get account info for management link
  const { data: availableZones = [] } = useCloudflareZones(
    open && isCloudflareConnected && isCloudflareDomain
  );

  const zone = isCloudflareDomain
    ? availableZones.find((z) => z.id === domain?.zoneId)
    : null;

  const removeDomainMutation = useMutation({
    mutationFn: async () => {
      const deployments = project.deployments || [];
      const updatedDeployments = deployments.map((d) =>
        d.id === deployment.id
          ? {
              ...d,
              domain: undefined,
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
      onOpenChange(false);
    },
    onError: (err: any) => {
      console.error("Failed to remove domain:", err);
      setError(err?.message || "Failed to remove domain");
    }
  });

  const handleRemoveClick = () => {
    setRemoveDialogOpen(true);
    setError(null);
  };

  const handleRemoveDomain = () => {
    setError(null);
    removeDomainMutation.mutate();
  };

  const getManagementUrl = (): string | null => {
    if (isCloudflareDomain && zone) {
      return `https://dash.cloudflare.com/${zone.account?.id || ""}/dns`;
    }
    if (isFirebaseDomain && project.firebaseProjectId) {
      return `https://console.firebase.google.com/project/${project.firebaseProjectId}/hosting`;
    }
    return null;
  };

  const managementUrl = getManagementUrl();

  if (!domain) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Domain</DialogTitle>
            <DialogDescription>
              Manage the domain linked to this deployment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Domain Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isFirebaseDomain ? (
                  <Flame className="w-5 h-5" />
                ) : (
                  <Globe className="w-5 h-5" />
                )}
                <span className="font-medium text-lg">{domain.zoneName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {domain.provider}
                </Badge>
                {domain.status && (
                  <Badge
                    variant={
                      domain.status === "ACTIVE" ||
                      domain.status === "connected"
                        ? "default"
                        : domain.status === "PENDING"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {domain.status}
                  </Badge>
                )}
              </div>
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            {/* Management Link */}
            {managementUrl && (
              <div className="pt-2 border-t">
                <a
                  href={managementUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Settings className="w-4 h-4" />
                  Manage domain in{" "}
                  {isCloudflareDomain ? "Cloudflare" : "Firebase"}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-xs text-muted-foreground mt-1">
                  Opens the {isCloudflareDomain ? "Cloudflare" : "Firebase"}{" "}
                  console in a new tab
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveClick}
              disabled={removeDomainMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the domain{" "}
              <strong>{domain.zoneName}</strong> from this deployment? The
              domain will remain in your{" "}
              {domain.provider === "cloudflare" ? "Cloudflare" : "Firebase"}{" "}
              account and can be linked again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveDialogOpen(false);
                setError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDomain}
              disabled={removeDomainMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeDomainMutation.isPending && (
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
