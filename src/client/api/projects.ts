/**
 * Client-side projects API functions
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./client.js";
import type { Project, ProjectSettings } from "@/shared/types";

export async function listProjects(): Promise<Project[]> {
  return apiGet<Project[]>("/projects");
}

export async function createProject(data: {
  name: string;
  description?: string;
  type?: "monorepo" | "multi-service";
  settings?: ProjectSettings;
  metadata?: { [key: string]: string };
}): Promise<Project> {
  return apiPost<Project>("/projects", data);
}

export async function getProject(projectId: string): Promise<Project> {
  return apiGet<Project>(`/projects/${projectId}`);
}

/**
 * Update project input - includes legacy fields for backward compatibility with server
 */
export type UpdateProjectInput = Partial<Project> & {
  // Legacy fields still supported by server for backward compatibility
  repositories?: Array<{
    owner: string;
    name: string;
    fullName: string;
    url: string;
  }>;
  hosting?: Array<{
    id: string;
    provider: "cloudflare-pages" | "firebase-hosting";
    name: string;
    url?: string;
    status?: string;
    linkedAt: Date | string;
  }>;
};

export async function updateProject(
  projectId: string,
  updates: UpdateProjectInput
): Promise<Project> {
  return apiPut<Project>(`/projects/${projectId}`, updates);
}

export async function deleteProject(
  projectId: string
): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/projects/${projectId}`);
}
