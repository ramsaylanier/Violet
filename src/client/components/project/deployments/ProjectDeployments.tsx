import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Rocket, Plus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Dialog } from "@/client/components/ui/dialog";
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
import type { Project, Deployment } from "@/shared/types";
import { updateProject } from "@/client/api/projects";
import { CreateDeploymentDialog } from "@/client/components/deployment/CreateDeploymentDialog";
import { ProjectDeploymentCard } from "@/client/components/project/deployments/ProjectDeploymentCard";

interface ProjectDeploymentsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectDeployments({
  project,
  onUpdate
}: ProjectDeploymentsProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [deploymentToRemove, setDeploymentToRemove] =
    useState<Deployment | null>(null);

  const deployments = project.deployments || [];

  const handleRemoveClick = (deployment: Deployment) => {
    setDeploymentToRemove(deployment);
    setRemoveDialogOpen(true);
    setError(null);
  };

  const removeDeploymentMutation = useMutation({
    mutationFn: async (deploymentId: string) => {
      const updatedDeployments = deployments.filter(
        (d) => d.id !== deploymentId
      );
      return await updateProject(project.id, {
        deployments: updatedDeployments.length > 0 ? updatedDeployments : []
      });
    },
    onSuccess: (updatedProject) => {
      onUpdate(updatedProject);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setRemoveDialogOpen(false);
      setDeploymentToRemove(null);
    },
    onError: (err: any) => {
      console.error("Failed to remove deployment:", err);
      setError(err?.message || "Failed to remove deployment");
    }
  });

  const handleRemoveDeployment = () => {
    if (!deploymentToRemove) return;
    removeDeploymentMutation.mutate(deploymentToRemove.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Deployments</h3>
          <p className="text-sm text-muted-foreground">
            {project.type === "monorepo"
              ? "Manage deployments for this monorepo project"
              : "Manage deployments (one per repository)"}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Deployment
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <CreateDeploymentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          project={project}
          onSuccess={onUpdate}
        />
      </Dialog>

      {deployments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {deployments.map((deployment) => (
            <ProjectDeploymentCard
              key={deployment.id}
              deployment={deployment}
              projectId={project.id}
              project={project}
              onRemove={handleRemoveClick}
              onUpdate={onUpdate}
              isRemoving={removeDeploymentMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Rocket className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h4 className="text-sm font-medium">No deployments</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a deployment to get started
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Deployment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Deployment</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the deployment "{deploymentToRemove?.name}" from
              this project.
              {deploymentToRemove?.domain && (
                <>
                  {" "}
                  This deployment has a domain linked (
                  {deploymentToRemove.domain.zoneName}).
                </>
              )}
              {deploymentToRemove?.hosting &&
                deploymentToRemove.hosting.length > 0 && (
                  <>
                    {" "}
                    This deployment has {deploymentToRemove.hosting.length}{" "}
                    hosting configuration(s).
                  </>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveDialogOpen(false);
                setDeploymentToRemove(null);
                setError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDeployment}
              disabled={removeDeploymentMutation.isPending}
              variant="destructive"
            >
              {removeDeploymentMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
