import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Checkbox } from "@/client/components/ui/checkbox";
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
import { listGitHubRepositories } from "@/client/api/github";
import type { WizardState } from "./ProjectCreationWizard";

interface GitHubIntegrationSectionProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  isGitHubConnected: boolean;
  projectName: string;
}

export function GitHubIntegrationSection({
  wizardState,
  onUpdate,
  isGitHubConnected,
  projectName
}: GitHubIntegrationSectionProps) {
  console.log("wizardState", wizardState);
  const [githubComboboxOpen, setGithubComboboxOpen] = useState(false);
  const [selectedGithubRepo, setSelectedGithubRepo] = useState<string>("");

  // Sync selected repo with wizard state
  useEffect(() => {
    if (wizardState.linkedGithubRepo?.fullName) {
      setSelectedGithubRepo(wizardState.linkedGithubRepo.fullName);
    } else if (!wizardState.linkedGithubRepo) {
      setSelectedGithubRepo("");
    }
  }, [wizardState.linkedGithubRepo]);

  // Fetch GitHub repositories when "link existing" mode is selected
  const { data: availableGithubRepos = [], isLoading: loadingGithubRepos } =
    useQuery({
      queryKey: ["github-repositories"],
      queryFn: async () => {
        try {
          return await listGitHubRepositories();
        } catch (err: any) {
          console.error("Failed to load GitHub repositories:", err);
          return [];
        }
      },
      enabled: isGitHubConnected && wizardState.githubMode === "link",
      retry: 1
    });

  const handleModeChange = (mode: "create" | "link") => {
    if (mode === "link") {
      onUpdate({
        githubMode: "link",
        createGithubRepo: false,
        githubRepoName: "",
        githubRepoDescription: "",
        githubRepoPrivate: false,
        linkedGithubRepo: undefined
      });
      setSelectedGithubRepo("");
    } else {
      onUpdate({
        githubMode: "create",
        createGithubRepo: true,
        linkedGithubRepo: undefined
      });
      setSelectedGithubRepo("");
    }
  };

  const handleRepoSelect = (repoFullName: string) => {
    const newRepo = repoFullName === selectedGithubRepo ? "" : repoFullName;
    setSelectedGithubRepo(newRepo);
    const repo = availableGithubRepos.find((r) => r.full_name === newRepo);
    if (repo && newRepo) {
      const [owner, name] = newRepo.split("/");
      onUpdate({
        linkedGithubRepo: {
          owner,
          name,
          fullName: newRepo,
          url: repo.html_url
        }
      });
    } else {
      onUpdate({ linkedGithubRepo: undefined });
    }
    setGithubComboboxOpen(false);
  };

  return (
    <>
      {!isGitHubConnected ? (
        <Alert>
          <AlertDescription>
            GitHub account required.{" "}
            <a href="/settings" className="underline">
              Connect GitHub in settings
            </a>
          </AlertDescription>
        </Alert>
      ) : (
        <div>
          <div className="flex gap-2">
            <Button
              variant={
                wizardState.githubMode === "link" ? "default" : "outline"
              }
              onClick={() => handleModeChange("link")}
              className="flex-1"
            >
              Link Existing
            </Button>
            <Button
              variant={
                wizardState.githubMode === "create" ? "default" : "outline"
              }
              onClick={() => handleModeChange("create")}
              className="flex-1"
            >
              Create New
            </Button>
          </div>

          {wizardState.githubMode === "link" && (
            <div className="space-y-2">
              <Label>Select Repository</Label>
              {loadingGithubRepos ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Loading repositories...
                  </span>
                </div>
              ) : availableGithubRepos.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">
                  No repositories found.
                </div>
              ) : (
                <Popover
                  open={githubComboboxOpen}
                  onOpenChange={setGithubComboboxOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={githubComboboxOpen}
                      className="w-full justify-between"
                    >
                      {selectedGithubRepo
                        ? availableGithubRepos.find(
                            (r) => r.full_name === selectedGithubRepo
                          )?.full_name || "Select repository..."
                        : "Select repository..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search repositories..." />
                      <CommandList>
                        <CommandEmpty>No repositories found.</CommandEmpty>
                        <CommandGroup>
                          {availableGithubRepos.map((repo) => (
                            <CommandItem
                              key={repo.full_name}
                              value={repo.full_name}
                              onSelect={() => handleRepoSelect(repo.full_name)}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedGithubRepo === repo.full_name
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{repo.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {repo.full_name}
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

          {wizardState.githubMode === "create" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-repo-name">Repository Name</Label>
                <Input
                  id="github-repo-name"
                  value={wizardState.githubRepoName || ""}
                  onChange={(e) => onUpdate({ githubRepoName: e.target.value })}
                  placeholder={projectName.toLowerCase().replace(/\s+/g, "-")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="github-repo-description">
                  Repository Description
                </Label>
                <Input
                  id="github-repo-description"
                  value={wizardState.githubRepoDescription || ""}
                  onChange={(e) =>
                    onUpdate({ githubRepoDescription: e.target.value })
                  }
                  placeholder={`Repository for ${projectName}`}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="github-repo-private"
                  checked={wizardState.githubRepoPrivate}
                  onCheckedChange={(checked) =>
                    onUpdate({ githubRepoPrivate: checked === true })
                  }
                />
                <Label
                  htmlFor="github-repo-private"
                  className="text-sm font-normal cursor-pointer"
                >
                  Private repository
                </Label>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
