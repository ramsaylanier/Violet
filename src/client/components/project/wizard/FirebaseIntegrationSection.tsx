import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
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
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { useFirebaseProjects } from "@/client/hooks/useFirebaseProjects";
import {
  initiateGoogleOAuth,
  createGoogleCloudProject
} from "@/client/api/firebase";
import type { WizardState } from "./ProjectCreationWizard";

interface FirebaseIntegrationSectionProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  isGoogleConnected: boolean;
}

export function FirebaseIntegrationSection({
  wizardState,
  onUpdate,
  isGoogleConnected
}: FirebaseIntegrationSectionProps) {
  const [firebaseComboboxOpen, setFirebaseComboboxOpen] = useState(false);
  const [selectedFirebaseProject, setSelectedFirebaseProject] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newProjectDisplayName, setNewProjectDisplayName] = useState("");
  const queryClient = useQueryClient();

  // Sync selected project with wizard state
  useEffect(() => {
    if (wizardState.firebaseProjectId) {
      setSelectedFirebaseProject(wizardState.firebaseProjectId);
    } else {
      setSelectedFirebaseProject("");
    }
  }, [wizardState.firebaseProjectId]);

  // Fetch Firebase projects when "select existing" mode is selected
  const {
    data: availableFirebaseProjects = [],
    isLoading: loadingFirebaseProjects
  } = useFirebaseProjects(
    isGoogleConnected && wizardState.firebaseMode === "select",
    false
  );

  const handleConnectGoogle = async () => {
    try {
      const { url } = await initiateGoogleOAuth();
      window.location.href = url;
    } catch (err: any) {
      console.error("Failed to initiate Google OAuth:", err);
    }
  };

  // Mutation for creating a new Google Cloud project
  const createProjectMutation = useMutation({
    mutationFn: async (input: { projectId: string; displayName?: string }) => {
      return createGoogleCloudProject(input);
    },
    onSuccess: (project) => {
      // Update wizard state with created project
      onUpdate({
        firebaseProjectId: project.projectId
      });
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: ["firebase-projects"] });
    }
  });

  const handleModeChange = (mode: "select" | "create") => {
    if (mode === "select") {
      onUpdate({
        firebaseMode: "select",
        newFirebaseProjectName: undefined
      });
      setSelectedFirebaseProject("");
    } else {
      onUpdate({
        firebaseMode: "create",
        firebaseProjectId: undefined
      });
      setSelectedFirebaseProject("");
      setNewProjectId("");
      setNewProjectDisplayName("");
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const newProjectId = projectId === selectedFirebaseProject ? "" : projectId;
    setSelectedFirebaseProject(newProjectId);
    onUpdate({
      firebaseProjectId: newProjectId || undefined
    });
    setFirebaseComboboxOpen(false);
  };

  return (
    <>
      {!isGoogleConnected ? (
        <Alert>
          <AlertDescription>
            Google account required for Firebase integration.{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={handleConnectGoogle}
            >
              Connect Google Account
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex gap-2">
            <Button
              variant={
                wizardState.firebaseMode === "select" ? "default" : "outline"
              }
              onClick={() => handleModeChange("select")}
              className="flex-1"
            >
              Select Existing
            </Button>
            <Button
              variant={
                wizardState.firebaseMode === "create" ? "default" : "outline"
              }
              onClick={() => handleModeChange("create")}
              className="flex-1"
            >
              Create New
            </Button>
          </div>

          {wizardState.firebaseMode === "select" && (
            <div className="space-y-2">
              <Label>Firebase Project</Label>
              {loadingFirebaseProjects ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Loading projects...
                  </span>
                </div>
              ) : availableFirebaseProjects.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">
                  No Firebase projects found. Create one in the Firebase Console
                  first.
                </div>
              ) : (
                <Popover
                  open={firebaseComboboxOpen}
                  onOpenChange={setFirebaseComboboxOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={firebaseComboboxOpen}
                      className="w-full justify-between"
                    >
                      {selectedFirebaseProject
                        ? availableFirebaseProjects.find(
                            (p) => p.projectId === selectedFirebaseProject
                          )?.displayName ||
                          availableFirebaseProjects.find(
                            (p) => p.projectId === selectedFirebaseProject
                          )?.projectId ||
                          "Select project..."
                        : "Select Firebase project..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search projects..." />
                      <CommandList>
                        <CommandEmpty>No projects found.</CommandEmpty>
                        <CommandGroup>
                          {availableFirebaseProjects.map((proj) => (
                            <CommandItem
                              key={proj.projectId}
                              value={proj.projectId}
                              onSelect={() =>
                                handleProjectSelect(proj.projectId)
                              }
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedFirebaseProject === proj.projectId
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span>
                                  {proj.displayName || proj.projectId}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {proj.projectId}
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
          )}

          {wizardState.firebaseMode === "create" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firebase-project-id">
                  Project ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firebase-project-id"
                  placeholder="my-firebase-project"
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  disabled={createProjectMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Must be 6-30 characters, start with a letter, and contain only
                  lowercase letters, numbers, and hyphens.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firebase-project-display-name">
                  Display Name (optional)
                </Label>
                <Input
                  id="firebase-project-display-name"
                  placeholder="My Firebase Project"
                  value={newProjectDisplayName}
                  onChange={(e) => setNewProjectDisplayName(e.target.value)}
                  disabled={createProjectMutation.isPending}
                />
              </div>

              {createProjectMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {createProjectMutation.error instanceof Error
                      ? createProjectMutation.error.message
                      : "Failed to create project"}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => {
                  if (!newProjectId.trim()) return;
                  createProjectMutation.mutate({
                    projectId: newProjectId.trim(),
                    displayName: newProjectDisplayName.trim() || undefined
                  });
                }}
                disabled={
                  !newProjectId.trim() || createProjectMutation.isPending
                }
                className="w-full"
              >
                {createProjectMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating project...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
