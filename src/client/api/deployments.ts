/**
 * Client-side deployments API functions
 */

import { apiPost } from "./client.js";
import type { DeploymentStatus } from "@/shared/types";

export async function deployDeployment(
  projectId: string,
  deploymentId: string,
  options: {
    branch: string;
    hostingProviderIds: string[];
  }
): Promise<DeploymentStatus> {
  return apiPost<DeploymentStatus>(
    `/deployments/${encodeURIComponent(projectId)}/${encodeURIComponent(deploymentId)}/deploy`,
    options
  );
}
