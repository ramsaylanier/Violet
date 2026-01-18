import { CheckCircle2, Github, Flame } from "lucide-react";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Label } from "@/client/components/ui/label";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { GitHubIntegrationSection } from "./GitHubIntegrationSection";
import { FirebaseIntegrationSection } from "./FirebaseIntegrationSection";
import type { WizardState } from "./ProjectCreationWizard";

interface IntegrationsTabProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
}

export function IntegrationsTab({
  wizardState,
  onUpdate
}: IntegrationsTabProps) {
  const { user } = useCurrentUser();
  const isGitHubConnected = !!user?.githubToken;
  const isGoogleConnected = !!user?.googleToken;

  return (
    <div className="space-y-6">
      {/* GitHub Integration */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="github-integration"
            checked={!!wizardState.githubMode}
            onCheckedChange={(checked) => {
              if (checked) {
                // Initialize with link mode when checked
                onUpdate({ githubMode: "link" });
              } else {
                onUpdate({
                  githubMode: null,
                  createGithubRepo: false,
                  githubRepoName: "",
                  githubRepoDescription: "",
                  githubRepoPrivate: false,
                  linkedGithubRepo: undefined
                });
              }
            }}
          />
          <Label
            htmlFor="github-integration"
            className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
          >
            <Github className="w-4 h-4" />
            <span>GitHub Integration</span>
            {wizardState.githubMode && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </Label>
        </div>

        {wizardState.githubMode && (
          <div className="pl-7">
            <GitHubIntegrationSection
              wizardState={wizardState}
              onUpdate={onUpdate}
              isGitHubConnected={isGitHubConnected}
              projectName={wizardState.name}
            />
          </div>
        )}
      </div>

      {/* Firebase Integration */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="firebase-integration"
            checked={!!wizardState.firebaseMode}
            onCheckedChange={(checked) => {
              if (checked) {
                // Initialize with select mode when checked
                onUpdate({ firebaseMode: "select" });
              } else {
                onUpdate({
                  firebaseMode: null,
                  firebaseProjectId: undefined,
                  newFirebaseProjectName: undefined
                });
              }
            }}
          />
          <Label
            htmlFor="firebase-integration"
            className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            <span>Firebase Integration</span>
            {wizardState.firebaseProjectId && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </Label>
        </div>

        {wizardState.firebaseMode && (
          <div className="pl-7">
            <FirebaseIntegrationSection
              wizardState={wizardState}
              onUpdate={onUpdate}
              isGoogleConnected={isGoogleConnected}
            />
          </div>
        )}
      </div>
    </div>
  );
}
