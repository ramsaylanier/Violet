import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/client/contexts/AuthContext";
import { ProjectCreationWizard } from "@/client/components/project/wizard/ProjectCreationWizard";
import { createProject, updateProject } from "@/client/api/projects";
import { createGitHubRepository } from "@/client/api/github";
import {
  setupFirebaseHosting,
  verifyFirebaseProject
} from "@/client/api/firebase";
import {
  getCloudflareAccountId,
  createCloudflarePagesProject
} from "@/client/api/cloudflare";
import type { Hosting, Deployment } from "@/shared/types";
import type { WizardState } from "@/client/components/project/wizard/ProjectCreationWizard";

export const Route = createFileRoute("/_app/projects/new")({
  component: NewProject
});

function NewProject() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      return project;
    }
  });

  if (!isAuthenticated) {
    return null;
  }

  const handleWizardSuccess = async (wizardState: WizardState) => {
    setWizardOpen(false); // Close wizard immediately to show progress
    setError(null);

    let githubRepo = null;
    const errors: string[] = [];
    let project: any = null;

    try {
      // Step 1: Handle GitHub repository (create new or use linked)
      if (wizardState.githubMode === "create" && wizardState.createGithubRepo) {
        try {
          githubRepo = await createGitHubRepository({
            name: wizardState.githubRepoName || wizardState.name,
            description:
              wizardState.githubRepoDescription ||
              `Repository for ${wizardState.name}`,
            private: wizardState.githubRepoPrivate || false
          });
        } catch (githubError: any) {
          console.error("Failed to create GitHub repository:", githubError);
          errors.push(
            `GitHub repository: ${githubError?.message || "Unknown error"}`
          );
        }
      }

      // Step 2: Create the project
      project = await createProjectMutation.mutateAsync({
        name: wizardState.name,
        type: wizardState.type,
        description: wizardState.description
      });

      // Step 3: Link Firebase project if configured
      if (wizardState.firebaseProjectId) {
        try {
          await verifyFirebaseProject(wizardState.firebaseProjectId);
          await updateProject(project.id, {
            firebaseProjectId: wizardState.firebaseProjectId
          });
        } catch (firebaseError: any) {
          console.error("Failed to link Firebase project:", firebaseError);
          errors.push(
            `Firebase project: ${firebaseError?.message || "Unknown error"}`
          );
        }
      }

      // Step 4: Setup hosting and create deployments
      // Use linked repo if available, otherwise use created repo
      const repoInfo =
        wizardState.linkedGithubRepo ||
        (githubRepo
          ? {
              owner: githubRepo.full_name.split("/")[0],
              name: githubRepo.full_name.split("/")[1],
              fullName: githubRepo.full_name,
              url: githubRepo.html_url
            }
          : undefined);

      const hosting: Hosting[] = [];

      // Setup Firebase Hosting
      if (wizardState.enableFirebaseHosting && wizardState.firebaseProjectId) {
        try {
          await setupFirebaseHosting({
            projectId: wizardState.firebaseProjectId
          });
          hosting.push({
            id: `fb-${wizardState.firebaseProjectId}`,
            provider: "firebase-hosting",
            name: wizardState.firebaseProjectId,
            url: `https://${wizardState.firebaseProjectId}.web.app`,
            status: "active",
            linkedAt: new Date()
          });
        } catch (hostingError: any) {
          console.error("Failed to setup Firebase Hosting:", hostingError);
          errors.push(
            `Firebase Hosting: ${hostingError?.message || "Unknown error"}`
          );
        }
      }

      // Setup Cloudflare Pages
      if (wizardState.enableCloudflarePages) {
        try {
          const { accountId } = await getCloudflareAccountId();
          let pagesProject;

          if (wizardState.cloudflarePagesConfig?.linkExisting) {
            // Link existing project - we'll just add it to hosting
            const existingName =
              wizardState.cloudflarePagesConfig.existingProjectName || "";
            hosting.push({
              id: `cf-${existingName}`,
              provider: "cloudflare-pages",
              name: existingName,
              status: "active",
              linkedAt: new Date()
            });
          } else {
            // Create new project
            pagesProject = await createCloudflarePagesProject({
              accountId,
              name:
                wizardState.cloudflarePagesConfig?.name ||
                wizardState.name.toLowerCase().replace(/\s+/g, "-"),
              production_branch:
                wizardState.cloudflarePagesConfig?.branch || "main"
            });
            hosting.push({
              id: `cf-${pagesProject.name}`,
              provider: "cloudflare-pages",
              name: pagesProject.name,
              url: pagesProject.subdomain
                ? `https://${pagesProject.subdomain}.pages.dev`
                : undefined,
              status: "idle",
              linkedAt: new Date()
            });
          }
        } catch (pagesError: any) {
          console.error("Failed to setup Cloudflare Pages:", pagesError);
          errors.push(
            `Cloudflare Pages: ${pagesError?.message || "Unknown error"}`
          );
        }
      }

      // Step 5: Create deployment(s) with all configurations
      const deployments: Deployment[] = [];

      if (wizardState.type === "multi-service" && repoInfo) {
        // For multi-service: create one deployment with repo, hosting, and domain
        const deploymentId = crypto.randomUUID();
        const domain =
          wizardState.selectedDomains.length > 0
            ? {
                zoneId: wizardState.selectedDomains[0].zoneId,
                zoneName: wizardState.selectedDomains[0].zoneName,
                provider: "cloudflare" as const,
                linkedAt: new Date()
              }
            : undefined;

        deployments.push({
          id: deploymentId,
          name: wizardState.name,
          repository: repoInfo,
          domain,
          hosting: hosting.length > 0 ? hosting : undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else if (wizardState.type === "monorepo" && repoInfo) {
        // For monorepo: just add repository, deployments created later
        // But we can still create a default deployment if hosting/domains are configured
        if (hosting.length > 0 || wizardState.selectedDomains.length > 0) {
          const deploymentId = crypto.randomUUID();
          const domain =
            wizardState.selectedDomains.length > 0
              ? {
                  zoneId: wizardState.selectedDomains[0].zoneId,
                  zoneName: wizardState.selectedDomains[0].zoneName,
                  provider: "cloudflare" as const,
                  linkedAt: new Date()
                }
              : undefined;

          deployments.push({
            id: deploymentId,
            name: wizardState.name,
            repository: repoInfo,
            domain,
            hosting: hosting.length > 0 ? hosting : undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      // Update project with deployments
      if (deployments.length > 0) {
        await updateProject(project.id, {
          deployments
        });
      } else if (repoInfo && wizardState.type === "monorepo") {
        // For monorepo without deployments, just add repository
        await updateProject(project.id, {
          repositories: [repoInfo]
        });
      }

      // Show errors if any, but still navigate to project
      if (errors.length > 0) {
        setError(
          `Project created successfully, but some features failed to configure: ${errors.join(", ")}`
        );
        // Still navigate after a short delay
        setTimeout(() => {
          navigate({
            to: "/projects/$projectId",
            params: { projectId: project.id }
          });
        }, 2000);
      } else {
        // Navigate to the newly created project
        navigate({
          to: "/projects/$projectId",
          params: { projectId: project.id }
        });
      }
    } catch (err: any) {
      console.error("Failed to create project:", err);
      setError(err?.message || "Failed to create project. Please try again.");
      setWizardOpen(true); // Reopen wizard on error so user can retry
      // TODO: Implement rollback logic if needed
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground mt-2">
          Use the wizard to configure your project with integrations, domains,
          and hosting
        </p>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          {error}
        </div>
      )}

      <ProjectCreationWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) {
            navigate({ to: "/projects" });
          }
        }}
        onSuccess={handleWizardSuccess}
      />
    </div>
  );
}
