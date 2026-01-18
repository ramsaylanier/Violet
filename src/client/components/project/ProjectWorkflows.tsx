import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  GitBranch,
  User
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/client/components/ui/collapsible";
import { Badge } from "@/client/components/ui/badge";
import { Label } from "@/client/components/ui/label";
import { Input } from "@/client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/client/components/ui/select";
import { Checkbox } from "@/client/components/ui/checkbox";
import type {
  GitHubWorkflow,
  GitHubWorkflowInput,
  GitHubWorkflowRun
} from "@/shared/types";
import {
  getGitHubWorkflowDefinition,
  dispatchGitHubWorkflow
} from "@/client/api/github";
import { useCurrentUser } from "@/client/hooks/useCurrentUser";
import { useGitHubWorkflows } from "@/client/hooks/useGitHubWorkflows";
import { useGitHubWorkflowRuns } from "@/client/hooks/useGitHubWorkflowRuns";
import { useGitHubBranches } from "@/client/hooks/useGitHubBranches";

interface ProjectWorkflowsProps {
  owner: string;
  repo: string;
  repoUrl: string;
}

interface WorkflowItemProps {
  workflow: GitHubWorkflow;
  owner: string;
  repo: string;
  repoUrl: string;
  onRun: (workflow: GitHubWorkflow) => void;
}

