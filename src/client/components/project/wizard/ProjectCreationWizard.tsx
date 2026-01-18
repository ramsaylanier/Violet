import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/client/components/ui/tabs";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { BasicInfoTab } from "./BasicInfoTab";
import { IntegrationsTab } from "./IntegrationsTab";
import { DomainsTab } from "./DomainsTab";
import { HostingTab } from "./HostingTab";

export interface WizardState {
  // Basic Info
  name: string;
  type: "monorepo" | "multi-service";
  description?: string;

  // Integrations
  githubMode?: "create" | "link" | null;
  createGithubRepo: boolean;
  githubRepoName?: string;
  githubRepoDescription?: string;
  githubRepoPrivate?: boolean;
  linkedGithubRepo?: {
    owner: string;
    name: string;
    fullName: string;
    url: string;
  };
  firebaseMode?: "select" | "create" | null;
  firebaseProjectId?: string;
  newFirebaseProjectName?: string;

  // Domains
  selectedDomains: Array<{ zoneId: string; zoneName: string }>;

  // Hosting
  enableFirebaseHosting: boolean;
  enableCloudflarePages: boolean;
  cloudflarePagesConfig?: {
    name?: string;
    branch?: string;
    linkExisting?: boolean;
    existingProjectName?: string;
  };
}

interface ProjectCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (wizardState: WizardState) => void;
}

