/**
 * Client-side Firebase API functions
 */

import { apiGet, apiPost } from "./client.js";
import type { FirebaseProject } from "@/types";

/**
 * Verify that a Firebase project ID is valid
 */
export async function verifyFirebaseProject(
  projectId: string
): Promise<{ valid: boolean; projectId: string }> {
  return apiPost<{ valid: boolean; projectId: string }>(
    `/firebase/projects/${encodeURIComponent(projectId)}/verify`
  );
}

/**
 * Get Firebase project metadata
 */
export async function getFirebaseProject(
  projectId: string
): Promise<FirebaseProject> {
  return apiGet<FirebaseProject>(
    `/firebase/projects/${encodeURIComponent(projectId)}`
  );
}

/**
 * Initiate Google OAuth flow for Firebase Management API
 */
export async function initiateGoogleOAuth(): Promise<{ url: string }> {
  return apiGet<{ url: string }>("/firebase/oauth/authorize");
}

/**
 * Disconnect Google account
 */
export async function disconnectGoogle(): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>("/firebase/oauth/disconnect");
}

/**
 * List Firebase projects for the authenticated user
 */
export async function listFirebaseProjects(): Promise<FirebaseProject[]> {
  return apiGet<FirebaseProject[]>("/firebase/projects");
}
