import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Rocket,
  ExternalLink,
  Trash2,
  Github,
  Globe,
  Flame,
  MoreHorizontal
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/client/components/ui/dropdown-menu";
import type { Deployment, Project } from "@/shared/types";
import { LinkDomainDialog } from "../domains/LinkDomainDialog";
import { ManageDomainDialog } from "../domains/ManageDomainDialog";
import { ProjectHostingDialog } from "./ProjectHostingDialog";

interface ProjectDeploymentCardProps {
  deployment: Deployment;
  projectId: string;
  project: Project;
  onRemove: (deployment: Deployment) => void;
  onUpdate: (updatedProject: Project) => void;
  isRemoving?: boolean;
}

export function ProjectDeploymentCard({
  deployment,
  projectId,
  project,
  onRemove,
  onUpdate,
  isRemoving = false
}: ProjectDeploymentCardProps) {
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [manageDomainDialogOpen, setManageDomainDialogOpen] = useState(false);
  const [hostingDialogOpen, setHostingDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              <Link
                to="/projects/$projectId/deployments/$deploymentId"
                params={{
                  projectId,
                  deploymentId: deployment.id
                }}
                className="hover:underline"
              >
                {deployment.name}
              </Link>
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  to="/projects/$projectId/deployments/$deploymentId"
                  params={{
                    projectId,
                    deploymentId: deployment.id
                  }}
                >
                  View Details
                </Link>
              </DropdownMenuItem>
              {deployment.repository && (
                <DropdownMenuItem asChild>
                  <a
                    href={deployment.repository.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Repository
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {deployment.domain ? (
                <DropdownMenuItem
                  onClick={() => setManageDomainDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Manage Domain
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setDomainDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Add Domain
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setHostingDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Flame className="w-4 h-4" />
                {deployment.hosting && deployment.hosting.length > 0
                  ? "Manage Hosting"
                  : "Add Hosting"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRemove(deployment)}
                disabled={isRemoving}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {deployment.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {deployment.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Repository Section */}
        {deployment.repository && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Repository
            </div>
            <a
              href={deployment.repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Github className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate group-hover:underline">
                  {deployment.repository.fullName}
                </span>
              </div>
              <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 group-hover:text-foreground" />
            </a>
          </div>
        )}

        {/* Domain Section */}
        {deployment.domain && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Domain
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={`https://${deployment.domain.zoneName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono truncate hover:underline"
                >
                  {deployment.domain.zoneName}
                </a>
                <Badge variant="secondary" className="text-xs">
                  {deployment.domain.provider}
                </Badge>
                {deployment.domain.status && (
                  <Badge
                    variant={
                      deployment.domain.status === "ACTIVE" ||
                      deployment.domain.status === "connected"
                        ? "default"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {deployment.domain.status}
                  </Badge>
                )}
              </div>
              {deployment.domain.provider === "firebase" &&
                deployment.domain.siteId && (
                  <a
                    href={`https://${deployment.domain.zoneName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </a>
                )}
            </div>
          </div>
        )}

        {/* Hosting Section */}
        {deployment.hosting && deployment.hosting.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Hosting
            </div>
            <div className="space-y-2">
              {deployment.hosting.map((hosting) => (
                <div
                  key={hosting.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Flame className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {hosting.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {hosting.provider === "firebase-hosting"
                        ? "Firebase"
                        : hosting.provider === "cloudflare-pages"
                          ? "Cloudflare"
                          : hosting.provider}
                    </Badge>
                    {hosting.status && (
                      <Badge
                        variant={
                          hosting.status === "ACTIVE" ||
                          hosting.status === "connected" ||
                          hosting.status === "success"
                            ? "default"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {hosting.status}
                      </Badge>
                    )}
                  </div>
                  {hosting.url && (
                    <a
                      href={hosting.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 flex-shrink-0"
                    >
                      <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {!deployment.domain && (
        <LinkDomainDialog
          project={project}
          deployment={deployment}
          onUpdate={onUpdate}
          open={domainDialogOpen}
          onOpenChange={setDomainDialogOpen}
        />
      )}
      {deployment.domain && (
        <ManageDomainDialog
          project={project}
          deployment={deployment}
          onUpdate={onUpdate}
          open={manageDomainDialogOpen}
          onOpenChange={setManageDomainDialogOpen}
        />
      )}
      <ProjectHostingDialog
        project={project}
        deployment={deployment}
        onUpdate={onUpdate}
        open={hostingDialogOpen}
        onOpenChange={setHostingDialogOpen}
      />
    </Card>
  );
}