export function ProjectCreationWizard({
  open,
  onOpenChange,
  onSuccess
}: ProjectCreationWizardProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [error, setError] = useState<string | null>(null);

  const [wizardState, setWizardState] = useState<WizardState>({
    name: "",
    type: "multi-service",
    description: "",
    githubMode: null,
    createGithubRepo: false,
    githubRepoName: "",
    githubRepoDescription: "",
    githubRepoPrivate: false,
    linkedGithubRepo: undefined,
    firebaseMode: null,
    firebaseProjectId: undefined,
    newFirebaseProjectName: undefined,
    selectedDomains: [],
    enableFirebaseHosting: false,
    enableCloudflarePages: false,
    cloudflarePagesConfig: {
      name: "",
      branch: "main",
      linkExisting: false,
      existingProjectName: ""
    }
  });

  // Reset wizard state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setWizardState({
        name: "",
        type: "multi-service",
        description: "",
        githubMode: null,
        createGithubRepo: false,
        githubRepoName: "",
        githubRepoDescription: "",
        githubRepoPrivate: false,
        linkedGithubRepo: undefined,
        firebaseMode: null,
        firebaseProjectId: undefined,
        newFirebaseProjectName: undefined,
        selectedDomains: [],
        enableFirebaseHosting: false,
        enableCloudflarePages: false,
        cloudflarePagesConfig: {
          name: "",
          branch: "main",
          linkExisting: false,
          existingProjectName: ""
        }
      });
      setActiveTab("basic");
      setError(null);
    } else {
      // Pre-fill GitHub repo name from project name
      if (wizardState.name && !wizardState.githubRepoName) {
        setWizardState((prev) => ({
          ...prev,
          githubRepoName: prev.name.toLowerCase().replace(/\s+/g, "-")
        }));
      }
    }
  }, [open]);

  // Disable Firebase Hosting if Firebase project is removed
  useEffect(() => {
    if (!wizardState.firebaseProjectId && wizardState.enableFirebaseHosting) {
      setWizardState((prev) => ({
        ...prev,
        enableFirebaseHosting: false
      }));
    }
  }, [wizardState.firebaseProjectId]);

  // Update GitHub repo name when project name changes
  useEffect(() => {
    if (
      wizardState.githubMode === "create" &&
      wizardState.createGithubRepo &&
      wizardState.name
    ) {
      setWizardState((prev) => ({
        ...prev,
        githubRepoName: prev.name.toLowerCase().replace(/\s+/g, "-")
      }));
    }
  }, [wizardState.name, wizardState.createGithubRepo, wizardState.githubMode]);

  const validateBasicInfo = (): boolean => {
    if (!wizardState.name.trim()) {
      setError("Project name is required");
      return false;
    }
    if (wizardState.name.trim().length < 2) {
      setError("Project name must be at least 2 characters");
      return false;
    }
    return true;
  };

  const validateIntegrations = (): boolean => {
    if (wizardState.githubMode === "create") {
      if (!wizardState.githubRepoName?.trim()) {
        setError("GitHub repository name is required");
        return false;
      }
      // Validate repo name format (alphanumeric, hyphens, underscores)
      if (!/^[a-zA-Z0-9_-]+$/.test(wizardState.githubRepoName)) {
        setError(
          "GitHub repository name can only contain letters, numbers, hyphens, and underscores"
        );
        return false;
      }
    } else if (wizardState.githubMode === "link") {
      if (!wizardState.linkedGithubRepo) {
        setError("Please select a GitHub repository to link");
        return false;
      }
    }
    if (wizardState.firebaseMode === "create") {
      if (!wizardState.firebaseProjectId?.trim()) {
        setError("Firebase project ID is required");
        return false;
      }
    }
    return true;
  };

  const validateHosting = (): boolean => {
    if (wizardState.enableCloudflarePages) {
      if (wizardState.cloudflarePagesConfig?.linkExisting) {
        if (!wizardState.cloudflarePagesConfig?.existingProjectName) {
          setError("Please select a Cloudflare Pages project to link");
          return false;
        }
      } else {
        if (!wizardState.cloudflarePagesConfig?.name?.trim()) {
          setError("Cloudflare Pages project name is required");
          return false;
        }
      }
    }
    return true;
  };

  const validateCurrentTab = (): boolean => {
    switch (activeTab) {
      case "basic":
        return validateBasicInfo();
      case "integrations":
        return validateIntegrations();
      case "hosting":
        return validateHosting();
      default:
        return true;
    }
  };

  const handleCreateProject = async () => {
    // Validate all tabs
    if (!validateBasicInfo()) {
      setActiveTab("basic");
      return;
    }
    if (!validateIntegrations()) {
      setActiveTab("integrations");
      return;
    }
    if (!validateHosting()) {
      setActiveTab("hosting");
      return;
    }

    setError(null);
    // Pass wizard state to parent for project creation
    // The parent will handle all the async operations and show progress
    onSuccess(wizardState);
  };

  const canCreateProject = wizardState.name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Configure your project settings, integrations, domains, and hosting
            all in one place
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            // Validate current tab before allowing navigation
            if (validateCurrentTab()) {
              setActiveTab(value);
              setError(null);
            }
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">
              Basic Info
              {wizardState.name.trim() && (
                <CheckCircle2 className="w-3 h-3 ml-1 text-green-600" />
              )}
            </TabsTrigger>
            <TabsTrigger value="integrations">
              Integrations
              {((wizardState.githubMode === "create" &&
                wizardState.createGithubRepo) ||
                (wizardState.githubMode === "link" &&
                  wizardState.linkedGithubRepo) ||
                wizardState.firebaseProjectId) && (
                <CheckCircle2 className="w-3 h-3 ml-1 text-green-600" />
              )}
            </TabsTrigger>
            <TabsTrigger value="domains">
              Domains
              {wizardState.selectedDomains.length > 0 && (
                <CheckCircle2 className="w-3 h-3 ml-1 text-green-600" />
              )}
            </TabsTrigger>
            <TabsTrigger value="hosting">
              Hosting
              {(wizardState.enableFirebaseHosting ||
                wizardState.enableCloudflarePages) && (
                <CheckCircle2 className="w-3 h-3 ml-1 text-green-600" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <BasicInfoTab
              wizardState={wizardState}
              onUpdate={(updates) =>
                setWizardState((prev) => ({ ...prev, ...updates }))
              }
            />
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-4 mt-4">
            <IntegrationsTab
              wizardState={wizardState}
              onUpdate={(updates) =>
                setWizardState((prev) => ({ ...prev, ...updates }))
              }
            />
          </TabsContent>

          {/* Domains Tab */}
          <TabsContent value="domains" className="space-y-4 mt-4">
            <DomainsTab
              wizardState={wizardState}
              onUpdate={(updates) =>
                setWizardState((prev) => ({ ...prev, ...updates }))
              }
              open={open}
            />
          </TabsContent>

          {/* Hosting Tab */}
          <TabsContent value="hosting" className="space-y-6 mt-4">
            <HostingTab
              wizardState={wizardState}
              onUpdate={(updates) =>
                setWizardState((prev) => ({ ...prev, ...updates }))
              }
              open={open}
            />
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateProject} disabled={!canCreateProject}>
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
