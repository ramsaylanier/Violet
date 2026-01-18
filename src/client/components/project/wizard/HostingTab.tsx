import { Flame, Globe } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Checkbox } from "@/client/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/client/components/ui/select";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { useCloudflareAccountId } from "@/client/hooks/useCloudflareAccountId";
import { useCloudflarePagesProjects } from "@/client/hooks/useCloudflarePagesProjects";
import type { WizardState } from "./ProjectCreationWizard";

interface HostingTabProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  open: boolean;
}

export function HostingTab({ wizardState, onUpdate, open }: HostingTabProps) {
  const { user } = useCurrentUser();
  const isCloudflareConnected = !!user?.cloudflareToken;

  // Fetch Cloudflare account ID
  const { data: cloudflareAccountId } = useCloudflareAccountId(
    open && wizardState.enableCloudflarePages && isCloudflareConnected
  );

  // Fetch Cloudflare Pages projects
  const { data: availablePagesProjects = [] } = useCloudflarePagesProjects(
    cloudflareAccountId,
    !!cloudflareAccountId &&
      open &&
      wizardState.enableCloudflarePages &&
      wizardState.cloudflarePagesConfig?.linkExisting &&
      isCloudflareConnected
  );

  return (
    <div className="space-y-6">
      {/* Firebase Hosting */}
      {wizardState.firebaseProjectId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Firebase Hosting
              </h3>
              <p className="text-xs text-muted-foreground">
                Enable Firebase Hosting for your project
              </p>
            </div>
            <Checkbox
              checked={wizardState.enableFirebaseHosting}
              onCheckedChange={(checked) =>
                onUpdate({ enableFirebaseHosting: checked === true })
              }
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Firebase Hosting
              </h3>
              <p className="text-xs text-muted-foreground">
                Link a Firebase project in the Integrations tab to enable
                Firebase Hosting
              </p>
            </div>
            <Checkbox checked={false} disabled />
          </div>
          {wizardState.enableFirebaseHosting && (
            <Alert>
              <AlertDescription>
                Firebase Hosting requires a Firebase project. Please link one in
                the Integrations tab.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Cloudflare Pages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Cloudflare Pages
            </h3>
            <p className="text-xs text-muted-foreground">
              Create or link a Cloudflare Pages project
            </p>
          </div>
          <Checkbox
            checked={wizardState.enableCloudflarePages}
            onCheckedChange={(checked) =>
              onUpdate({ enableCloudflarePages: checked === true })
            }
            disabled={!isCloudflareConnected}
          />
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
        ) : wizardState.enableCloudflarePages ? (
          <div className="space-y-4 pl-6 border-l-2">
            <div className="flex gap-2">
              <Button
                variant={
                  !wizardState.cloudflarePagesConfig?.linkExisting
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  onUpdate({
                    cloudflarePagesConfig: {
                      ...wizardState.cloudflarePagesConfig,
                      linkExisting: false,
                      existingProjectName: ""
                    }
                  })
                }
                className="flex-1"
              >
                Create New
              </Button>
              <Button
                variant={
                  wizardState.cloudflarePagesConfig?.linkExisting
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  onUpdate({
                    cloudflarePagesConfig: {
                      ...wizardState.cloudflarePagesConfig,
                      linkExisting: true,
                      name: ""
                    }
                  })
                }
                className="flex-1"
              >
                Link Existing
              </Button>
            </div>

            {wizardState.cloudflarePagesConfig?.linkExisting ? (
              <div className="space-y-2">
                <Label>Cloudflare Pages Project</Label>
                {availablePagesProjects.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No Pages projects found. Create a new one instead.
                  </div>
                ) : (
                  <Select
                    value={
                      wizardState.cloudflarePagesConfig?.existingProjectName ||
                      ""
                    }
                    onValueChange={(value) =>
                      onUpdate({
                        cloudflarePagesConfig: {
                          ...wizardState.cloudflarePagesConfig,
                          existingProjectName: value
                        }
                      })
                    }
                  >
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label htmlFor="pages-project-name">Project Name</Label>
                  <Input
                    id="pages-project-name"
                    value={wizardState.cloudflarePagesConfig?.name || ""}
                    onChange={(e) =>
                      onUpdate({
                        cloudflarePagesConfig: {
                          ...wizardState.cloudflarePagesConfig,
                          name: e.target.value
                        }
                      })
                    }
                    placeholder="my-project"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pages-project-branch">
                    Production Branch (optional)
                  </Label>
                  <Input
                    id="pages-project-branch"
                    value={wizardState.cloudflarePagesConfig?.branch || "main"}
                    onChange={(e) =>
                      onUpdate({
                        cloudflarePagesConfig: {
                          ...wizardState.cloudflarePagesConfig,
                          branch: e.target.value
                        }
                      })
                    }
                    placeholder="main"
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
