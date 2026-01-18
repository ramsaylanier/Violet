/**
 * Client-side Firebase API functions
 */

import { apiGet, apiPost } from "./client.js";
import type { FirebaseProject } from "@/shared/types";

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

/**
 * Create a new Google Cloud project and add Firebase to it
 */
export async function createGoogleCloudProject(input: {
  projectId: string;
  displayName?: string;
}): Promise<FirebaseProject> {
  return apiPost<FirebaseProject>("/firebase/projects", input);
}

/**
 * Initialize Firestore database
 */
export async function initializeFirestoreDB(input: {
  projectId: string;
  databaseId?: string;
  location?: string;
}): Promise<unknown> {
  return apiPost("/firebase/initialize-firestore", input);
}

/**
 * Setup Firebase Storage
 */
export async function setupFirebaseStorage(input: {
  projectId: string;
}): Promise<unknown> {
  return apiPost("/firebase/setup-storage", input);
}

/**
 * Setup Firebase Hosting
 */
export async function setupFirebaseHosting(input: {
  projectId: string;
  siteId?: string;
}): Promise<unknown> {
  return apiPost("/firebase/setup-hosting", input);
}

/**
 * List hosting sites for a Firebase project
 */
export async function listFirebaseHostingSites(
  firebaseProjectId: string
): Promise<
  Array<{ name: string; siteId: string; defaultUrl: string; appId?: string }>
> {
  return apiGet(`/firebase/sites/${encodeURIComponent(firebaseProjectId)}`);
}

/**
 * Deploy repository to Firebase Hosting
 */
export async function deployToFirebaseHosting(input: {
  projectId: string;
  repository: {
    owner: string;
    name: string;
    branch?: string;
    provider: "github" | "gitlab";
  };
  firebaseProjectId: string;
  siteId?: string;
}): Promise<{
  id: string;
  siteId: string;
  version: string;
  status: "pending" | "in_progress" | "success" | "failure";
  url?: string;
  createdAt: Date;
  completedAt?: Date;
  method: "native" | "api";
  repository?: {
    owner: string;
    name: string;
    branch: string;
    commit?: string;
    provider: "github" | "gitlab";
  };
}> {
  return apiPost("/firebase/deploy", input);
}

/**
 * Get deployment status
 */
export async function getFirebaseDeploymentStatus(
  deploymentId: string,
  firebaseProjectId: string,
  siteId: string
): Promise<{
  id: string;
  siteId: string;
  version: string;
  status: "pending" | "in_progress" | "success" | "failure";
  url?: string;
  createdAt: Date;
  completedAt?: Date;
  method: "native" | "api";
}> {
  return apiGet(
    `/firebase/deployments/${encodeURIComponent(deploymentId)}/status?firebaseProjectId=${encodeURIComponent(firebaseProjectId)}&siteId=${encodeURIComponent(siteId)}`
  );
}

/**
 * List custom domains for a Firebase Hosting site
 */
export async function listFirebaseDomains(
  siteId: string,
  projectId: string
): Promise<
  Array<{
    domain: string;
    status: string;
    updateTime?: string;
    provisioning?: {
      certStatus?: string;
      dnsStatus?: string;
    };
  }>
> {
  return apiGet(
    `/firebase/sites/${encodeURIComponent(siteId)}/domains?projectId=${encodeURIComponent(projectId)}`
  );
}

/**
 * Add a custom domain to a Firebase Hosting site
 */
export async function addFirebaseDomain(
  siteId: string,
  projectId: string,
  domain: string
): Promise<{
  domain: string;
  status: string;
  updateTime?: string;
  provisioning?: {
    certStatus?: string;
    dnsStatus?: string;
  };
}> {
  return apiPost(`/firebase/sites/${encodeURIComponent(siteId)}/domains`, {
    domain,
    projectId
  });
}

/**
 * Get DNS records required for a Firebase Hosting custom domain
 */
export async function getFirebaseDomainDNSRecords(
  siteId: string,
  projectId: string,
  domain: string
): Promise<
  Array<{
    domainName: string;
    type: string;
    rdata: string;
    requiredAction?: string;
  }>
> {
  return apiGet(
    `/firebase/sites/${encodeURIComponent(siteId)}/domains/${encodeURIComponent(domain)}/dns-records?projectId=${encodeURIComponent(projectId)}`
  );
}

/**
 * Get status of Firebase services for a project
 */
export interface FirebaseServiceStatus {
  firestore: boolean;
  storage: boolean;
  hosting: boolean;
  authentication: boolean;
  functions: boolean;
}

export async function getFirebaseServicesStatus(
  projectId: string
): Promise<FirebaseServiceStatus> {
  return apiGet<FirebaseServiceStatus>(
    `/firebase/projects/${encodeURIComponent(projectId)}/services`
  );
}
