import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronsUpDown,
  Check,
  Link as LinkIcon
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/client/components/ui/input";
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
import type { Project } from "@/shared/types";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import {
  verifyFirebaseProject,
  listFirebaseProjects,
  initiateGoogleOAuth
} from "@/client/api/firebase";
import { updateProject } from "@/client/api/projects";

interface ProjectIntegrationsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectIntegrations({
  project,
  onUpdate
}: ProjectIntegrationsProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [firebaseProjectId, setFirebaseProjectId] = useState("");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"select" | "manual">("select");
  const { user } = useCurrentUser();

  const hasFirebaseProject = !!project.firebaseProjectId;
  const isGoogleConnected = !!user?.googleToken;

  // Fetch Firebase projects using useQuery
  const {
    data: availableProjects = [],
    isLoading: loadingProjects,
    error: projectsError
  } = useQuery({
    queryKey: ["firebase-projects"],
    queryFn: async () => {
      try {
        return await listFirebaseProjects();
      } catch (err: any) {
        if (
          err?.message?.includes("Google account not connected") ||
          err?.message?.includes("needsAuth")
        ) {
          throw new Error("needsAuth");
        }
        throw err;
      }
    },
    enabled: dialogOpen && dialogMode === "select" && isGoogleConnected,
    retry: 1
  });

  const needsAuth =
    projectsError instanceof Error && projectsError.message === "needsAuth";

  // Update error state when query error changes
  useEffect(() => {
    if (projectsError && !needsAuth) {
      const errorMessage =
        projectsError instanceof Error
          ? projectsError.message
          : "Failed to load Firebase projects";
      setError(errorMessage);
    } else if (!projectsError) {
      setError(null);
    }
  }, [projectsError, needsAuth]);

  const handleConnectGoogle = async () => {
    try {
      const { url } = await initiateGoogleOAuth();
      window.location.href = url;
    } catch (err: any) {
      console.error("Failed to initiate Google OAuth:", err);
      setError(err?.message || "Failed to connect Google account");
    }
  };

  const addFirebaseProjectMutation = useMutation({
    mutationFn: async (projectIdToAdd: string) => {
      // Verify the Firebase project ID
      await verifyFirebaseProject(projectIdToAdd);
      // Update the project with the Firebase project ID
      return await updateProject(project.id, {
        firebaseProjectId: projectIdToAdd
      });
    },
    onSuccess: (updatedProject) => {
      onUpdate(updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setDialogOpen(false);
      setFirebaseProjectId("");
      setSelectedProject("");
      setComboboxOpen(false);
    },
    onError: (err: any) => {
      console.error("Failed to add Firebase project:", err);
      setError(
        err?.message ||
          "Failed to add Firebase project. Please check the project ID."
      );
    }
  });

  const handleAddFirebaseProject = () => {
    let projectIdToAdd: string;

    if (dialogMode === "select") {
      if (!selectedProject) {
        setError("Please select a Firebase project");
        return;
      }
      projectIdToAdd = selectedProject;
    } else {
      if (!firebaseProjectId.trim()) {
        setError("Firebase project ID is required");
        return;
      }
      projectIdToAdd = firebaseProjectId.trim();
    }

    setError(null);
    addFirebaseProjectMutation.mutate(projectIdToAdd);
  };

  const handleRemoveClick = () => {
    setRemoveDialogOpen(true);
    setError(null);
  };

  const removeFirebaseProjectMutation = useMutation({
    mutationFn: async () => {
      return await updateProject(project.id, {
        firebaseProjectId: null as any
      });
    },
    onSuccess: (updatedProject) => {
      onUpdate(updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setRemoveDialogOpen(false);
    },
    onError: (err: any) => {
      console.error("Failed to remove Firebase project:", err);
      setError(err?.message || "Failed to remove Firebase project");
    }
  });

  const handleRemoveFirebaseProject = () => {
    setError(null);
    removeFirebaseProjectMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5" />
                Firebase Integration
              </CardTitle>
              <CardDescription>
                Link a Firebase project to this Violet project
              </CardDescription>
            </div>
            {!hasFirebaseProject &&
              (isGoogleConnected ? (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Firebase Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Firebase Project</DialogTitle>
                      <DialogDescription>
                        Select from your Firebase projects or enter a project ID
                        manually
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant={
                            dialogMode === "select" ? "default" : "outline"
                          }
                          onClick={() => {
                            setDialogMode("select");
                            setError(null);
                            // Query will automatically refetch when enabled
                          }}
                          className="flex-1"
                        >
                          Select from List
                        </Button>
                        <Button
                          variant={
                            dialogMode === "manual" ? "default" : "outline"
                          }
                          onClick={() => {
                            setDialogMode("manual");
                            setError(null);
                          }}
                          className="flex-1"
                        >
                          Enter Manually
                        </Button>
                      </div>

                      {dialogMode === "select" ? (
                        <div className="space-y-2">
                          <Label>Firebase Project</Label>
                          {needsAuth ? (
                            <div className="space-y-4 py-4">
                              <div className="text-sm text-muted-foreground">
                                Connect your Google account to view your
                                Firebase projects
                              </div>
                              <Button
                                onClick={handleConnectGoogle}
                                className="w-full"
                              >
                                <LinkIcon className="w-4 h-4 mr-2" />
                                Connect Google Account
                              </Button>
                            </div>
                          ) : loadingProjects ? (
                            <div className="flex items-center gap-2 py-4">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm text-muted-foreground">
                                Loading projects...
                              </span>
                            </div>
                          ) : availableProjects.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-4">
                              No Firebase projects found. Make sure you have
                              Firebase projects in your Google account.
                            </div>
                          ) : (
                            <Popover
                              open={comboboxOpen}
                              onOpenChange={setComboboxOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={comboboxOpen}
                                  className="w-full justify-between"
                                >
                                  {selectedProject
                                    ? availableProjects.find(
                                        (p) => p.projectId === selectedProject
                                      )?.displayName ||
                                      availableProjects.find(
                                        (p) => p.projectId === selectedProject
                                      )?.projectId ||
                                      "Select project..."
                                    : "Select project..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput placeholder="Search projects..." />
                                  <CommandList>
                                    <CommandEmpty>
                                      No projects found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {availableProjects.map((proj) => (
                                        <CommandItem
                                          key={proj.projectId}
                                          value={proj.projectId}
                                          onSelect={() => {
                                            setSelectedProject(
                                              proj.projectId === selectedProject
                                                ? ""
                                                : proj.projectId
                                            );
                                            setComboboxOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              selectedProject === proj.projectId
                                                ? "opacity-100"
                                                : "opacity-0"
                                            }`}
                                          />
                                          <div className="flex flex-col">
                                            <span>
                                              {proj.displayName ||
                                                proj.projectId}
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
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="firebase-project-id">
                            Firebase Project ID
                          </Label>
                          <Input
                            id="firebase-project-id"
                            placeholder="my-firebase-project"
                            value={firebaseProjectId}
                            onChange={(e) => {
                              setFirebaseProjectId(e.target.value);
                              setError(null);
                            }}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                !addFirebaseProjectMutation.isPending
                              ) {
                                handleAddFirebaseProject();
                              }
                            }}
                            disabled={addFirebaseProjectMutation.isPending}
                          />
                          <p className="text-xs text-muted-foreground">
                            The project ID can be found in your Firebase Console
                          </p>
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
                          setFirebaseProjectId("");
                          setSelectedProject("");
                          setComboboxOpen(false);
                          setError(null);
                        }}
                        disabled={addFirebaseProjectMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddFirebaseProject}
                        disabled={
                          addFirebaseProjectMutation.isPending ||
                          (dialogMode === "select" && !selectedProject) ||
                          (dialogMode === "manual" &&
                            !firebaseProjectId.trim()) ||
                          (dialogMode === "select" && needsAuth)
                        }
                      >
                        {addFirebaseProjectMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Project"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button disabled>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Firebase Project
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-2">
                      <p>Google account required to add Firebase projects.</p>
                      <Link
                        to="/settings"
                        className="underline font-medium text-background hover:text-background/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Connect Google in settings
                      </Link>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          {hasFirebaseProject ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Firebase Project ID
                  </div>
                  <div className="text-sm font-mono mt-1">
                    {project.firebaseProjectId}
                  </div>
                </div>
                <div>
                  <a
                    href={`https://console.firebase.google.com/project/${project.firebaseProjectId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    View in Firebase Console
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <AlertDialog
                open={removeDialogOpen}
                onOpenChange={setRemoveDialogOpen}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Firebase Project</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove the Firebase project
                      integration? This will unlink the Firebase project from
                      this Violet project, but will not delete the Firebase
                      project itself.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {error && (
                    <div className="text-sm text-destructive">{error}</div>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      disabled={removeFirebaseProjectMutation.isPending}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemoveFirebaseProject}
                      disabled={removeFirebaseProjectMutation.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {removeFirebaseProjectMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        "Remove"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                onClick={handleRemoveClick}
                disabled={removeFirebaseProjectMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Firebase Project
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Flame className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No Firebase project linked</p>
              <p className="text-sm mt-1">
                Link a Firebase project to enable Firebase integration features
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
