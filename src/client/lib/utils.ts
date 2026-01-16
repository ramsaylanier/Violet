import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Project, Deployment, Hosting } from "@/shared/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract all unique repositories from project deployments
 */
export function getProjectRepositories(project: Project): Array<{
  owner: string;
  name: string;
  fullName: string;
  url: string;
}> {
  const deployments = project.deployments || [];
  const repoMap = new Map<string, NonNullable<Deployment["repository"]>>();
  
  for (const deployment of deployments) {
    if (deployment.repository) {
      repoMap.set(deployment.repository.fullName, deployment.repository);
    }
  }
  
  return Array.from(repoMap.values());
}

/**
 * Extract all domains from project deployments (legacy support)
 */
export function getProjectDomains(project: Project) {
  const deployments = project.deployments || [];
  const domains: Array<{
    zoneId?: string;
    zoneName: string;
    provider: "cloudflare" | "firebase";
    linkedAt: Date;
    siteId?: string;
    status?: string;
  }> = [];
  
  for (const deployment of deployments) {
    if (deployment.domains) {
      domains.push(...deployment.domains);
    }
  }
  
  return domains;
}

/**
 * Extract all hosting from project deployments (legacy support)
 */
export function getProjectHosting(project: Project): Hosting[] {
  const deployments = project.deployments || [];
  const hosting: Hosting[] = [];
  
  for (const deployment of deployments) {
    if (deployment.hosting) {
      hosting.push(...deployment.hosting);
    }
  }
  
  return hosting;
}
