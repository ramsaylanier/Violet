/**
 * Client-side projects API functions
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./client.js";
import type { Project, ProjectSettings } from "@/types";

export async function listProjects(): Promise<Project[]> {
  return apiGet<Project[]>("/projects");
}

export async function createProject(data: {
  name: string;
  description?: string;
  settings?: ProjectSettings;
  metadata?: { [key: string]: string };
}): Promise<Project> {
  return apiPost<Project>("/projects", data);
}

export async function getProject(projectId: string): Promise<Project> {
  return apiGet<Project>(`/projects/${projectId}`);
}

export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<Project> {
  return apiPut<Project>(`/projects/${projectId}`, updates);
}

export async function deleteProject(
  projectId: string
): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/projects/${projectId}`);
}
