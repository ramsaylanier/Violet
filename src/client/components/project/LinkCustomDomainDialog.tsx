import { useState, useEffect } from "react";
import { Loader2, Globe, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Label } from "@/client/components/ui/label";
import { Badge } from "@/client/components/ui/badge";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import type { Project } from "@/shared/types";
import { getProjectDomains } from "@/client/lib/utils";
import {
  addFirebaseDomain,
  getFirebaseDomainDNSRecords
} from "@/client/api/firebase";
import {
  listCloudflareZones,
  listCloudflareDNSRecords,
  createCloudflareDNSRecord,
  updateCloudflareDNSRecord
} from "@/client/api/cloudflare";

interface LinkCustomDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  siteId: string;
  hostingName: string;
  onSuccess: () => void;
}

export function LinkCustomDomainDialog({
  open,
  onOpenChange,
  project,
  siteId,
  hostingName,
  onSuccess
}: LinkCustomDomainDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [dnsStatus, setDnsStatus] = useState<{
    success: boolean;
    message: string;
    recordsUpdated: number;
  } | null>(null);

  const projectDomains = getProjectDomains(project);
  // Only show Cloudflare domains that can be linked to Firebase
  const availableCloudflareDomains = projectDomains.filter(
    (d) => d.provider === "cloudflare"
  );

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedDomain("");
      setError(null);
      setDnsStatus(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedDomain) {
      setError("Please select a domain");
      return;
    }

    // Check if domain is already linked to this Firebase hosting site
    const existingFirebaseDomain = projectDomains.find(
      (d) =>
        d.provider === "firebase" &&
        d.zoneName === selectedDomain &&
        d.siteId === siteId
    );

    if (existingFirebaseDomain) {
      setError("This domain is already linked to this Firebase hosting site");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setDnsStatus(null);

      // Link domain to Firebase Hosting
      if (!project.firebaseProjectId) {
        setError("Firebase project ID is required");
        return;
      }

      // Step 1: Add domain to Firebase
      await addFirebaseDomain(
        siteId,
        project.firebaseProjectId,
        selectedDomain
      );

      // Step 2: Wait a moment for Firebase to provision the domain
      // Then fetch DNS records
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const dnsRecords = await getFirebaseDomainDNSRecords(
          siteId,
          project.firebaseProjectId,
          selectedDomain
        );

        if (dnsRecords.length > 0) {
          // Step 3: Get Cloudflare zone for the domain
          const selectedDomainObj = availableCloudflareDomains.find(
            (d) => d.zoneName === selectedDomain
          );

          if (!selectedDomainObj?.zoneId) {
            // Try to get zone by name if zoneId is not available
            const zones = await listCloudflareZones();
            const zone = zones.find((z) => z.name === selectedDomain);

            if (!zone) {
              setDnsStatus({
                success: false,
                message:
                  "Could not find Cloudflare zone for domain. DNS records were not updated automatically.",
                recordsUpdated: 0
              });
              onSuccess();
              return;
            }

            // Update DNS records using the zone ID
            await updateCloudflareDNSRecords(zone.id, dnsRecords);
          } else {
            // Use the zoneId from the domain object
            await updateCloudflareDNSRecords(
              selectedDomainObj.zoneId,
              dnsRecords
            );
          }
        } else {
          setDnsStatus({
            success: false,
            message:
              "No DNS records found from Firebase. You may need to configure DNS records manually.",
            recordsUpdated: 0
          });
        }
      } catch (dnsError: any) {
        console.error("Failed to update DNS records:", dnsError);
        setDnsStatus({
          success: false,
          message: `Domain linked successfully, but DNS records could not be updated automatically: ${dnsError?.message || "Unknown error"}`,
          recordsUpdated: 0
        });
      }

      // Success - domain is now linked to Firebase hosting
      onSuccess();

      // Don't close immediately - let user see the DNS status
      // They can close manually or it will auto-close after a delay if successful
    } catch (err: any) {
      console.error("Failed to link domain to Firebase:", err);
      setError(err?.message || "Failed to link domain to Firebase hosting");
    } finally {
      setLoading(false);
    }
  };

  const updateCloudflareDNSRecords = async (
    zoneId: string,
    dnsRecords: Array<{
      domainName: string;
      type: string;
      rdata: string;
      requiredAction?: string;
    }>
  ): Promise<void> => {
    let recordsUpdated = 0;
    const errors: string[] = [];

    for (const record of dnsRecords) {
      try {
        // Only process A and TXT records (the ones Firebase typically requires)
        if (record.type !== "A" && record.type !== "TXT") {
          continue;
        }

        // Determine the record name for Cloudflare
        // Firebase returns domainName which could be the full domain or a subdomain
        let cloudflareRecordName: string;
        if (
          record.domainName === selectedDomain ||
          record.domainName.endsWith(`.${selectedDomain}`)
        ) {
          // If it's the root domain or a subdomain, use it as-is
          cloudflareRecordName =
            record.domainName === selectedDomain
              ? selectedDomain
              : record.domainName;
        } else {
          // Fallback: assume it's a subdomain
          cloudflareRecordName = record.domainName.includes(selectedDomain)
            ? record.domainName
            : `${record.domainName}.${selectedDomain}`;
        }

        // Check if record already exists
        const existingRecords = await listCloudflareDNSRecords(zoneId, {
          type: record.type,
          name: cloudflareRecordName
        });

        if (existingRecords.length > 0) {
          // Update existing record
          const existingRecord = existingRecords[0];
          if (existingRecord.content !== record.rdata) {
            await updateCloudflareDNSRecord(zoneId, existingRecord.id, {
              content: record.rdata,
              type: record.type
            });
            recordsUpdated++;
          }
        } else {
          // Create new record
          await createCloudflareDNSRecord(zoneId, {
            type: record.type,
            name: cloudflareRecordName,
            content: record.rdata,
            ttl: 3600, // Default TTL
            proxied: false // Firebase requires DNS-only (not proxied)
          });
          recordsUpdated++;
        }
      } catch (recordError: any) {
        console.error(
          `Failed to update DNS record ${record.type} for ${record.domainName}:`,
          recordError
        );
        errors.push(
          `${record.type} record: ${recordError?.message || "Unknown error"}`
        );
      }
    }

    if (errors.length > 0) {
      setDnsStatus({
        success: false,
        message: `Updated ${recordsUpdated} DNS record(s), but some failed: ${errors.join(", ")}`,
        recordsUpdated
      });
    } else if (recordsUpdated > 0) {
      setDnsStatus({
        success: true,
        message: `Successfully updated ${recordsUpdated} DNS record(s) in Cloudflare.`,
        recordsUpdated
      });
    } else {
      setDnsStatus({
        success: true,
        message: "DNS records are already configured correctly.",
        recordsUpdated: 0
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Link Custom Domain</DialogTitle>
          <DialogDescription>
            Link an existing Cloudflare domain to {hostingName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="domain-select">Select Domain</Label>
            {availableCloudflareDomains.length === 0 ? (
              <div className="text-sm text-muted-foreground mt-2 p-3 border rounded-md">
                No Cloudflare domains available in this project. Add a domain in
                the Domains section first.
              </div>
            ) : (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {availableCloudflareDomains.map((domain) => (
                  <div
                    key={`${domain.provider}-${domain.zoneName}`}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                      selectedDomain === domain.zoneName
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-muted border border-transparent"
                    }`}
                    onClick={() => setSelectedDomain(domain.zoneName)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedDomain === domain.zoneName
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selectedDomain === domain.zoneName && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <Globe className="w-4 h-4" />
                      <span className="font-medium">{domain.zoneName}</span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {domain.provider}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          {dnsStatus && (
            <Alert
              className={
                dnsStatus.success
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
              }
            >
              <div className="flex items-start gap-2">
                {dnsStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400" />
                ) : (
                  <Loader2 className="w-4 h-4 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                )}
                <AlertDescription className="text-sm">
                  {dnsStatus.message}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedDomain}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Link Domain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