function WorkflowItem({
  workflow,
  owner,
  repo,
  repoUrl,
  onRun
}: WorkflowItemProps) {
  const { user } = useCurrentUser();
  const [runsOpen, setRunsOpen] = useState(false);
  const isGitHubConnected = !!user?.githubToken;

  const runsQuery = useGitHubWorkflowRuns(
    owner,
    repo,
    workflow.id,
    isGitHubConnected && runsOpen
  );

  const runs = runsQuery.data || [];
  const latestRun = runs[0];

  const getStatusBadge = (run: GitHubWorkflowRun) => {
    if (run.status === "queued" || run.status === "in_progress") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {run.status === "queued" ? "Queued" : "Running"}
        </Badge>
      );
    }

    if (run.conclusion === "success") {
      return (
        <Badge variant="default" className="bg-green-600 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Success
        </Badge>
      );
    }

    if (run.conclusion === "failure") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" />
          Failed
        </Badge>
      );
    }

    if (run.conclusion === "cancelled") {
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="w-3 h-3" />
          Cancelled
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1">
        <AlertCircle className="w-3 h-3" />
        {run.conclusion || "Unknown"}
      </Badge>
    );
  };

  const formatDuration = (startedAt?: string, updatedAt?: string) => {
    if (!startedAt || !updatedAt) return "";
    const start = new Date(startedAt).getTime();
    const end = new Date(updatedAt).getTime();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className="p-3 bg-muted rounded-md space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{workflow.name}</span>
          <Badge
            variant={workflow.state === "active" ? "default" : "secondary"}
            className="text-xs"
          >
            {workflow.state}
          </Badge>
          {latestRun && getStatusBadge(latestRun)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRun(workflow)}
            disabled={workflow.state !== "active"}
          >
            <Play className="w-3 h-3 mr-1" />
            Run
          </Button>
          <a
            href={workflow.html_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="sm" asChild>
              <span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </Button>
          </a>
        </div>
      </div>

      {latestRun && (
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(latestRun.created_at).toLocaleString()}
          </span>
          {latestRun.run_started_at && (
            <span>
              Duration:{" "}
              {formatDuration(latestRun.run_started_at, latestRun.updated_at)}
            </span>
          )}
        </div>
      )}

      <Collapsible open={runsOpen} onOpenChange={setRunsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <span className="text-xs text-muted-foreground">
              {runsOpen ? "Hide" : "Show"} run history
            </span>
            {runsOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {runsQuery?.isLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs text-muted-foreground">
                Loading runs...
              </span>
            </div>
          ) : runs.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">
              No runs yet
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="p-2 bg-background rounded border text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(run)}
                      <span className="text-muted-foreground">
                        #{run.run_number}
                      </span>
                    </div>
                    {run.html_url && (
                      <a
                        href={run.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {run.head_branch}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {run.actor.login}
                    </span>
                    <span>{run.event}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(run.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
              <a
                href={`${repoUrl}/actions`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                View all runs
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function ProjectWorkflows({
  owner,
  repo,
  repoUrl
}: ProjectWorkflowsProps) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [workflowsOpen, setWorkflowsOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<
    (GitHubWorkflow & { inputs?: GitHubWorkflowInput[] }) | null
  >(null);
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, string>>(
    {}
  );
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGitHubConnected = !!user?.githubToken;

  // Fetch workflows
  const {
    data: workflows = [],
    isLoading: loadingWorkflows,
    error: workflowsError
  } = useGitHubWorkflows(owner, repo, isGitHubConnected && workflowsOpen);

  // Fetch branches for branch selector
  const { data: branches = [] } = useGitHubBranches(
    owner,
    repo,
    isGitHubConnected && runDialogOpen
  );

  // Fetch workflow runs for each workflow
  // We'll fetch runs individually when needed instead of using hooks in a map

  const handleRunWorkflow = async (workflow: GitHubWorkflow) => {
    try {
      setError(null);
      // Fetch workflow definition with inputs
      const workflowWithInputs = await getGitHubWorkflowDefinition(
        owner,
        repo,
        workflow.id.toString()
      );
      setSelectedWorkflow(workflowWithInputs);

      // Set default branch (first branch or 'main')
      if (branches.length > 0) {
        setSelectedBranch(branches[0].name);
      } else {
        setSelectedBranch("main");
      }

      // Initialize inputs with defaults
      const initialInputs: Record<string, string> = {};
      if (workflowWithInputs.inputs) {
        for (const input of workflowWithInputs.inputs) {
          if (input.default !== undefined) {
            initialInputs[input.name] = input.default;
          }
        }
      }
      setWorkflowInputs(initialInputs);
      setRunDialogOpen(true);
    } catch (err: any) {
      console.error("Failed to load workflow definition:", err);
      setError(err?.message || "Failed to load workflow definition");
    }
  };

  const handleDispatchWorkflow = async () => {
    if (!selectedWorkflow || !selectedBranch) {
      setError("Branch is required");
      return;
    }

    // Validate required inputs
    if (selectedWorkflow.inputs) {
      for (const input of selectedWorkflow.inputs) {
        if (input.required && !workflowInputs[input.name]) {
          setError(`${input.name} is required`);
          return;
        }
      }
    }

    try {
      setDispatching(true);
      setError(null);
      await dispatchGitHubWorkflow(
        owner,
        repo,
        selectedWorkflow.id.toString(),
        {
          ref: selectedBranch,
          inputs: workflowInputs
        }
      );

      // Invalidate and refetch workflow runs
      queryClient.invalidateQueries({
        queryKey: ["github-workflow-runs", owner, repo]
      });

      setRunDialogOpen(false);
      setSelectedWorkflow(null);
      setWorkflowInputs({});
      setSelectedBranch("");
    } catch (err: any) {
      console.error("Failed to dispatch workflow:", err);
      setError(err?.message || "Failed to dispatch workflow");
    } finally {
      setDispatching(false);
    }
  };

  if (!isGitHubConnected) {
    return null;
  }

  return (
    <>
      <Collapsible open={workflowsOpen} onOpenChange={setWorkflowsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              {workflowsOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Workflows</span>
              {workflows.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {workflows.length}
                </Badge>
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {loadingWorkflows ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading workflows...
              </span>
            </div>
          ) : workflowsError ? (
            <div className="text-sm text-destructive py-2">
              Failed to load workflows
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              No workflows found
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <WorkflowItem
                  key={workflow.id}
                  workflow={workflow}
                  owner={owner}
                  repo={repo}
                  repoUrl={repoUrl}
                  onRun={handleRunWorkflow}
                />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Run Workflow Dialog */}
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Run Workflow: {selectedWorkflow?.name}</DialogTitle>
            <DialogDescription>
              Trigger this workflow manually with custom inputs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger id="branch" className="mt-2">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.name} value={branch.name}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedWorkflow?.inputs && selectedWorkflow.inputs.length > 0 && (
              <div className="space-y-4">
                <Label>Workflow Inputs</Label>
                {selectedWorkflow.inputs.map((input) => (
                  <div key={input.name} className="space-y-2">
                    <Label htmlFor={input.name}>
                      {input.name}
                      {input.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    {input.description && (
                      <p className="text-xs text-muted-foreground">
                        {input.description}
                      </p>
                    )}
                    {input.type === "choice" && input.options ? (
                      <Select
                        value={
                          workflowInputs[input.name] || input.default || ""
                        }
                        onValueChange={(value) =>
                          setWorkflowInputs((prev) => ({
                            ...prev,
                            [input.name]: value
                          }))
                        }
                      >
                        <SelectTrigger id={input.name} className="mt-1">
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          {input.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : input.type === "boolean" ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <Checkbox
                          id={input.name}
                          checked={workflowInputs[input.name] === "true"}
                          onCheckedChange={(checked) =>
                            setWorkflowInputs((prev) => ({
                              ...prev,
                              [input.name]: checked ? "true" : "false"
                            }))
                          }
                        />
                        <Label
                          htmlFor={input.name}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {input.default === "true" ? "Enabled" : "Disabled"}
                        </Label>
                      </div>
                    ) : (
                      <Input
                        id={input.name}
                        value={
                          workflowInputs[input.name] || input.default || ""
                        }
                        onChange={(e) =>
                          setWorkflowInputs((prev) => ({
                            ...prev,
                            [input.name]: e.target.value
                          }))
                        }
                        placeholder={input.description}
                        className="mt-1"
                        required={input.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRunDialogOpen(false);
                setSelectedWorkflow(null);
                setWorkflowInputs({});
                setSelectedBranch("");
                setError(null);
              }}
              disabled={dispatching}
            >
              Cancel
            </Button>
            <Button onClick={handleDispatchWorkflow} disabled={dispatching}>
              {dispatching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Workflow
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
