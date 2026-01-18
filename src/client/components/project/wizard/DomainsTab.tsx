import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { listCloudflareZones } from "@/client/api/cloudflare";
import type { WizardState } from "./ProjectCreationWizard";

interface DomainsTabProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  open: boolean;
}

export function DomainsTab({ wizardState, onUpdate, open }: DomainsTabProps) {
  const { user } = useCurrentUser();
  const isCloudflareConnected = !!user?.cloudflareToken;

  // Fetch Cloudflare zones
  const { data: availableZones = [] } = useQuery({
    queryKey: ["cloudflare-zones"],
    queryFn: async () => {
      if (!isCloudflareConnected) return [];
      return listCloudflareZones();
    },
    enabled: open && isCloudflareConnected
  });

  const handleDomainToggle = (zoneId: string, zoneName: string) => {
    const isSelected = wizardState.selectedDomains.some(
      (d) => d.zoneId === zoneId
    );

    if (isSelected) {
      onUpdate({
        selectedDomains: wizardState.selectedDomains.filter(
          (d) => d.zoneId !== zoneId
        )
      });
    } else {
      onUpdate({
        selectedDomains: [...wizardState.selectedDomains, { zoneId, zoneName }]
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Cloudflare Domains
        </h3>
        <p className="text-xs text-muted-foreground">
          Select domains to link to your project deployments
        </p>
      </div>

      {!isCloudflareConnected ? (
        <Alert>
          <AlertDescription>
            Cloudflare account required.{" "}
            <a href="/settings" className="underline">
              Connect Cloudflare in settings
            </a>
          </AlertDescription>
        </Alert>
      ) : availableZones.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4">
          No Cloudflare zones found. Add domains in your Cloudflare account
          first.
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
          {availableZones.map((zone) => {
            const isSelected = wizardState.selectedDomains.some(
              (d) => d.zoneId === zone.id
            );
            return (
              <div
                key={zone.id}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary/10 border border-primary"
                    : "hover:bg-muted border border-transparent"
                }`}
                onClick={() => handleDomainToggle(zone.id, zone.name)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <Globe className="w-4 h-4" />
                  <span className="font-medium">{zone.name}</span>
                  <Badge
                    variant={zone.status === "active" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {zone.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {wizardState.selectedDomains.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {wizardState.selectedDomains.length} domain(s) selected
        </div>
      )}
    </div>
  );
}
